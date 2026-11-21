import { animate, type MotionValue } from 'motion/react'

/**
 * Hand-rolled gravity toy. Two kinds of bodies:
 *  - cards: DragCards (motion-value offsets), floor = bottom of the viewport
 *  - stamps: stamped stickers (page-anchored, moved with a transform on a wrapper)
 * vy += 2200 * dt, restitution 0.55, friction 0.9, a body sleeps when |vy| < 30 on the floor.
 */
const G = 2200
const REST = 0.55
const FRICTION = 0.9
const SLEEP = 30
const MAX_BODIES = 40

export type CardBody = {
  id: string
  el: HTMLElement
  x: MotionValue<number>
  y: MotionValue<number>
  home: () => { x: number; y: number }
  vx: number
  vy: number
  awake: boolean
  dragging: boolean
  /** Document-space box captured when the body is woken; positions are then tracked from the motion values. */
  box: { left: number; top: number; w: number; h: number; x0: number; y0: number }
}
export type StampBody = {
  el: HTMLElement
  ox: number
  oy: number
  vx: number
  vy: number
  w: number
  h: number
  top: number
  awake: boolean
}

const cards = new Map<string, CardBody>()
const stamps = new Set<StampBody>()
let on = false
let raf = 0
let last = 0

function snapshot(b: CardBody) {
  const r = b.el.getBoundingClientRect()
  b.box = {
    left: r.left + scrollX,
    top: r.top + scrollY,
    w: r.width,
    h: r.height,
    x0: b.x.get(),
    y0: b.y.get(),
  }
  return r
}

export function registerCard(b: Omit<CardBody, 'vx' | 'vy' | 'awake' | 'dragging' | 'box'>) {
  const body: CardBody = {
    ...b,
    vx: 0,
    vy: 0,
    awake: false,
    dragging: false,
    box: { left: 0, top: 0, w: 0, h: 0, x0: 0, y0: 0 },
  }
  cards.set(b.id, body)
  return {
    body,
    release(vx: number, vy: number) {
      body.dragging = false
      if (on) {
        snapshot(body)
        body.vx = vx
        body.vy = vy
        body.awake = true
        kick()
      }
    },
    unregister() {
      cards.delete(b.id)
    },
  }
}

export function registerStamp(el: HTMLElement, top: number) {
  const r = el.getBoundingClientRect()
  const s: StampBody = { el, ox: 0, oy: 0, vx: 0, vy: 0, w: r.width, h: r.height, top, awake: on }
  stamps.add(s)
  if (on) kick()
  return () => {
    stamps.delete(s)
  }
}

export const isGravity = () => on

function inView(r: DOMRect) {
  return r.bottom > 0 && r.top < innerHeight
}

function wake() {
  let n = 0
  for (const b of cards.values()) {
    if (b.dragging || n >= MAX_BODIES) continue
    const r = snapshot(b)
    if (!inView(r) || r.bottom >= innerHeight - 2) continue
    b.x.stop()
    b.y.stop()
    b.vx = (Math.random() - 0.5) * 160
    b.vy = 0
    b.awake = true
    n++
  }
  for (const s of stamps) {
    s.awake = true
    s.vx = (Math.random() - 0.5) * 120
  }
}

export function wakeInView() {
  if (on) {
    wake()
    kick()
  }
}

export function setGravity(next: boolean) {
  if (next === on) return
  on = next
  if (on) {
    wake()
    kick()
  } else {
    cancelAnimationFrame(raf)
    raf = 0
    for (const b of cards.values()) {
      b.awake = false
      const h = b.home()
      animate(b.x, h.x, { type: 'spring', stiffness: 220, damping: 20 })
      animate(b.y, h.y, { type: 'spring', stiffness: 220, damping: 20 })
    }
    for (const s of stamps) {
      s.awake = false
      s.ox = s.oy = 0
      s.el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)'
      s.el.style.transform = 'translate3d(0,0,0)'
      const el = s.el
      setTimeout(() => (el.style.transition = ''), 520)
    }
  }
}

function kick() {
  if (raf || !on) return
  last = performance.now()
  raf = requestAnimationFrame(loop)
}

function loop(t: number) {
  raf = 0
  const dt = Math.min((t - last) / 1000, 1 / 30)
  last = t
  if (step(dt) && on) raf = requestAnimationFrame(loop)
}

function step(dt: number) {
  const vw = innerWidth
  const vh = innerHeight
  let moving = false

  for (const b of cards.values()) {
    if (!b.awake || b.dragging) continue
    // Viewport-space box derived from the motion values (never from the DOM: the DOM lags one frame).
    const left = b.box.left - scrollX + (b.x.get() - b.box.x0)
    const right = left + b.box.w
    const top = b.box.top - scrollY + (b.y.get() - b.box.y0)
    const bottom = top + b.box.h
    if (bottom < -400 || top > vh + 400) {
      b.awake = false
      continue
    }
    b.vy += G * dt
    let dx = b.vx * dt
    let dy = b.vy * dt
    if (left + dx < 0) {
      dx = -left
      b.vx = -b.vx * REST
    } else if (right + dx > vw) {
      dx = vw - right
      b.vx = -b.vx * REST
    }
    if (bottom + dy >= vh) {
      dy = vh - bottom
      b.vy = -b.vy * REST
      b.vx *= FRICTION
      if (Math.abs(b.vy) < SLEEP) {
        b.vy = 0
        b.vx = 0
        b.awake = false
      }
    }
    b.x.set(b.x.get() + dx)
    b.y.set(b.y.get() + dy)
    moving = true
  }

  const floor = scrollY + vh // page coordinates of the viewport bottom
  for (const s of stamps) {
    if (!s.awake) continue
    s.vy += G * dt
    let ox = s.ox + s.vx * dt
    let oy = s.oy + s.vy * dt
    const left = parseFloat(s.el.style.left || '0') + ox
    if (left < 0) {
      ox -= left
      s.vx = -s.vx * REST
    } else if (left + s.w > vw) {
      ox -= left + s.w - vw
      s.vx = -s.vx * REST
    }
    if (s.top + oy + s.h >= floor) {
      oy = floor - s.h - s.top
      s.vy = -s.vy * REST
      s.vx *= FRICTION
      if (Math.abs(s.vy) < SLEEP) {
        s.vy = 0
        s.vx = 0
        s.awake = false
      }
    }
    s.ox = ox
    s.oy = oy
    s.el.style.transform = `translate3d(${ox}px,${oy}px,0)`
    moving = true
  }
  return moving
}
