'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap, ScrollTrigger, SplitText } from './gsap'
import { useBP } from './ctx'
import { track } from './util'
import type { Settings } from '@/lib/types'
import type { Phase } from './Chrome'
import h from './hero.module.css'
import b from './base.module.css'

/* ---------- isometric exploded handheld (own SVG, not from the CMS) ---------- */

const C = 0.866
const S = 0.5
const XC = 176 // common axis
const YC0 = 470 // centre of the bottom layer
const BX = 396 // badge column
const GAP = 78 // exploded spacing
const CENTER = -150 // the middle layer stays put; the stack opens symmetrically around it

type LayerDef = {
  key: string
  label: string
  W: number
  D: number
  t: number
  mobile: boolean
  detail: ReactNode
}

const pt = (l: LayerDef, x: number, y: number): [number, number] => [
  XC - (C * (l.W - l.D)) / 2 + C * (x - y),
  YC0 - S * ((l.W + l.D) / 2) + S * (x + y),
]

const LAYERS: LayerDef[] = [
  {
    key: 'bottom',
    label: 'Base case',
    W: 214,
    D: 134,
    t: 12,
    mobile: true,
    detail: (
      <>
        {[
          [16, 16],
          [198, 16],
          [16, 118],
          [198, 118],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="4.5" />
        ))}
        <rect x="34" y="24" width="146" height="86" strokeDasharray="5 4" />
      </>
    ),
  },
  {
    key: 'battery',
    label: 'Battery',
    W: 150,
    D: 84,
    t: 10,
    mobile: false,
    detail: (
      <>
        <rect x="8" y="8" width="134" height="68" />
        <path d="M50 8V76M100 8V76" strokeDasharray="4 4" />
        <rect x="-8" y="30" width="8" height="24" />
      </>
    ),
  },
  {
    key: 'pcb',
    label: 'Main PCB',
    W: 196,
    D: 118,
    t: 4,
    mobile: true,
    detail: (
      <>
        <path d="M14 22H58L74 38V84H132M14 56H40L52 68V104M92 22H150L164 36V70M120 104H172L184 92" />
        <rect x="28" y="30" width="32" height="32" />
        <rect x="104" y="46" width="30" height="24" />
        <rect x="146" y="78" width="26" height="26" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={20 + i * 12} cy={110} r="2.4" />
        ))}
        <circle cx="12" cy="12" r="4" />
        <circle cx="184" cy="106" r="4" />
      </>
    ),
  },
  {
    key: 'display',
    label: 'Display',
    W: 176,
    D: 100,
    t: 5,
    mobile: false,
    detail: (
      <>
        <rect x="8" y="8" width="160" height="84" />
        <path d="M22 26H84M22 40H132M22 54H110M22 68H148" />
      </>
    ),
  },
  {
    key: 'top',
    label: 'Top case',
    W: 214,
    D: 134,
    t: 12,
    mobile: true,
    detail: (
      <>
        <rect x="28" y="14" width="158" height="74" />
        <path d="M34 108H58M46 96V120" />
        <circle cx="160" cy="108" r="7" />
        <circle cx="182" cy="98" r="7" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d="M104 98l10 -8" transform={`translate(${i * 8} ${i * 6})`} />
        ))}
      </>
    ),
  },
]

const sideL = (l: LayerDef) => {
  const a = pt(l, 0, l.D)
  const c = pt(l, l.W, l.D)
  return `M${a[0]} ${a[1]}L${c[0]} ${c[1]}V${c[1] + l.t}H${a[0]}Z`
}
const sideR = (l: LayerDef) => {
  const c = pt(l, l.W, l.D)
  const r = pt(l, l.W, 0)
  return `M${c[0]} ${c[1]}L${r[0]} ${r[1]}V${r[1] + l.t}H${c[0]}Z`
}
const leaderOf = (l: LayerDef) => {
  const p0 = pt(l, l.W * 0.82, l.D * 0.72)
  const p1: [number, number] = [p0[0] + 22, p0[1] - 22]
  return { p0, p1, d: `M${p0[0]} ${p0[1]}L${p1[0]} ${p1[1]}H${BX - 15}` }
}

