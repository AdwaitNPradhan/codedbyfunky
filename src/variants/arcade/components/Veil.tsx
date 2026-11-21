'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGsap } from '../lib/gsap'
import { markIntroDone, track } from '../lib/misc'

/**
 * PRESS START veil. The real page is already in the DOM underneath (SSR first).
 * Any key / tap, or ~1s, runs four colour bars up. Repeat visits skip straight to the bars.
 * A CSS failsafe removes the veil even if JS never loads.
 */
export function Veil() {
  const root = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let seen = false
    try {
      seen = sessionStorage.getItem('arcadeSeen') === '1'
    } catch {}
    const finish = () => {
      try {
        sessionStorage.setItem('arcadeSeen', '1')
      } catch {}
      setDone(true)
      markIntroDone()
    }
    if (reduced) {
      finish()
      return
    }

    let cancelled = false
    let started = false
    let timer = 0
    const cleanupFns: Array<() => void> = []

    loadGsap().then(({ gsap }) => {
      if (cancelled) return
      const bars = el.querySelectorAll<HTMLElement>('.ar-veil__bar')
      const press = el.querySelector<HTMLElement>('.ar-veil__press')
      const sheet = el.querySelector<HTMLElement>('.ar-veil__sheet')

      const run = (skipped: boolean) => {
        if (started) return
        started = true
        window.clearTimeout(timer)
        if (skipped && !seen) track('intro_skip')
        const tl = gsap.timeline({ onComplete: finish })
        tl.to(press, { opacity: 0, duration: 0.12 }, 0)
        tl.to(sheet, { autoAlpha: 0, duration: 0.01 }, 0.1)
        tl.to(bars, { yPercent: -101, duration: 0.6, ease: 'expo.inOut', stagger: 0.08 }, 0.1)
        // cards start flying as the bars clear
        tl.call(() => markIntroDone(), undefined, 0.45)
      }

      if (seen) {
        // repeat visit: bars only, ~0.5s
        gsap.set(sheet, { autoAlpha: 0 })
        const tl = gsap.timeline({ onComplete: finish })
        tl.to(bars, { yPercent: -101, duration: 0.4, ease: 'expo.inOut', stagger: 0.05 })
        tl.call(() => markIntroDone(), undefined, 0.25)
        return
      }

      const go = () => run(true)
      window.addEventListener('keydown', go, { once: true })
      window.addEventListener('pointerdown', go, { once: true })
      cleanupFns.push(() => {
        window.removeEventListener('keydown', go)
        window.removeEventListener('pointerdown', go)
      })
      timer = window.setTimeout(() => run(false), 800)
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cleanupFns.forEach((f) => f())
    }
  }, [])

  if (done) return null
  return (
    <div ref={root} className="ar-veil" aria-hidden="true">
      <div className="ar-veil__bar" style={{ left: '0%', background: 'var(--pink)' }} />
      <div className="ar-veil__bar" style={{ left: '25%', background: 'var(--yellow)' }} />
      <div className="ar-veil__bar" style={{ left: '50%', background: 'var(--blue)' }} />
      <div className="ar-veil__bar" style={{ left: '75%', background: 'var(--mint)' }} />
      <div className="ar-veil__sheet">
        <p className="ar-veil__press">PRESS START</p>
      </div>
    </div>
  )
}
