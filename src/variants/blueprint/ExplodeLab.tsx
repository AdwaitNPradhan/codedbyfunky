'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useBP } from './ctx'
import { clamp, hash } from './util'
import s from './sections.module.css'

/* An interactive exploded view built from a hardware project's real parts list.
 * Each part becomes a slab in a small hand-rolled 3D projection (yaw, pitch, zoom, explode).
 * Geometry is written to the DOM imperatively, so dragging never re-renders React. */

type Kind = 'pcb' | 'cell' | 'panel' | 'motor' | 'chip' | 'block' | 'shell'
type Plate = { name: string; kind: Kind; w: number; d: number; t: number; n: number | null }
type St = { yaw: number; pitch: number; zoom: number; ex: number }

const VW = 640
const VH = 440
const CX = 270
const CY = 232
const BADGE_X = 598
const D2R = Math.PI / 180

const kindOf = (name: string): Kind => {
  const n = name.toLowerCase()
  if (/pcb|board|esp|rp2040|arduino|nano|nrf|stm|pico|mcu|teensy|module/.test(n)) return 'pcb'
  if (/battery|cell|tp4056|lipo|li-?ion|charger/.test(n)) return 'cell'
  if (/panel|solar|display|oled|lcd|screen|led/.test(n)) return 'panel'
  if (/servo|motor|nema|stepper|a4988|driver/.test(n)) return 'motor'
  if (/sensor|bme|mpu|gps|lora|sx1|u-?blox|radio|cam|encoder|kailh|switch/.test(n)) return 'chip'
  return 'block'
}

function makePlates(parts: string[]): Plate[] {
  const body: Plate[] = parts.slice(0, 8).map((name, i) => {
    const k = kindOf(name)
    const r = hash(name)
    const dims: Record<Kind, [number, number, number]> = {
      pcb: [150 + r * 34, 100 + r * 22, 5],
      cell: [112 + r * 20, 62 + r * 10, 16],
      panel: [140 + r * 24, 96 + r * 12, 6],
      motor: [66 + r * 10, 66 + r * 10, 38],
      chip: [58 + r * 14, 58 + r * 14, 10],
      block: [84 + r * 30, 70 + r * 14, 18],
      shell: [0, 0, 0],
    }
    const [w, d, t] = dims[k]
    return { name, kind: k, w: w * 1.3, d: d * 1.3, t: t * 1.2, n: i + 1 }
  })
  const shell = (name: string): Plate => ({ name, kind: 'shell', w: 250, d: 172, t: 7, n: null })
  return [shell('Enclosure base'), ...body, shell('Enclosure top')]
}

// Normalised detail strokes on a plate's top face: polylines in [0,1]x[0,1].
const DETAIL: Record<Kind, number[][][]> = {
  pcb: [
    [[0.06, 0.12], [0.06, 0.88], [0.94, 0.88], [0.94, 0.12], [0.06, 0.12]],
    [[0.14, 0.3], [0.4, 0.3], [0.5, 0.42], [0.5, 0.74], [0.78, 0.74]],
    [[0.14, 0.58], [0.3, 0.58], [0.38, 0.66], [0.38, 0.8]],
    [[0.56, 0.22], [0.84, 0.22], [0.9, 0.3], [0.9, 0.5]],
    [[0.18, 0.4], [0.34, 0.4], [0.34, 0.56], [0.18, 0.56], [0.18, 0.4]],
    [[0.62, 0.4], [0.78, 0.4], [0.78, 0.6], [0.62, 0.6], [0.62, 0.4]],
  ],
  cell: [
    [[0.06, 0.1], [0.94, 0.1], [0.94, 0.9], [0.06, 0.9], [0.06, 0.1]],
    [[0.36, 0.1], [0.36, 0.9]],
    [[0.66, 0.1], [0.66, 0.9]],
    [[0.94, 0.38], [1, 0.38], [1, 0.62], [0.94, 0.62]],
  ],
  panel: [
    [[0.05, 0.08], [0.95, 0.08], [0.95, 0.92], [0.05, 0.92], [0.05, 0.08]],
    [[0.275, 0.08], [0.275, 0.92]],
    [[0.5, 0.08], [0.5, 0.92]],
    [[0.725, 0.08], [0.725, 0.92]],
    [[0.05, 0.36], [0.95, 0.36]],
    [[0.05, 0.64], [0.95, 0.64]],
  ],
  motor: [
    [[0.14, 0.14], [0.86, 0.14], [0.86, 0.86], [0.14, 0.86], [0.14, 0.14]],
    [[0.38, 0.38], [0.62, 0.38], [0.62, 0.62], [0.38, 0.62], [0.38, 0.38]],
    [[0.5, 0.14], [0.5, 0.86]],
    [[0.14, 0.5], [0.86, 0.5]],
  ],
  chip: [
    [[0.18, 0.18], [0.82, 0.18], [0.82, 0.82], [0.18, 0.82], [0.18, 0.18]],
    [[0.18, 0.34], [0.06, 0.34]],
    [[0.18, 0.5], [0.06, 0.5]],
    [[0.18, 0.66], [0.06, 0.66]],
    [[0.82, 0.34], [0.94, 0.34]],
    [[0.82, 0.5], [0.94, 0.5]],
    [[0.82, 0.66], [0.94, 0.66]],
  ],
  block: [
    [[0.12, 0.14], [0.88, 0.14], [0.88, 0.86], [0.12, 0.86], [0.12, 0.14]],
    [[0.12, 0.14], [0.88, 0.86]],
    [[0.88, 0.14], [0.12, 0.86]],
  ],
  shell: [],
}

