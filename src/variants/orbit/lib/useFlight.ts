'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { N_STATIONS, STATIONS, type Counts } from './config'
import { loadMotion, type Motion } from './motion'
import type { ItemKind, Store } from './store'
import { clamp, easeInOut4, lerp, smoothstep } from './util'
import type { Route } from './world'

export type FlightApi = {
  toStation: (i: number, opts?: { immediate?: boolean }) => void
  toItem: (kind: ItemKind, i: number) => void
  lockScroll: (on: boolean) => void
  playHero: () => void
  refresh: () => void
}

type Args = {
  enabled: boolean
  rootRef: RefObject<HTMLDivElement | null>
  store: Store
  route: Route
  counts: Counts
  mobile: boolean
  heroGo: boolean
  onStation: (i: number) => void
  onIdx: (kind: ItemKind, i: number) => void
}

type PanelM = {
  el: HTMLElement
  station: number
  a: number
  b: number
  inA: number
  inB: number
  outA: number
  outB: number
  o: number
  inO: number
  outO: number
  shown: boolean
  title: { lines: Element[] } | null
  rises: HTMLElement[]
}

type StM = { start: number; end: number; len: number }

const ITEM_STATIONS: { kind: ItemKind; station: number; key: keyof Counts }[] = [
  { kind: 'project', station: 1, key: 'projects' },
  { kind: 'photo', station: 2, key: 'photos' },
  { kind: 'game', station: 3, key: 'games' },
  { kind: 'hw', station: 4, key: 'hardware' },
]

/** SplitText line masks clip at the line box; give ascenders/descenders room without moving the layout. */
function padMasks(masks: Element[] | undefined) {
  masks?.forEach((m) => {
    const el = m as HTMLElement
    el.style.paddingBlock = '0.14em'
    el.style.marginBlock = '-0.14em'
  })
}

const smoother = (k: number) => k * k * k * (k * (6 * k - 15) + 10)

/**
 * Lenis (smooth scroll) + ScrollTrigger (measure/refresh) + GSAP (reveals).
 * Writes scroll state into `store` (a plain object); never calls setState per scroll tick.
 */
export function useFlight(args: Args) {
  const apiRef = useRef<FlightApi | null>(null)
  const argsRef = useRef(args)
  argsRef.current = args
  const { enabled, mobile } = args
  const countsKey = `${args.counts.projects}-${args.counts.photos}-${args.counts.games}-${args.counts.hardware}`

  useEffect(() => {
    if (!enabled) return
    let dead = false
    let teardown: (() => void) | null = null
    loadMotion().then((m) => {
      if (dead || !argsRef.current.rootRef.current) return
      teardown = setup(m, argsRef, apiRef)
    })
    return () => {
      dead = true
      teardown?.()
      apiRef.current = null
    }
  }, [enabled, mobile, countsKey])

  // hero reveal waits for the veil
  useEffect(() => {
    if (args.heroGo) apiRef.current?.playHero()
  }, [args.heroGo])

  return apiRef
}