function Exploded({ active, setActive, svgRef }: { active: number | null; setActive: (i: number | null) => void; svgRef: React.RefObject<SVGSVGElement | null> }) {
  return (
    <svg
      ref={svgRef}
      className={h.exploded}
      viewBox="0 52 440 536"
      role="img"
      aria-label="Isometric exploded view of a generic handheld device: base case, battery, main PCB, display and top case."
    >
      {LAYERS.map((l, i) => {
        const { p0, p1, d } = leaderOf(l)
        const [ox, oy] = pt(l, 0, 0)
        return (
          <g
            key={l.key}
            className={h.layer}
            data-layer={i}
            data-mobile={l.mobile ? undefined : 'hide'}
            data-active={active === i ? 'true' : undefined}
            transform={`translate(0 ${CENTER - (i - (LAYERS.length - 1) / 2) * GAP})`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            <path d={sideL(l)} className={h.sideL} />
            <path d={sideR(l)} className={h.sideR} />
            <g transform={`translate(${ox} ${oy}) matrix(${C} ${S} ${-C} ${S} 0 0)`} className={h.top}>
              <rect width={l.W} height={l.D} className={h.face} />
              {l.detail}
            </g>
            <path d={d} className={h.leader} data-leader />
            <circle cx={p0[0]} cy={p0[1]} r="3" className={h.leaderDot} />
            <g className={h.badge} data-badge data-cx={BX} data-cy={p1[1]}>
              <circle cx={BX} cy={p1[1]} r="14" />
              <text x={BX} y={p1[1]} textAnchor="middle" dominantBaseline="central">
                {i + 1}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

export function Hero({ settings, phase }: { settings: Settings; phase: Phase }) {
  const { reduced } = useBP()
  const [active, setActive] = useState<number | null>(null)
  const heroEl = useRef<HTMLElement>(null)
  const h1Text = useRef<HTMLSpanElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const phaseRef = useRef(phase)
  const introRef = useRef<gsap.core.Animation | null>(null)
  phaseRef.current = phase

  const status = settings.availability.status
  const statusLabel = status === 'open' ? 'OPEN TO WORK' : status === 'selective' ? 'SELECTIVELY AVAILABLE' : null
  const headline = settings.tagline || `${settings.name}, ${settings.roles[0] ?? 'engineer'}`

  // headline lines rise out of a mask once the sheet reveals
  useEffect(() => {
    const el = h1Text.current
    if (!el || reduced !== false) return
    const split = SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      maskClass: h.mask,
      autoSplit: true,
      onSplit: (self) => {
        gsap.set(self.lines, { yPercent: 110 })
        const tw = gsap.to(self.lines, {
          yPercent: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.08,
          paused: phaseRef.current === 'boot',
        })
        introRef.current = tw
        return tw
      },
    })
    return () => {
      split.revert()
      introRef.current = null
    }
  }, [reduced])

  useEffect(() => {
    if (phase !== 'boot') introRef.current?.play()
  }, [phase])

  // exploded view: scrubbed on desktop, one-shot on mobile
  useEffect(() => {
    const svg = svgRef.current
    const hero = heroEl.current
    if (!svg || !hero || reduced !== false) return
    const mm = gsap.matchMedia()
    mm.add(
      { desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' },
      (ctx) => {
        const { mobile } = ctx.conditions as { mobile: boolean }
        const layers = Array.from(svg.querySelectorAll<SVGGElement>('[data-layer]'))
        const shown = layers.filter((_, i) => (mobile ? LAYERS[i].mobile : true))
        const hidden = layers.filter((l) => !shown.includes(l))
        if (hidden.length) gsap.set(hidden, { display: 'none' })
        // assembled offsets: each layer sits flush on the thickness of the one below
        const cum = shown.map((_, j) =>
          shown.slice(0, j).reduce((a, el) => a + LAYERS[layers.indexOf(el)].t + 1, 0),
        )
        const mid = cum[cum.length - 1] / 2
        const assembled = cum.map((c) => CENTER - (c - mid))
        const exploded = shown.map((_, j) => CENTER - (j - (shown.length - 1) / 2) * GAP)
        const leaders = shown.map((l) => l.querySelector('[data-leader]'))
        const dots = shown.map((l) => l.querySelector(`.${h.leaderDot}`))
        const badges = shown.map((l) => l.querySelector<SVGGElement>('[data-badge]')!)
        badges.forEach((bd, j) => {
          gsap.set(bd, { svgOrigin: `${bd.dataset.cx} ${bd.dataset.cy}` })
          // badges are renumbered 1..n over the layers that are actually shown
          const t = bd.querySelector('text')
          if (t) t.textContent = String(j + 1)
        })

        const tl = gsap.timeline({
          paused: mobile,
          scrollTrigger: mobile
            ? undefined
            : { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 1 },
        })
        const T = mobile ? 0.8 : 1
        shown.forEach((el, j) => tl.fromTo(el, { y: assembled[j] }, { y: exploded[j], ease: 'power2.inOut', duration: 0.6 * T }, 0))
        tl.fromTo(leaders, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 0.22 * T, stagger: 0.04 * T }, 0.55 * T)
        tl.fromTo(dots, { opacity: 0 }, { opacity: 1, duration: 0.05 * T, stagger: 0.04 * T }, 0.55 * T)
        tl.fromTo(badges, { scale: 0 }, { scale: 1, ease: 'back.out(2)', duration: 0.2 * T, stagger: 0.04 * T }, 0.72 * T)
        if (mobile) {
          ScrollTrigger.create({ trigger: svg, start: 'top 82%', once: true, onEnter: () => tl.timeScale(0.8 / 0.6).play() })
        }
        return () => {
          if (hidden.length) gsap.set(hidden, { clearProps: 'display' })
          badges.forEach((bd) => {
            const idx = layers.indexOf(bd.closest('[data-layer]') as SVGGElement)
            const t = bd.querySelector('text')
            if (t) t.textContent = String(idx + 1)
          })
        }
      },
    )
    return () => mm.revert()
  }, [reduced])

  const items = LAYERS.map((l, i) => ({ ...l, n: i + 1 }))

  return (
    <section ref={heroEl} id="sheet-cover" data-sheet className={h.hero} aria-labelledby="bp-h1">
      <div className={h.sticky}>
        <div className={h.layout}>
          <div className={h.copy}>
            <h1 id="bp-h1" className={h.h1}>
              <span className={h.vh}>{settings.name}: </span>
              <span ref={h1Text}>{headline}</span>
            </h1>
            {settings.shortBio && <p className={h.lede}>{settings.shortBio}</p>}
            <div className={h.actions}>
              <a className={`${b.btn} ${b.btnPrimary}`} href="#sheet-order">
                Contact
              </a>
              {settings.resumeUrl && (
                <a
                  className={`${b.btn} ${b.btnGhost}`}
                  href={settings.resumeUrl}
                  download
                  onClick={() => track('cta_resume', { at: 'hero' })}
                >
                  Resume <span className={b.mono}>PDF</span>
                </a>
              )}
              <a className={b.textLink} href="#sheet-work">
                See work
                <svg viewBox="0 0 16 8" width="16" height="8" aria-hidden="true">
                  <path d="M0 4H15M11 0.5L15 4L11 7.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
                </svg>
              </a>
            </div>
            <dl className={h.spec} data-dim>
              <div>
                <dt>NAME</dt>
                <dd>
                  {settings.name} <span className={b.dim}>({settings.handle})</span>
                </dd>
              </div>
              {settings.roles.length > 0 && (
                <div>
                  <dt>ROLE</dt>
                  <dd>{settings.roles.slice(0, 3).join(' · ')}</dd>
                </div>
              )}
              {(settings.location || settings.timezone) && (
                <div>
                  <dt>BASE</dt>
                  <dd>{[settings.location, settings.timezone].filter(Boolean).join(' · ')}</dd>
                </div>
              )}
              {statusLabel && (
                <div>
                  <dt>STATUS</dt>
                  <dd>
                    <span className={h.status}>
                      <i aria-hidden="true" />
                      {statusLabel}
                    </span>
                    {settings.availability.note && <span className={h.statusNote}>{settings.availability.note}</span>}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <figure className={h.figure}>
            <Exploded active={active} setActive={setActive} svgRef={svgRef} />
            <figcaption className={h.legendCap}>
              <span className={b.mono}>FIG. 01 · EXPLODED VIEW, GENERIC HANDHELD</span>
              <ol className={h.legend}>
                {items.map((l, i) => (
                  <li key={l.key} data-mobile={l.mobile ? undefined : 'hide'}>
                    <button
                      type="button"
                      data-active={active === i ? 'true' : undefined}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                    >
                      <span className={h.legendNo} aria-hidden="true" />
                      {l.label}
                    </button>
                  </li>
                ))}
              </ol>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