type Out = { sides: string[]; top: string; det: string; leader: string; bx: number; by: number; z: number }

/** Project every plate for one state. Pure: used for the first (SSR) render and every frame. */
function compute(plates: Plate[], st: St, fit: number): Out[] {
  const yaw = st.yaw * D2R
  const pitch = st.pitch * D2R
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const scale = fit * st.zoom
  const gap = 5 + st.ex * 52
  const total = plates.reduce((a, p) => a + p.t + gap, 0) - gap
  const P = (x: number, y: number, z: number): [number, number] => {
    const xr = x * cy + z * sy
    const zr = -x * sy + z * cy
    const yy = y - total / 2
    return [CX + xr * scale, CY - (yy * cp - zr * sp) * scale]
  }
  const depthOf = (nx: number, ny: number, nz: number) => ny * sp + (-nx * sy + nz * cy) * cp
  const f = (n: number) => n.toFixed(1)
  const poly = (pts: [number, number][]) => `M${pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L')}Z`

  let bottom = 0
  return plates.map((p) => {
    const y0 = bottom
    const y1 = y0 + p.t
    bottom = y1 + gap
    const hw = p.w / 2
    const hd = p.d / 2
    const faces: [number, number, number, [number, number, number][]][] = [
      [1, 0, 0, [[hw, y0, -hd], [hw, y0, hd], [hw, y1, hd], [hw, y1, -hd]]],
      [-1, 0, 0, [[-hw, y0, hd], [-hw, y0, -hd], [-hw, y1, -hd], [-hw, y1, hd]]],
      [0, 0, 1, [[hw, y0, hd], [-hw, y0, hd], [-hw, y1, hd], [hw, y1, hd]]],
      [0, 0, -1, [[-hw, y0, -hd], [hw, y0, -hd], [hw, y1, -hd], [-hw, y1, -hd]]],
    ]
    const sides = faces.map(([nx, ny, nz, v]) => (depthOf(nx, ny, nz) > 0.001 ? poly(v.map((q) => P(q[0], q[1], q[2]))) : ''))
    const topPts = [P(-hw, y1, -hd), P(hw, y1, -hd), P(hw, y1, hd), P(-hw, y1, hd)]
    const top = poly(topPts)
    const det = DETAIL[p.kind]
      .map((line) => `M${line.map(([u, v]) => { const q = P((u - 0.5) * p.w, y1, (v - 0.5) * p.d); return `${f(q[0])} ${f(q[1])}` }).join('L')}`)
      .join('')
    // leader leaves the right-most vertex of the top face
    const right = topPts.reduce((a, q) => (q[0] > a[0] ? q : a), topPts[0])
    const by = right[1]
    const bx = BADGE_X
    const leader = `M${f(right[0])} ${f(right[1])}H${f(Math.max(right[0] + 6, bx - 16))}`
    return { sides, top, det, leader, bx, by, z: y0 }
  })
}

const REST: St = { yaw: -34, pitch: 30, zoom: 1, ex: 0.55 }