function setup(m: Motion, argsRef: RefObject<Args>, apiRef: RefObject<FlightApi | null>) {
  const { gsap, ScrollTrigger, SplitText, Lenis } = m
  const root = argsRef.current.rootRef.current!
  const { store, route, counts } = argsRef.current
  const html = document.documentElement
  // read before the first update() rewrites the hash for the station we start on
  const initialHash = location.hash.replace('#', '')

  const lenis = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.95,
  })
  lenis.on('scroll', ScrollTrigger.update)
  let lastNow = performance.now()
  let lastS = lenis.scroll
  const tick = (t: number) => {
    lenis.raf(t * 1000)
    const now = performance.now()
    const dt = Math.max(0.001, (now - lastNow) / 1000)
    lastNow = now
    const s = lenis.scroll
    store.vel += ((s - lastS) / dt - store.vel) * Math.min(1, dt * 12)
    lastS = s
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  let V = window.innerHeight
  let sections: HTMLElement[] = []
  let stM: StM[] = []
  let panels: PanelM[] = []
  let heroPlayed = false
  let lastStation = -1
  const ctx = gsap.context(() => {}, root)

  // ---- DOM discovery ----
  sections = Array.from(root.querySelectorAll<HTMLElement>('section[data-station]')).sort(
    (a, b) => Number(a.dataset.station) - Number(b.dataset.station),
  )
  panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]')).map((el) => {
    const station = Number(el.dataset.st)
    return {
      el,
      station,
      a: Number(el.dataset.a ?? 0),
      b: Number(el.dataset.b ?? 1),
      inA: 0,
      inB: 0,
      outA: 0,
      outB: 0,
      o: -1,
      inO: 0,
      outO: 0,
      shown: false,
      title: null,
      rises: Array.from(el.querySelectorAll<HTMLElement>('[data-rise]')),
    }
  })

  ctx.add(() => {
    for (const p of panels) {
      const t = p.el.querySelector<HTMLElement>('[data-title]')
      if (t) {
        const holder = { lines: [] as Element[] }
        SplitText.create(t, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => {
            holder.lines = self.lines
            padMasks(self.masks)
            gsap.set(self.lines, { yPercent: p.shown ? 0 : 110 })
          },
        })
        p.title = holder
      }
      if (p.rises.length) gsap.set(p.rises, { opacity: 0, y: 18 })
    }
    // hero stays visible until the intro plays (so a slow chunk never flashes content then hides it)
    const hero = root.querySelectorAll('[data-hero]')
    if (!argsRef.current.heroGo && hero.length) gsap.set(hero, { opacity: 0 })
  })

  function measure() {
    const stick = root.querySelector<HTMLElement>('[data-stick]')
    V = stick ? stick.getBoundingClientRect().height || window.innerHeight : window.innerHeight
    const y = window.scrollY
    stM = sections.map((el) => {
      const top = el.getBoundingClientRect().top + y
      const h = el.offsetHeight
      return { start: top, end: top + h - V, len: Math.max(1, h - V) }
    })
    const f = 0.42 * V
    const g = 0.1 * V
    for (const p of panels) {
      const sm = stM[p.station]
      if (!sm) continue
      const A = sm.start + p.a * sm.len
      const B = sm.start + p.b * sm.len
      if (p.a <= 0) {
        p.inA = A - f
        p.inB = A
      } else {
        p.inA = A - g
        p.inB = A + g
      }
      if (p.b >= 1) {
        p.outA = B
        p.outB = B + f
      } else {
        p.outA = B - g
        p.outB = B + g
      }
      p.o = -1
    }
    update(true)
  }

  function camU(s: number) {
    for (let i = 0; i < N_STATIONS; i++) {
      const sm = stM[i]
      const r = route.st[i]
      if (!sm || !r) continue
      if (s <= sm.end) {
        if (s >= sm.start) return lerp(r.uDwell, r.uEnd, (s - sm.start) / sm.len)
        if (i === 0) return r.uDwell
        const prev = stM[i - 1]
        const k = clamp((s - prev.end) / (sm.start - prev.end))
        return lerp(route.st[i - 1].uEnd, r.uDwell, smoother(k))
      }
    }
    return route.st[N_STATIONS - 1].uEnd
  }

  function showPanel(p: PanelM) {
    p.shown = true
    if (p.title)
      gsap.to(p.title.lines, {
        yPercent: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'expo.out',
        overwrite: true,
      })
    if (p.rises.length)
      gsap.to(p.rises, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.06,
        delay: 0.1,
        ease: 'power3.out',
        overwrite: true,
      })
  }
  function hidePanel(p: PanelM) {
    p.shown = false
    if (p.title) gsap.set(p.title.lines, { yPercent: 110 })
    if (p.rises.length) gsap.set(p.rises, { opacity: 0, y: 18 })
  }

  function update(force = false) {
    if (!stM.length) return
    const s = lenis.scroll
    store.s = s
    store.u = camU(s)

    // active station: split at the midpoint of each travel gap
    let st = N_STATIONS - 1
    for (let i = 0; i < N_STATIONS - 1; i++) {
      if (s < (stM[i].end + stM[i + 1].start) / 2) {
        st = i
        break
      }
    }
    for (let i = 0; i < N_STATIONS; i++) store.local[i] = clamp((s - stM[i].start) / stM[i].len)
    const m0 = stM[st]
    if (s >= m0.start || st === 0) store.pos = st + (store.local[st] - 0.5) * 0.3
    else {
      const prev = stM[st - 1]
      store.pos = lerp(st - 1 + 0.15, st - 0.15, clamp((s - prev.end) / (m0.start - prev.end)))
    }
    store.reach = Math.max(store.reach, Math.min(N_STATIONS - 1, Math.round(store.pos + 0.6)))

    if (st !== lastStation) {
      lastStation = st
      store.station = st
      argsRef.current.onStation(st)
      const hash = st === 0 ? location.pathname + location.search : '#' + STATIONS[st].id
      if (!location.hash.startsWith('#project-') && !location.hash.startsWith('#photo-')) {
        try {
          history.replaceState(history.state, '', hash)
        } catch {
          /* sandboxed iframe */
        }
      }
    }

    for (const it of ITEM_STATIONS) {
      const n = counts[it.key]
      const i = n > 1 ? Math.round(store.local[it.station] * (n - 1)) : 0
      if (store.idx[it.kind] !== i) {
        store.idx[it.kind] = i
        argsRef.current.onIdx(it.kind, i)
      }
    }

    for (const p of panels) {
      const inO = smoothstep(p.inA, p.inB, s)
      const outO = 1 - smoothstep(p.outA, p.outB, s)
      const o = Math.min(inO, outO)
      if (!force && Math.abs(o - p.o) < 0.003 && p.inO === inO) continue
      p.o = o
      p.inO = inO
      p.outO = outO
      const el = p.el
      el.style.opacity = o.toFixed(3)
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
      el.style.transform = `translate3d(0, ${((1 - inO) * 26 - (1 - outO) * 18).toFixed(1)}px, 0)`
      el.dataset.live = o > 0.55 ? '1' : '0'
      if (o > 0.3 && !p.shown) showPanel(p)
      else if (o < 0.01 && p.shown) hidePanel(p)
    }
  }

  const st = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: () => update(),
    onRefresh: () => measure(),
  })

  const onMove = (e: PointerEvent) => {
    store.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    store.mouse.y = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  const onVis = () => (document.hidden ? lenis.stop() : lenis.start())
  // keep scrolling usable when a modal locked it
  let locked = false
  const visHandler = () => {
    if (!locked) onVis()
  }
  document.addEventListener('visibilitychange', visHandler)

  const scrollTo = (
    y: number,
    opts: { immediate?: boolean; duration?: number; easing?: (t: number) => number } = {},
  ) => {
    if (locked) return
    lenis.scrollTo(y, {
      immediate: opts.immediate,
      duration: opts.duration ?? 2.2,
      easing: opts.easing ?? easeInOut4,
      lock: true,
      force: true,
    })
  }

  const api: FlightApi = {
    toStation(i, opts) {
      const sm = stM[i]
      if (!sm) return
      scrollTo(i === 0 ? 0 : sm.start + 1, { immediate: opts?.immediate })
    },
    toItem(kind, i) {
      const it = ITEM_STATIONS.find((x) => x.kind === kind)
      if (!it) return
      const sm = stM[it.station]
      const n = counts[it.key]
      const q = n > 1 ? i / (n - 1) : 0
      scrollTo(sm.start + q * sm.len + 1, { duration: 1.3, easing: (t) => 1 - (1 - t) ** 4 })
    },
    lockScroll(on) {
      locked = on
      if (on) {
        lenis.stop()
        html.style.overflow = 'hidden'
      } else {
        html.style.overflow = ''
        lenis.start()
      }
    },
    playHero() {
      if (heroPlayed) return
      heroPlayed = true
      const h1 = root.querySelector<HTMLElement>('[data-hero-title]')
      const rest = root.querySelectorAll<HTMLElement>('[data-hero-rise]')
      gsap.set(root.querySelectorAll('[data-hero]'), { opacity: 1 })
      ctx.add(() => {
        if (h1) {
          const split = SplitText.create(h1, { type: 'lines,chars', mask: 'lines' })
          padMasks(split.masks)
          gsap.from(split.chars, {
            yPercent: 115,
            duration: 0.9,
            stagger: { amount: 0.7 },
            ease: 'expo.out',
          })
        }
        gsap.fromTo(
          rest,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.5, stagger: 0.08, ease: 'power3.out' },
        )
      })
    },
    refresh: () => ScrollTrigger.refresh(),
  }
  apiRef.current = api

  measure()
  void document.fonts?.ready.then(() => ScrollTrigger.refresh())
  // deep link on first load, and manual hash edits afterwards
  const stationOf = (h: string) =>
    h && !h.startsWith('project-') && !h.startsWith('photo-')
      ? STATIONS.findIndex((s) => s.id === h || s.alias === h)
      : -1
  const first = stationOf(initialHash)
  if (first > 0)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => api.toStation(first, { immediate: true })),
    )
  const onHash = () => {
    const i = stationOf(location.hash.replace('#', ''))
    if (i >= 0) api.toStation(i)
  }
  window.addEventListener('hashchange', onHash)
  if (argsRef.current.heroGo) api.playHero()

  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('hashchange', onHash)
    document.removeEventListener('visibilitychange', visHandler)
    gsap.ticker.remove(tick)
    gsap.ticker.lagSmoothing(500, 33)
    st.kill()
    lenis.destroy()
    ctx.revert()
    html.style.overflow = ''
    for (const p of panels) {
      p.el.style.opacity = ''
      p.el.style.visibility = ''
      p.el.style.transform = ''
      delete p.el.dataset.live
      for (const r of p.rises) {
        r.style.opacity = ''
        r.style.transform = ''
      }
    }
    root.querySelectorAll<HTMLElement>('[data-hero]').forEach((e) => (e.style.opacity = ''))
    root.querySelectorAll<HTMLElement>('[data-hero-rise]').forEach((e) => {
      e.style.opacity = ''
      e.style.transform = ''
    })
  }
}
