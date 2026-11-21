'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useBP } from './ctx'
import { MM, fmtMM } from './util'
import b from './base.module.css'

const ARROW = 8

/**
 * Inspect cursor (fine pointers only): crosshair + live position in mm, closes to a dot over
 * links, hides over fields. Hovering a `[data-dim]` element draws dimension lines to its edges.
 * Also owns the ruler markers shown in GRID mode. All DOM writes are imperative (no re-render).
 */
export function Cursor({
  rootRef,
  measure,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  measure: boolean
}) {
  const { reduced } = useBP()
  const cross = useRef<HTMLDivElement>(null)
  const read = useRef<HTMLDivElement>(null)
  const dims = useRef<SVGSVGElement>(null)
  const pH = useRef<SVGPathElement>(null)
  const tH = useRef<SVGTextElement>(null)
  const pV = useRef<SVGPathElement>(null)
  const tV = useRef<SVGTextElement>(null)
  const mkX = useRef<HTMLElement>(null)
  const mkY = useRef<HTMLElement>(null)
  const measureRef = useRef(measure)
  measureRef.current = measure

  useEffect(() => {
    const root = rootRef.current
    if (reduced !== false || !root) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let x = -100
    let y = -100
    let raf = 0
    let dimEl: Element | null = null
    let shown = false

    const drawDims = (el: Element) => {
      const r = el.getBoundingClientRect()
      const off = 14
      const hy = r.top - off >= 72 ? r.top - off : r.bottom + off
      const above = hy < r.top
      const vx = r.left - off >= 40 ? r.left - off : r.right + off
      const left = vx < r.left
      const ey = above ? r.top : r.bottom
      const ex = left ? r.left : r.right
      pH.current?.setAttribute(
        'd',
        `M${r.left} ${hy}H${r.right}` +
          `M${r.left} ${hy}l${ARROW} -3M${r.left} ${hy}l${ARROW} 3` +
          `M${r.right} ${hy}l${-ARROW} -3M${r.right} ${hy}l${-ARROW} 3` +
          `M${r.left} ${ey}V${hy + (above ? -5 : 5)}M${r.right} ${ey}V${hy + (above ? -5 : 5)}`,
      )
      pV.current?.setAttribute(
        'd',
        `M${vx} ${r.top}V${r.bottom}` +
          `M${vx} ${r.top}l-3 ${ARROW}M${vx} ${r.top}l3 ${ARROW}` +
          `M${vx} ${r.bottom}l-3 ${-ARROW}M${vx} ${r.bottom}l3 ${-ARROW}` +
          `M${ex} ${r.top}H${vx + (left ? -5 : 5)}M${ex} ${r.bottom}H${vx + (left ? -5 : 5)}`,
      )
      const th = tH.current
      if (th) {
        th.setAttribute('x', String((r.left + r.right) / 2))
        th.setAttribute('y', String(hy + (above ? -7 : 16)))
        th.textContent = `${fmtMM(r.width)} MM`
      }
      const tv = tV.current
      if (tv) {
        const cx = vx + (left ? -7 : 16)
        const cy = (r.top + r.bottom) / 2
        tv.setAttribute('transform', `translate(${cx} ${cy}) rotate(-90)`)
        tv.textContent = `${fmtMM(r.height)} MM`
      }
    }

    const apply = () => {
      raf = 0
      const c = cross.current
      const rd = read.current
      if (!c || !rd) return
      c.style.transform = `translate3d(${x}px,${y}px,0)`
      const flipX = x > window.innerWidth - 180
      const flipY = y > window.innerHeight - 50
      rd.style.transform = `translate3d(${flipX ? x - 18 : x + 18}px,${flipY ? y - 18 : y + 18}px,0)`
      rd.dataset.flip = flipX ? 'l' : 'r'
      const px = (x + window.scrollX) / MM
      const py = (y + window.scrollY) / MM
      rd.textContent = `X ${px.toFixed(1)}  Y ${py.toFixed(1)}`
      if (mkX.current) {
        mkX.current.style.transform = `translateX(${x}px)`
        mkX.current.dataset.v = px.toFixed(0)
      }
      if (mkY.current) {
        mkY.current.style.transform = `translateY(${y}px)`
        mkY.current.dataset.v = py.toFixed(0)
      }
      if (dimEl && dimEl.isConnected) drawDims(dimEl)
      else if (dims.current) dims.current.dataset.on = '0'
    }
    const sched = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }

    const setMode = (m: 'cross' | 'dot' | 'hide') => {
      if (cross.current) cross.current.dataset.mode = m
      if (read.current) read.current.dataset.hide = m === 'hide' ? '1' : '0'
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (!shown) {
        shown = true
        root.dataset.cursor = 'on'
      }
      x = e.clientX
      y = e.clientY
      sched()
    }
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const t = e.target as Element | null
      if (!t || !t.closest) return
      const typing = t.closest('input,textarea,select,[contenteditable="true"]')
      const link = t.closest('a,button,summary,label,[role="button"],[data-cursor="dot"]')
      setMode(typing ? 'hide' : link ? 'dot' : 'cross')
      dimEl = typing || measureRef.current ? null : t.closest('[data-dim]')
      if (dims.current) dims.current.dataset.on = dimEl ? '1' : '0'
      sched()
    }
    const onLeave = () => setMode('hide')
    const onEnter = () => setMode('cross')

    setMode('cross')
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('scroll', sched, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    document.documentElement.addEventListener('mouseenter', onEnter)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      window.removeEventListener('scroll', sched)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.removeEventListener('mouseenter', onEnter)
      cancelAnimationFrame(raf)
      delete root.dataset.cursor
    }
  }, [reduced, rootRef])

  return (
    <>
      <div ref={cross} className={b.cross} data-mode="hide" aria-hidden="true">
        <i className={b.crossH} />
        <i className={b.crossV} />
        <i className={b.crossDot} />
      </div>
      <div ref={read} className={b.readout} aria-hidden="true" data-hide="1" />
      <svg ref={dims} className={b.dims} data-on="0" aria-hidden="true">
        <path ref={pH} />
        <text ref={tH} textAnchor="middle" />
        <path ref={pV} />
        <text ref={tV} textAnchor="middle" />
      </svg>
      <div className={b.rulerT} aria-hidden="true">
        <i ref={mkX} className={b.rulerMark} />
      </div>
      <div className={b.rulerL} aria-hidden="true">
        <i ref={mkY} className={b.rulerMark} />
      </div>
    </>
  )
}