export function ExplodeLab({ title, parts, planned }: { title: string; parts: string[]; planned: boolean }) {
  const { reduced } = useBP()
  const plates = useMemo(() => makePlates(parts), [parts])
  // size the stack so it still fits when the slider is pushed to ~80%
  const fit = useMemo(() => {
    const t = plates.reduce((a, p) => a + p.t, 0)
    return clamp(420 / ((t + (plates.length - 1) * 47) * 0.87 + 105), 0.5, 1.6)
  }, [plates])

  const root = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const readout = useRef<HTMLOutputElement>(null)
  const cur = useRef<St>({ ...REST })
  const tgt = useRef<St>({ ...REST })
  const active = useRef<number | null>(null)
  const raf = useRef(0)
  const els = useRef<
    { g: SVGGElement; sides: SVGPathElement[]; top: SVGPathElement; det: SVGPathElement; leader: SVGPathElement; badge: SVGGElement }[]
  >([])

  const initial = useMemo(() => compute(plates, REST, fit), [plates, fit])

  const draw = useCallback(() => {
    const out = compute(plates, cur.current, fit)
    const showBadges = cur.current.ex > 0.22
    out.forEach((o, i) => {
      const e = els.current[i]
      if (!e) return
      e.sides.forEach((p, k) => p.setAttribute('d', o.sides[k]))
      e.top.setAttribute('d', o.top)
      e.det.setAttribute('d', o.det)
      const numbered = plates[i].n !== null
      const on = numbered && (showBadges || active.current === i)
      e.leader.setAttribute('d', on ? o.leader : '')
      e.badge.setAttribute('transform', `translate(${o.bx} ${o.by})`)
      e.badge.style.opacity = on ? '1' : '0'
    })
  }, [plates, fit])

  const tick = useCallback(() => {
    raf.current = 0
    const c = cur.current
    const t = tgt.current
    let moving = false
    ;(['yaw', 'pitch', 'zoom', 'ex'] as const).forEach((k) => {
      const d = t[k] - c[k]
      const eps = k === 'zoom' || k === 'ex' ? 0.002 : 0.05
      if (Math.abs(d) > eps) {
        c[k] += d * 0.2
        moving = true
      } else c[k] = t[k]
    })
    draw()
    if (moving) raf.current = requestAnimationFrame(tick)
  }, [draw])

  const go = useCallback(
    (patch: Partial<St>) => {
      Object.assign(tgt.current, patch)
      tgt.current.pitch = clamp(tgt.current.pitch, 8, 72)
      tgt.current.zoom = clamp(tgt.current.zoom, 0.6, 2.4)
      tgt.current.ex = clamp(tgt.current.ex, 0, 1)
      if (reduced) Object.assign(cur.current, tgt.current)
      if (slider.current) slider.current.value = String(Math.round(tgt.current.ex * 100))
      if (readout.current) readout.current.textContent = `${Math.round(tgt.current.ex * 100)}%`
      if (!raf.current) raf.current = requestAnimationFrame(tick)
    },
    [reduced, tick],
  )

  // cache DOM refs once per plate set
  useEffect(() => {
    const g = svg.current
    if (!g) return
    els.current = plates.map((_, i) => {
      const grp = g.querySelector<SVGGElement>(`[data-plate="${i}"]`)!
      return {
        g: grp,
        sides: Array.from(grp.querySelectorAll<SVGPathElement>('[data-side]')),
        top: grp.querySelector<SVGPathElement>('[data-top]')!,
        det: grp.querySelector<SVGPathElement>('[data-det]')!,
        leader: grp.querySelector<SVGPathElement>('[data-leader]')!,
        badge: grp.querySelector<SVGGElement>('[data-badge]')!,
      }
    })
    draw()
    return () => cancelAnimationFrame(raf.current)
  }, [plates, draw])

  // first time in view: the parts fly apart
  useEffect(() => {
    const el = root.current
    if (!el || reduced !== false) return
    cur.current.ex = 0.04
    draw()
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          go({ ex: REST.ex })
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced, go, draw])

  // pointer: drag to rotate, pinch to zoom; wheel zooms only with a modifier so the page still scrolls
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const ptrs = new Map<number, { x: number; y: number }>()
    let pinch = 0
    let zoom0 = 1
    const down = (e: PointerEvent) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture(e.pointerId)
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
        zoom0 = tgt.current.zoom
      }
      el.dataset.drag = '1'
    }
    const move = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch) go({ zoom: zoom0 * (dist / pinch) })
      } else {
        // yaw follows horizontal drag everywhere; tilt only for mouse/pen so touch can still scroll vertically
        go({ yaw: tgt.current.yaw + dx * 0.55, ...(e.pointerType === 'touch' ? {} : { pitch: tgt.current.pitch + dy * 0.35 }) })
      }
    }
    const up = (e: PointerEvent) => {
      ptrs.delete(e.pointerId)
      if (!ptrs.size) delete el.dataset.drag
    }
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return
      e.preventDefault()
      go({ zoom: tgt.current.zoom * Math.exp(-e.deltaY * 0.0022) })
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [go])

  const setActive = (i: number | null) => {
    active.current = i
    svg.current?.querySelectorAll('[data-plate]').forEach((g, k) => {
      if (i === k) g.setAttribute('data-active', 'true')
      else g.removeAttribute('data-active')
    })
    root.current?.querySelectorAll('[data-callout]').forEach((li) => {
      if (i !== null && Number((li as HTMLElement).dataset.callout) === i) li.setAttribute('data-active', 'true')
      else li.removeAttribute('data-active')
    })
    draw()
  }

  const onKey = (e: React.KeyboardEvent) => {
    const t = tgt.current
    if (e.key === 'ArrowLeft') go({ yaw: t.yaw - 12 })
    else if (e.key === 'ArrowRight') go({ yaw: t.yaw + 12 })
    else if (e.key === 'ArrowUp') go({ pitch: t.pitch + 6 })
    else if (e.key === 'ArrowDown') go({ pitch: t.pitch - 6 })
    else if (e.key === '+' || e.key === '=') go({ zoom: t.zoom * 1.2 })
    else if (e.key === '-') go({ zoom: t.zoom / 1.2 })
    else if (e.key === '0') go({ ...REST })
    else return
    e.preventDefault()
  }

  return (
    <div ref={root} className={s.lab} data-planned={planned ? '1' : undefined}>
      <svg
        ref={svg}
        className={s.labSvg}
        viewBox={`0 0 ${VW} ${VH}`}
        role="group"
        tabIndex={0}
        aria-label={`Exploded view of ${title}. Drag to rotate, arrow keys rotate and tilt, plus and minus zoom, zero resets.`}
        onKeyDown={onKey}
        onDoubleClick={() => go({ ...REST })}
        data-dim
      >
        {plates.map((p, i) => (
          <g
            key={`${p.name}-${i}`}
            data-plate={i}
            data-kind={p.kind}
            className={s.lplate}
            onPointerEnter={() => p.n !== null && setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            {[0, 1, 2, 3].map((k) => (
              <path key={k} data-side className={s.plateSide} d={initial[i].sides[k]} />
            ))}
            <path data-top className={s.plateTop} d={initial[i].top} />
            <path data-det className={s.plateDet} d={initial[i].det} />
            <path data-leader className={s.plateLeader} d={p.n !== null ? initial[i].leader : ''} />
            <g data-badge className={s.plateBadge} transform={`translate(${initial[i].bx} ${initial[i].by})`}>
              {p.n !== null && (
                <>
                  <circle r="13" />
                  <text textAnchor="middle" dominantBaseline="central">
                    {p.n}
                  </text>
                </>
              )}
            </g>
          </g>
        ))}
      </svg>
      <div className={s.labBar}>
        <label className={s.labExplode}>
          <span>EXPLODE</span>
          <input
            ref={slider}
            type="range"
            min={0}
            max={100}
            defaultValue={Math.round(REST.ex * 100)}
            onInput={(e) => go({ ex: Number((e.target as HTMLInputElement).value) / 100 })}
          />
          <output ref={readout}>{Math.round(REST.ex * 100)}%</output>
        </label>
        <div className={s.labBtns} role="group" aria-label="View controls">
          <button type="button" onClick={() => go({ yaw: tgt.current.yaw - 24 })} aria-label="Rotate left">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M10 3L5 8L10 13" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button type="button" onClick={() => go({ yaw: tgt.current.yaw + 24 })} aria-label="Rotate right">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M6 3L11 8L6 13" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button type="button" onClick={() => go({ zoom: tgt.current.zoom / 1.25 })} aria-label="Zoom out">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 8H13" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button type="button" onClick={() => go({ zoom: tgt.current.zoom * 1.25 })} aria-label="Zoom in">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 8H13M8 3V13" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button type="button" onClick={() => go({ ...REST })}>
            RESET
          </button>
        </div>
      </div>
      <p className={s.labHint}>DRAG TO ROTATE · PINCH OR SHIFT+SCROLL TO ZOOM</p>
      <ol className={s.callouts} aria-label={`Parts of ${title}`}>
        {plates
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => p.n !== null)
          .map(({ p, i }) => (
            <li key={`${p.name}-${i}`} data-callout={i}>
              <button
                type="button"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <span className={s.badgeNo} aria-hidden="true">
                  {p.n}
                </span>
                {p.name}
              </button>
            </li>
          ))}
      </ol>
    </div>
  )
}
