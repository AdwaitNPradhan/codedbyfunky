'use client'

import { Fragment, useEffect, useRef } from 'react'
import { loadGsap } from '../lib/gsap'
import { clamp, cx, useReduced } from '../lib/misc'
import { StickerArt } from './art'

/** One shared scroll-velocity reading for every marquee (px/s, signed, smoothed). */
const scroll = { v: 0, dir: 1, y: 0, t: 0, started: false }
function trackScroll() {
  if (scroll.started) return
  scroll.started = true
  scroll.y = window.scrollY
  scroll.t = performance.now()
  window.addEventListener(
    'scroll',
    () => {
      const now = performance.now()
      const dy = window.scrollY - scroll.y
      const dt = Math.max(now - scroll.t, 8) / 1000
      scroll.v += (dy / dt - scroll.v) * 0.35
      if (Math.abs(dy) > 0.5) scroll.dir = dy > 0 ? 1 : -1
      scroll.y = window.scrollY
      scroll.t = now
    },
    { passive: true },
  )
}

type Props = { items: string[]; tone?: 'ink' | 'cream'; reverse?: boolean }

/** Ink ticker band. Text duplicated for a seamless loop; speed follows scroll velocity. */
export function Marquee({ items, tone = 'ink', reverse }: Props) {
  const reduced = useReduced()
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    const w = wrap.current
    const t = track.current
    if (!w || !t) return
    trackScroll()
    let visible = true
    let cancelled = false
    let tick: ((time: number, dt: number) => void) | null = null
    let ticker: {
      add: (f: (...a: number[]) => void) => void
      remove: (f: (...a: number[]) => void) => void
    } | null = null
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      rootMargin: '120px',
    })
    io.observe(w)

    loadGsap().then(({ gsap }) => {
      if (cancelled) return
      let pos = 0
      let ts = reverse ? -1 : 1
      const base = reverse ? -1 : 1
      tick = (_time, dtMs) => {
        if (!visible) return
        const dt = Math.min(dtMs, 64) / 1000
        const half = t.scrollWidth / 2
        if (!half) return
        // direction follows scroll direction; speed 1 + clamp(|v| * k, 0, 5)
        scroll.v *= Math.pow(0.0004, dt) // decay when scrolling stops
        const target = base * scroll.dir * (1 + clamp(Math.abs(scroll.v) * 0.006, 0, 5))
        ts += (target - ts) * (1 - Math.exp(-dt / 0.3))
        pos += (half / 22) * dt * ts // one copy per 22s at rest
        pos = ((pos % half) + half) % half
        t.style.transform = `translate3d(${-pos}px,0,0)`
      }
      ticker = gsap.ticker
      ticker.add(tick as never)
    })

    return () => {
      cancelled = true
      io.disconnect()
      if (ticker && tick) ticker.remove(tick as never)
    }
  }, [reduced, reverse])

  const reps = reduced ? items : [...items, ...items, ...items]
  const line = (key: string) => (
    <div className="ar-marquee__line" key={key}>
      {reps.map((s, i) => (
        <Fragment key={i}>
          <span>{s}</span>
          <StickerArt
            kind={i % 2 ? 'bolt' : 'star'}
            tone={i % 3 === 0 ? 'yellow' : i % 3 === 1 ? 'pink' : 'mint'}
            className="ar-marquee__gem"
          />
        </Fragment>
      ))}
    </div>
  )

  return (
    <div
      ref={wrap}
      className={cx('ar-marquee', `ar-marquee--${tone}`, reduced && 'is-static')}
      role="presentation"
      aria-hidden="true"
    >
      <div ref={track} className="ar-marquee__track">
        {line('a')}
        {!reduced && line('b')}
      </div>
    </div>
  )
}
