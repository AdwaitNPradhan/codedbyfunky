'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from './gsap'
import { useBP } from './ctx'
import { clamp } from './util'
import b from './base.module.css'

type Pad = { id: string; y: number; x: number }
type Layout = { h: number; w: number; lane: number; jog: number; pads: Pad[]; small: boolean }

/**
 * The master PCB trace. One path down the left margin, only 0/45/90 degree bends, branching to a
 * ring pad at every section header. It is laid out from the real DOM (pad anchors), so it
 * survives any content length, and it draws itself with the scroll.
 */
export function MasterTrace({ host }: { host: React.RefObject<HTMLDivElement | null> }) {
  const { reduced, contactOk } = useBP()
  const [lay, setLay] = useState<Layout | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const ghost = useRef<SVGPathElement>(null)
  const master = useRef<SVGPathElement>(null)
  const live = useRef<SVGPathElement>(null)
  const pulse = useRef<SVGGElement>(null)
  const liveBranch = useRef<SVGPathElement>(null)
  const headRef = useRef(0)

  // 1. measure the page (pad anchors) whenever its size changes
  useEffect(() => {
    const page = host.current
    if (!page) return
    let t = 0
    const measure = () => {
      const top = page.getBoundingClientRect().top + window.scrollY
      const small = window.innerWidth < 768
      const pads: Pad[] = Array.from(page.querySelectorAll<HTMLElement>('[data-trace-pad]'))
        .map((el) => {
          const r = el.getBoundingClientRect()
          return {
            id: el.dataset.tracePad ?? '',
            y: r.top + window.scrollY - top + r.height / 2,
            x: r.left + r.width / 2,
          }
        })
        .sort((a, c) => a.y - c.y)
      const lane = small ? 18 : 40
      const next: Layout = {
        h: page.scrollHeight,
        w: Math.max(lane + 40, ...pads.map((p) => p.x + 12)),
        lane,
        jog: small ? 8 : 14,
        pads,
        small,
      }
      setLay((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    const later = () => {
      window.clearTimeout(t)
      t = window.setTimeout(measure, 120)
    }
    measure()
    const ro = new ResizeObserver(later)
    ro.observe(page)
    window.addEventListener('resize', later)
    document.fonts?.ready.then(later)
    window.addEventListener('load', later)
    return () => {
      window.clearTimeout(t)
      ro.disconnect()
      window.removeEventListener('resize', later)
      window.removeEventListener('load', later)
    }
  }, [host])

  // 2. build path strings from the layout
  const geo = useMemo(() => {
    if (!lay) return null
    const { h, lane, jog, pads, small } = lay
    const hx = lane + jog
    let d = `M${lane} 0`
    const branches: { id: string; d: string; cx: number; cy: number }[] = []
    for (const p of pads) {
      const y0 = Math.max(60, p.y - 70)
      const y1 = p.y + 40
      // jog the master out to the second lane around each pad: 45 degrees out, 45 degrees back
      d += `V${y0}L${hx} ${y0 + jog}V${y1}L${lane} ${y1 + jog}`
      const cy = p.y + 8
      // 90-degree run, one 45-degree kink, 90-degree run into the pad
      const bx = Math.max(hx + 4, p.x - 30)
      const bd = small
        ? `M${hx} ${p.y}L${hx + 4} ${cy}H${Math.max(hx + 5, p.x - 6)}`
        : `M${hx} ${p.y}H${bx}L${bx + 8} ${cy}H${Math.max(bx + 9, p.x - 8)}`
      branches.push({ id: p.id, d: bd, cx: p.x, cy })
    }
    d += `V${h}`
    return { d, branches }
  }, [lay])

  // 3. animate
  useEffect(() => {
    const m = master.current
    const g = ghost.current
    if (!geo || !m || !g || reduced === null) return
    const root = svg.current
    if (!root) return

    if (reduced) {
      // Fully drawn, static.
      gsap.set([m, ...root.querySelectorAll(`.${b.branch}`)], { clearProps: 'all' })
      return
    }

    const ctx = gsap.context(() => {
      const h = lay!.h
      const vh = window.innerHeight
      const proxy = { p: 0 }
      gsap.set(m, { drawSVG: '0% 0%' })

      const head = () => clamp((window.scrollY + vh * 0.78) / h, 0, 1)
      const apply = () => {
        headRef.current = proxy.p
        gsap.set(m, { drawSVG: `0% ${proxy.p * 100}%` })
      }
      const follow = () =>
        gsap.to(proxy, {
          p: head(),
          duration: 0.6,
          ease: 'power3.out',
          overwrite: true,
          onUpdate: apply,
        })
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: follow, onRefresh: follow })
      follow()

      // branches draw once, as their header nears the viewport
      root.querySelectorAll<SVGPathElement>(`.${b.branch}`).forEach((br) => {
        const id = br.dataset.pad
        const ring = root.querySelector<SVGGElement>(`[data-ring="${id}"]`)
        const anchor = host.current?.querySelector(`[data-trace-pad="${id}"]`)
        if (!anchor) return
        gsap.set(br, { drawSVG: '0%' })
        if (ring) gsap.set(ring, { scale: 0, svgOrigin: `${ring.dataset.cx} ${ring.dataset.cy}` })
        ScrollTrigger.create({
          trigger: anchor,
          start: 'top 76%',
          end: 'max',
          once: true,
          onEnter: () => {
            gsap.to(br, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut' })
            if (ring) gsap.to(ring, { scale: 1, duration: 0.4, ease: 'back.out(2)', delay: 0.55 })
          },
        })
      })

      // one amber pulse flows down the drawn part of the trace
      const pl = pulse.current
      if (pl) {
        const len = m.getTotalLength()
        gsap.set(pl, { opacity: 0 })
        const tw: gsap.core.Tween = gsap.to(pl, {
          motionPath: { path: m, align: m, alignOrigin: [0.5, 0.5] },
          duration: clamp(len / 420, 5, 24),
          ease: 'none',
          repeat: -1,
          onUpdate: () => {
            pl.style.opacity = tw.progress() <= headRef.current - 0.002 ? '1' : '0'
          },
        })
      }
    }, svg)
    return () => ctx.revert()
  }, [geo, reduced, lay, host])

  // 4. contact success: the whole trace energises into the slip
  useEffect(() => {
    const l = live.current
    const lb = liveBranch.current
    if (!l || !lb) return
    if (!contactOk) {
      gsap.set([l, lb], { opacity: 0 })
      return
    }
    gsap.set([l, lb], { opacity: 1 })
    if (reduced !== false) return
    const tl = gsap.timeline()
    tl.fromTo(l, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.6, ease: 'power2.inOut' })
    tl.fromTo(lb, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.out' })
    return () => void tl.kill()
  }, [contactOk, reduced, geo])

  if (!lay || !geo) return <svg ref={svg} className={b.trace} aria-hidden="true" />
  const slip = geo.branches.find((x) => x.id === 'slip')

  return (
    <svg
      ref={svg}
      className={b.trace}
      width={lay.w}
      height={lay.h}
      viewBox={`0 0 ${lay.w} ${lay.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <path ref={ghost} d={geo.d} className={b.traceGhost} />
      <path ref={master} d={geo.d} className={b.traceMaster} />
      <path ref={live} d={geo.d} className={b.traceLive} opacity="0" />
      {geo.branches.map((br) => (
        <path key={br.id} d={br.d} className={b.branch} data-pad={br.id} />
      ))}
      {slip && <path ref={liveBranch} d={slip.d} className={b.traceLive} opacity="0" />}
      {geo.branches.map((br) => (
        <g key={br.id} data-ring={br.id} data-cx={br.cx} data-cy={br.cy} className={b.pad}>
          <circle cx={br.cx} cy={br.cy} r={lay.small ? 5 : 7} />
          <circle cx={br.cx} cy={br.cy} r={lay.small ? 1.6 : 2.5} className={b.padHole} />
        </g>
      ))}
      <g ref={pulse} className={b.pulse}>
        <circle r="7" className={b.pulseHalo} />
        <circle r="4" />
      </g>
    </svg>
  )
}
