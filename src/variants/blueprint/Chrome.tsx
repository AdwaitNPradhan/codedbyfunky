'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from './gsap'
import { useBP, type Sheet } from './ctx'
import { Overlay, CloseButton } from './Overlay'
import { revLetter, track, useIsoLayoutEffect } from './util'
import type { Settings } from '@/lib/types'
import b from './base.module.css'

export type Phase = 'boot' | 'reveal' | 'done'

/** Cyanotype duotone (shadow #082B4C, highlight #CFE6FF). Applied to static images only. */
export function CyanFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <filter id="bp-cyano" colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0.166 0.559 0.056 0 0.031  0.156 0.524 0.053 0 0.169  0.149 0.502 0.051 0 0.298  0 0 0 1 0"
        />
      </filter>
    </svg>
  )
}

export function GridBg() {
  return <div className={b.gridBg} aria-hidden="true" />
}

const ZONES_X = [1, 2, 3, 4, 5, 6, 7, 8]
const ZONES_Y = ['A', 'B', 'C', 'D', 'E', 'F']

/** Fixed ISO-style drawing frame: border, 64px ticks, zone letters. */
export function Frame({ phase, fast }: { phase: Phase; fast: boolean }) {
  const { reduced } = useBP()
  const svg = useRef<SVGSVGElement>(null)
  const path = useRef<SVGPathElement>(null)

  useIsoLayoutEffect(() => {
    const el = svg.current
    if (!el) return
    const set = () => {
      const m = el.clientWidth < 768 ? 12 : 24
      const w = el.clientWidth
      const h = el.clientHeight
      path.current?.setAttribute('d', `M${m} ${m}H${w - m}V${h - m}H${m}Z`)
    }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const drawn = useRef(false)
  useEffect(() => {
    const p = path.current
    if (!p || reduced !== false) return
    if (phase === 'boot') {
      gsap.set(p, { drawSVG: '0%' })
      return
    }
    // The loader finishing (reveal -> done) must not cut the draw short, so no kill in cleanup.
    if (drawn.current) return
    drawn.current = true
    gsap.fromTo(
      p,
      { drawSVG: '0%' },
      {
        drawSVG: '100%',
        duration: fast ? 0.6 : 1.2,
        ease: 'power2.inOut',
        onComplete: () => void p.removeAttribute('style'),
      },
    )
  }, [phase, reduced, fast])
  useEffect(() => {
    const p = path.current
    return () => {
      if (p) gsap.killTweensOf(p)
    }
  }, [])

  return (
    <div className={b.frame} aria-hidden="true">
      <svg ref={svg} className={b.frameSvg}>
        <path ref={path} d="M24 24H1256V776H24Z" className={b.framePath} />
      </svg>
      <span className={`${b.tick} ${b.tickT}`} />
      <span className={`${b.tick} ${b.tickB}`} />
      <span className={`${b.tick} ${b.tickL}`} />
      <span className={`${b.tick} ${b.tickR}`} />
      <ol className={`${b.zones} ${b.zonesT}`}>
        {ZONES_X.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
      <ol className={`${b.zones} ${b.zonesB}`}>
        {ZONES_X.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
      <ol className={`${b.zones} ${b.zonesL}`}>
        {ZONES_Y.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
      <ol className={`${b.zones} ${b.zonesR}`}>
        {ZONES_Y.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
    </div>
  )
}

/** Text that rolls vertically when it changes (title block). Manages its own text nodes. */
function Roll({
  initial,
  text,
  reduced,
}: {
  initial: string
  text: string
  reduced: boolean | null
}) {
  const a = useRef<HTMLSpanElement>(null)
  const c = useRef<HTMLSpanElement>(null)
  const cur = useRef(0)
  const prev = useRef(initial)

  useEffect(() => {
    if (c.current) gsap.set(c.current, { yPercent: 100 })
  }, [])

  useEffect(() => {
    if (prev.current === text) return
    const els = [a.current, c.current]
    const from = els[cur.current]
    const to = els[1 - cur.current]
    prev.current = text
    if (!from || !to) return
    to.textContent = text
    gsap.killTweensOf([from, to])
    if (reduced !== false) {
      gsap.set(to, { yPercent: 0 })
      gsap.set(from, { yPercent: 100 })
    } else {
      gsap.fromTo(to, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: 'expo.inOut' })
      gsap.to(from, { yPercent: -100, duration: 0.5, ease: 'expo.inOut' })
    }
    cur.current = 1 - cur.current
  }, [text, reduced])

  return (
    <span className={b.roll}>
      <span ref={a} className={b.rollItem}>
        {initial}
      </span>
      <span ref={c} className={b.rollItem} aria-hidden="true" />
    </span>
  )
}

export function TitleBlock({
  settings,
  sheets,
  idx,
  revCount,
  grid,
  setGrid,
  measure,
  setMeasure,
}: {
  settings: Settings
  sheets: Sheet[]
  idx: number
  revCount: number
  grid: boolean
  setGrid: (v: boolean) => void
  measure: boolean
  setMeasure: (v: boolean) => void
}) {
  const { reduced, openIndex } = useBP()
  const [date, setDate] = useState('')
  useEffect(() => setDate(new Date().toISOString().slice(0, 10)), [])
  const n = sheets.length
  const sheetNo = `${String(idx + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}`
  const rev = revLetter(Math.max(0, revCount - 1))

  return (
    <>
      <div className={b.tools} role="group" aria-label="Drafting tools">
        <button
          type="button"
          className={b.chip}
          aria-pressed={grid}
          onClick={() => setGrid(!grid)}
          title="Toggle grid and rulers (G)"
        >
          GRID<kbd>G</kbd>
        </button>
        <button
          type="button"
          className={b.chip}
          aria-pressed={measure}
          onClick={() => {
            setMeasure(!measure)
            track('measure_toggle')
          }}
          title="Measure tool (M)"
        >
          MEASURE<kbd>M</kbd>
        </button>
        <button type="button" className={b.chip} onClick={openIndex} title="Sheet index">
          INDEX
        </button>
      </div>
      <div className={b.tblock} aria-hidden="true">
        <div className={b.tbCell}>
          <span className={b.tbLab}>DRAWN BY</span>
          <span className={b.tbVal}>{settings.handle}</span>
        </div>
        <div className={b.tbCell}>
          <span className={b.tbLab}>SCALE</span>
          <span className={b.tbVal}>1:1</span>
        </div>
        <div className={b.tbCell}>
          <span className={b.tbLab}>REV</span>
          <span className={b.tbVal}>{rev}</span>
        </div>
        <div className={`${b.tbCell} ${b.tbWide}`}>
          <span className={b.tbLab}>SHEET</span>
          <span className={b.tbVal}>
            <Roll
              initial={`${String(1).padStart(2, '0')}/${String(n).padStart(2, '0')}`}
              text={sheetNo}
              reduced={reduced}
            />
          </span>
        </div>
        <div className={`${b.tbCell} ${b.tbName}`}>
          <span className={b.tbLab}>TITLE</span>
          <span className={b.tbVal}>
            <Roll
              initial={sheets[0]?.name ?? ''}
              text={sheets[idx]?.name ?? ''}
              reduced={reduced}
            />
          </span>
        </div>
        <div className={b.tbCell}>
          <span className={b.tbLab}>DATE</span>
          <span className={b.tbVal}>{date || '----'}</span>
        </div>
      </div>
    </>
  )
}

export function TopBar({
  settings,
  sheets,
  idx,
}: {
  settings: Settings
  sheets: Sheet[]
  idx: number
}) {
  const { openIndex } = useBP()
  const nav = sheets.filter((s) => s.nav)
  const sheetNo = `${String(idx + 1).padStart(2, '0')}/${String(sheets.length).padStart(2, '0')}`
  const hasOrder = sheets.some((s) => s.id === 'sheet-order')
  return (
    <header className={b.topbar}>
      <button
        type="button"
        className={b.sheetChip}
        onClick={openIndex}
        aria-label={`Sheet ${sheetNo}, ${sheets[idx]?.name}. Open sheet index`}
      >
        <span>{sheetNo}</span>
        <span className={b.sheetChipName}>{sheets[idx]?.name}</span>
      </button>
      <a className={b.brand} href="#sheet-cover">
        {settings.name}
      </a>
      <nav className={b.nav} aria-label="Primary">
        <ul>
          {nav.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={sheets[idx]?.id === s.id ? 'true' : undefined}>
                {s.nav}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className={b.topActions}>
        {settings.resumeUrl && (
          <a
            className={`${b.btn} ${b.btnGhost} ${b.btnSm}`}
            href={settings.resumeUrl}
            download
            onClick={() => track('cta_resume', { at: 'topbar' })}
          >
            Resume
          </a>
        )}
        {hasOrder && (
          <a className={`${b.btn} ${b.btnPrimary} ${b.btnSm}`} href="#sheet-order">
            Contact
          </a>
        )}
      </div>
    </header>
  )
}

/** Sheet index: the table of contents of the drawing set. Also lists the keyboard toys. */
export function IndexSheet({
  sheets,
  settings,
  onClose,
}: {
  sheets: Sheet[]
  settings: Settings
  onClose: () => void
}) {
  const { scrollTo } = useBP()
  return (
    <Overlay label="Sheet index" onClose={onClose} className={b.indexOverlay}>
      <div className={b.indexSheet}>
        <div className={b.sheetBar}>
          <span className={b.mono}>DRAWING INDEX</span>
          <CloseButton onClick={onClose} />
        </div>
        <ol className={b.indexList}>
          {sheets.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  onClose()
                  window.setTimeout(() => scrollTo(s.id), 80)
                }}
              >
                <span className={b.mono}>{String(i + 1).padStart(2, '0')}</span>
                <span className={b.indexName}>{s.name}</span>
                <span className={b.mono}>{s.part}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className={b.indexFoot}>
          {settings.resumeUrl && (
            <a
              className={`${b.btn} ${b.btnGhost}`}
              href={settings.resumeUrl}
              download
              onClick={() => track('cta_resume', { at: 'index' })}
            >
              Download resume
            </a>
          )}
          <p className={b.mono}>G GRID · M MEASURE · ESC CLOSE</p>
        </div>
      </div>
    </Overlay>
  )
}

/** First-visit boot: blue wipe, title block types itself, then the sheet reveals. Skippable. */
export function Loader({
  handle,
  onReveal,
  onDone,
  onFast,
}: {
  handle: string
  onReveal: () => void
  onDone: () => void
  onFast: (v: boolean) => void
}) {
  const { reduced } = useBP()
  const wrap = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const typed = useRef<HTMLParagraphElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (reduced === null) return
    let seen = false
    try {
      seen = sessionStorage.getItem('blueprintSeen') === '1'
      sessionStorage.setItem('blueprintSeen', '1')
    } catch {
      /* storage blocked: treat as first visit */
    }
    onFast(seen)
    let revealed = false
    const reveal = () => {
      if (!revealed) {
        revealed = true
        onReveal()
      }
    }
    const finish = () => {
      reveal()
      setGone(true)
      onDone()
    }

    if (reduced) {
      const t = gsap.to(wrap.current, {
        autoAlpha: 0,
        duration: 0.15,
        onStart: reveal,
        onComplete: finish,
      })
      return () => void t.kill()
    }

    if (typed.current)
      typed.current.textContent = `${handle.toUpperCase()} / PORTFOLIO / REV ${new Date().getFullYear()}`
    const k = seen ? 0.5 : 1
    gsap.set(fill.current, { clipPath: 'inset(100% 0% 0% 0%)' })
    gsap.set(typed.current, { clipPath: 'inset(0% 100% 0% 0%)' })
    const t = gsap.timeline({ onComplete: finish })
    t.to(
      fill.current,
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5 * k, ease: 'power4.inOut' },
      0.1 * k,
    )
    if (!seen)
      t.to(
        typed.current,
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'steps(24)' },
        0.45,
      )
    t.add(reveal, seen ? 0.65 : 1.1)
    t.to(
      wrap.current,
      { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5 * k, ease: 'power4.inOut' },
      seen ? 0.6 : 1.1,
    )
    tl.current = t
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') t.progress(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      t.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  if (gone) return null
  return (
    <div ref={wrap} className={b.loader} role="presentation">
      <noscript>
        <style>{`.${b.loader}{display:none!important}.${b.gridBg}{opacity:1!important}`}</style>
      </noscript>
      <div ref={fill} className={b.loaderFill}>
        <p ref={typed} className={b.loaderText} aria-hidden="true" />
      </div>
      <button type="button" className={b.loaderSkip} onClick={() => tl.current?.progress(1)}>
        Skip<kbd>ESC</kbd>
      </button>
    </div>
  )
}