type Seg = { x1: number; y1: number; x2: number; y2: number }
type Pt = { x: number; y: number }

const snap = (a: Pt, p: Pt): Seg => {
  let dx = p.x - a.x
  let dy = p.y - a.y
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI
  const m = ((ang % 90) + 90) % 90
  // Ortho snap, like holding F8 in CAD: within 3 degrees of an axis the line goes dead straight.
  if (m < 3 || m > 87) {
    if (Math.abs(dx) > Math.abs(dy)) dy = 0
    else dx = 0
  }
  return { x1: a.x, y1: a.y, x2: a.x + dx, y2: a.y + dy }
}

function Dimension({ s, draft }: { s: Seg; draft?: boolean }) {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const len = Math.hypot(dx, dy)
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI
  const flip = ang > 90 || ang < -90
  const deg = Math.abs(flip ? ang + (ang > 0 ? -180 : 180) : ang)
  return (
    <g className={`${b.mLine} ${draft ? b.mDraft : ''}`}>
      <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
      <g transform={`translate(${s.x1} ${s.y1}) rotate(${ang})`}>
        <path d="M0 -9V9M0 0L9 -3M0 0L9 3" />
      </g>
      <g transform={`translate(${s.x2} ${s.y2}) rotate(${ang + 180})`}>
        <path d="M0 -9V9M0 0L9 -3M0 0L9 3" />
      </g>
      {len > 24 && (
        <text
          transform={`translate(${(s.x1 + s.x2) / 2} ${(s.y1 + s.y2) / 2}) rotate(${flip ? ang + 180 : ang})`}
          dy="-9"
          textAnchor="middle"
        >
          {fmtMM(len)} MM · {deg.toFixed(1)}°
        </text>
      )}
    </g>
  )
}

/**
 * Drafting toy: drag, or click two points, to drop a dimension line with its length and angle.
 * Lines live in document coordinates so they scroll with the sheet.
 */
export function MeasureLayer({ active, onExit }: { active: boolean; onExit: () => void }) {
  const [lines, setLines] = useState<Seg[]>([])
  const [draft, setDraft] = useState<Seg | null>(null)
  const start = useRef<Pt | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    if (!active) {
      start.current = null
      dragging.current = false
      setDraft(null)
    }
  }, [active])

  useEffect(() => {
    const clear = (e: KeyboardEvent) => {
      if (active && e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) setLines([])
    }
    window.addEventListener('keydown', clear)
    return () => window.removeEventListener('keydown', clear)
  }, [active])

  const commit = (s: Seg) => setLines((l) => [...l.slice(-11), s])
  const pt = (e: React.PointerEvent): Pt => ({ x: e.pageX, y: e.pageY })

  return (
    <>
      <svg className={b.measureLayer} aria-hidden="true">
        {lines.map((s, i) => (
          <Dimension key={i} s={s} />
        ))}
        {draft && <Dimension s={draft} draft />}
      </svg>
      {active && (
        <>
          <div
            className={b.measureCatcher}
            onPointerDown={(e) => {
              const p = pt(e)
              if (start.current && !dragging.current) {
                commit(snap(start.current, p))
                start.current = null
                setDraft(null)
                return
              }
              start.current = p
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y })
            }}
            onPointerMove={(e) => {
              if (start.current) setDraft(snap(start.current, pt(e)))
            }}
            onPointerUp={(e) => {
              dragging.current = false
              const a = start.current
              if (!a) return
              const p = pt(e)
              if (Math.hypot(p.x - a.x, p.y - a.y) > 8) {
                commit(snap(a, p))
                start.current = null
                setDraft(null)
              }
            }}
            onPointerCancel={() => {
              start.current = null
              dragging.current = false
              setDraft(null)
            }}
          />
          <div className={b.measureHint} role="status">
            <span>MEASURE · DRAG OR CLICK TWO POINTS</span>
            {lines.length > 0 && (
              <button type="button" onClick={() => setLines([])}>
                CLEAR<kbd>C</kbd>
              </button>
            )}
            <button type="button" onClick={onExit}>
              DONE<kbd>ESC</kbd>
            </button>
          </div>
        </>
      )}
    </>
  )
}
