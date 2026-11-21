'use client'

import { useEffect, useRef, useState } from 'react'
import type { Settings } from '@/lib/types'
import {
  armSound,
  doReveal,
  hydrateSound,
  onReveal,
  readSoundPref,
  resetReveal,
  scrollVel,
  setSound,
  track,
} from './engine'
import { gsap } from './gsap'
import { Arrow, isLite, MQ_FINE, useDarkroom, useMedia, useReducedMotion } from './lib'
import s from './root.module.css'

const MARKS = 44

/* ---------- Grain: one 256px noise tile, generated once, stepped by CSS ---------- */
export function Grain() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    if (!g || !ref.current) return
    const px = g.createImageData(256, 256)
    for (let i = 0; i < px.data.length; i += 4) {
      const v = Math.random() * 255
      px.data[i] = px.data[i + 1] = px.data[i + 2] = v
      px.data[i + 3] = 255
    }
    g.putImageData(px, 0, 0)
    ref.current.style.backgroundImage = `url(${c.toDataURL('image/png')})`
  }, [])
  return <div ref={ref} className={s.grain} aria-hidden="true" />
}

/* ---------- Film edges: sprocket strips that drift against each other and follow scroll velocity ---------- */
export function FilmEdges() {
  const top = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const t = top.current
    const b = bottom.current
    if (!t || !b) return
    const wrapT = t.parentElement!
    const wrapB = b.parentElement!
    const stopReveal = onReveal(() => {
      if (reduced) return
      gsap.fromTo(
        wrapT,
        { x: -160, opacity: 0 },
        { x: 0, opacity: 0.35, duration: 0.8, ease: 'expo.out' },
      )
      gsap.fromTo(
        wrapB,
        { x: 160, opacity: 0 },
        { x: 0, opacity: 0.35, duration: 0.8, ease: 'expo.out' },
      )
    })
    if (reduced) return stopReveal
    let off = 0
    const tick = (_: number, dt: number) => {
      // 0.06 px per ms of base drift, plus scroll velocity * 0.4
      off += (0.06 * dt + (scrollVel.v * 0.4 * dt) / 1000) % 96
      const o = off % 96
      t.style.transform = `translate3d(${-o}px,0,0)`
      b.style.transform = `translate3d(${o - 96}px,0,0)`
    }
    gsap.ticker.add(tick)
    return () => {
      stopReveal()
      gsap.ticker.remove(tick)
    }
  }, [reduced])

  const marks = (rev: boolean) =>
    Array.from({ length: MARKS }, (_, i) => {
      const n = (rev ? MARKS - i : i + 1) % 36 || 36
      return (
        <div key={i} className={s.mark}>
          <span>{String(n).padStart(2, '0')}A</span>
        </div>
      )
    })

  return (
    <>
      <div className={`${s.edge} ${s.edgeTop}`} aria-hidden="true">
        <div ref={top} className={s.edgeTrack}>
          {marks(false)}
        </div>
      </div>
      <div className={`${s.edge} ${s.edgeBottom}`} aria-hidden="true">
        <div ref={bottom} className={s.edgeTrack}>
          {marks(true)}
        </div>
      </div>
    </>
  )
}

/* ---------- Safelight glow + loupe (loupe: desktop on photos, or anywhere on [data-loupe=always]) ---------- */
export function Cursor() {
  const glow = useRef<HTMLDivElement>(null)
  const loupe = useRef<HTMLDivElement>(null)
  const fine = useMedia(MQ_FINE)
  const reduced = useReducedMotion()

  useEffect(() => {
    const g = glow.current
    const l = loupe.current
    if (!g || !l) return
    const autoLoupe = fine && !reduced && !isLite()
    const showGlow = fine && !reduced
    l.style.opacity = '0'
    let tx = -999,
      ty = -999,
      cx = -999,
      cy = -999
    let gScale = 1,
      gTarget = 1,
      lScale = 0.6,
      lTarget = 0.6
    let zone: HTMLElement | null = null
    let src = ''
    let seen = false
    let touch = false

    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      touch = e.pointerType === 'touch'
      if (!seen) {
        cx = tx
        cy = ty
        seen = true
        if (showGlow) g.style.opacity = '1'
      }
      const el = e.target instanceof Element ? e.target : null
      const z = el?.closest<HTMLElement>('[data-loupe]') ?? null
      const ok = z && (z.dataset.loupe === 'always' || (e.pointerType === 'mouse' && autoLoupe))
      zone = ok ? z : null
      if (zone) {
        const url = zone.dataset.src || ''
        if (url !== src) {
          src = url
          l.style.backgroundImage = `url("${url}")`
        }
      }
      lTarget = zone ? 1 : 0.6
      l.style.opacity = zone ? '1' : '0'
      const link = el?.closest('a,button,[role="button"],summary,label,input,textarea,select')
      gTarget = zone ? 0.35 : link ? 60 / 140 : 1
    }
    const leave = () => {
      g.style.opacity = '0'
      l.style.opacity = '0'
      seen = false
    }
    const tick = (_: number, dt: number) => {
      const k = 1 - Math.pow(1 - 0.14, dt / 16.67)
      cx += (tx - cx) * k
      cy += (ty - cy) * k
      gScale += (gTarget - gScale) * Math.min(1, k * 1.4)
      lScale += (lTarget - lScale) * Math.min(1, k * 2)
      g.style.transform = `translate3d(${cx}px,${cy}px,0) scale(${gScale})`
      if (zone && (!zone.isConnected || !zone.hasAttribute('data-loupe'))) {
        zone = null
        lTarget = 0.6
        l.style.opacity = '0'
      }
      if (zone) {
        const r = zone.getBoundingClientRect()
        const Z = 2
        l.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`
        l.style.backgroundPosition = `${-((tx - r.left) * Z - 48)}px ${-((ty - r.top) * Z - 48)}px`
      }
      l.style.transform = `translate3d(${tx}px,${touch ? ty - 84 : ty}px,0) scale(${lScale})`
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      gsap.ticker.remove(tick)
    }
  }, [fine, reduced])

  return (
    <>
      <div ref={glow} className={s.glow} aria-hidden="true" />
      <div ref={loupe} className={s.loupe} aria-hidden="true" />
    </>
  )
}

/* ---------- Top bar ---------- */
export function TopBar({ settings, active }: { settings: Settings; active: string }) {
  const { scrollTo } = useDarkroom()
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollTo(id)
    history.replaceState(null, '', id)
  }
  const cur = (id: string) => (active === id ? 'true' : undefined)
  return (
    <header className={s.bar}>
      <a
        href="#top"
        onClick={go('#top')}
        className={s.mark2}
        aria-label={`${settings.name} — back to top`}
      >
        <span className={s.long}>{settings.name}</span>
        <span className={s.short}>{settings.handle || settings.name}</span>
      </a>
      <nav className={s.nav} aria-label="Primary">
        <a href="#work" onClick={go('#work')} className={s.navLink} aria-current={cur('work')}>
          Work
        </a>
        <a href="#about" onClick={go('#about')} className={s.navLink} aria-current={cur('about')}>
          About
        </a>
        <a
          href="#photography"
          onClick={go('#photography')}
          className={s.navLink}
          aria-current={cur('photography')}
        >
          <span className={s.long}>Photography</span>
          <span className={s.short}>Photos</span>
        </a>
        {settings.resumeUrl && (
          <a
            href={settings.resumeUrl}
            download
            className={s.navLink}
            onClick={() => track('cta_resume', { where: 'bar' })}
          >
            Resume
          </a>
        )}
        <a
          href="#contact"
          onClick={go('#contact')}
          className={`${s.navLink} ${s.navCta}`}
          aria-current={cur('contact')}
        >
          Contact
        </a>
      </nav>
    </header>
  )
}

/* ---------- Bottom-left HUD: frame counter + sound toggle ---------- */
export function Hud({
  frameRef,
  barOn,
}: {
  frameRef: React.RefObject<HTMLSpanElement | null>
  barOn: boolean
}) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    hydrateSound()
    setOn(readSoundPref())
    const arm = () => armSound()
    window.addEventListener('pointerdown', arm, { once: true })
    return () => window.removeEventListener('pointerdown', arm)
  }, [])
  return (
    <div className={s.hud} data-bar={barOn ? 'on' : 'off'}>
      <span ref={frameRef} aria-hidden="true">
        frame 01 / 36
      </span>
      <button
        type="button"
        className={s.soundBtn}
        aria-pressed={on}
        onClick={() => {
          setSound(!on)
          setOn(!on)
        }}
      >
        sound {on ? 'on' : 'off'}
      </button>
    </div>
  )
}
/* ---------- Intro veil: "developing 000 -> 100", skippable, shorter on repeat visits ---------- */
export function Intro() {
  const veil = useRef<HTMLDivElement>(null)
  const lamp = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLSpanElement>(null)
  const [gone, setGone] = useState(false)
  const reduced = useReducedMotion()
  const skipRef = useRef<() => void>(() => {})

  useEffect(() => {
    resetReveal()
    const v = veil.current
    if (!v) return
    let seen = false
    try {
      seen = sessionStorage.getItem('darkroomSeen') === '1'
      sessionStorage.setItem('darkroomSeen', '1')
    } catch {}
    if (reduced) {
      doReveal()
      setGone(true)
      return
    }
    v.style.animation = 'none'
    const T = seen ? { dark: 0.05, count: 0.3, fade: 0.35 } : { dark: 0.3, count: 0.8, fade: 0.9 }
    const num = { v: 0 }
    const write = () => {
      if (text.current)
        text.current.textContent = `developing ${String(Math.round(num.v)).padStart(3, '0')}`
    }
    const heroImg = document.querySelector<HTMLImageElement>('[data-hero-img] img')
    let ready = !heroImg || (heroImg.complete && heroImg.naturalWidth > 0)
    const wait: (() => void)[] = []
    const markReady = () => {
      ready = true
      wait.splice(0).forEach((f) => f())
    }
    if (!ready && heroImg) {
      heroImg.addEventListener('load', markReady, { once: true })
      heroImg.addEventListener('error', markReady, { once: true })
    }
    const finish = () => setGone(true)
    const tl = gsap.timeline({ onComplete: finish })
    tl.to(lamp.current, { opacity: 1, duration: 0.25 }, T.dark)
      .to(num, { v: 92, duration: T.count, ease: 'power1.inOut', onUpdate: write }, T.dark)
      .call(() => {
        if (ready) return
        tl.pause()
        const resume = () => tl.play()
        wait.push(resume)
        gsap.delayedCall(1.2, markReady) // never wait longer than 1.2s for the hero image
      })
      .to(num, { v: 100, duration: 0.15, ease: 'none', onUpdate: write })
      .call(doReveal)
      .to(v, { opacity: 0, duration: T.fade, ease: 'power2.inOut' })
    skipRef.current = () => {
      tl.kill()
      track('intro_skip')
      doReveal()
      gsap.to(v, { opacity: 0, duration: 0.25, onComplete: finish })
    }
    return () => {
      tl.kill()
      heroImg?.removeEventListener('load', markReady)
      heroImg?.removeEventListener('error', markReady)
    }
  }, [reduced])

  if (gone) return null
  return (
    <div ref={veil} className={s.veil} role="status" aria-label="Loading">
      <div ref={lamp} className={s.lamp}>
        <span className={s.lampDot} />
        <span ref={text} className={s.lampText}>
          developing 000
        </span>
      </div>
      <button type="button" className={s.skipIntro} onClick={() => skipRef.current()}>
        skip
      </button>
    </div>
  )
}

/* ---------- Instagram pill (desktop) / dismissible bar (mobile) ---------- */
export function InstaPill({
  ig,
  show,
  onDismiss,
}: {
  ig: Settings['instagram']
  show: boolean
  onDismiss: () => void
}) {
  if (!ig?.url) return null
  return (
    <div role="complementary" aria-label="Instagram">
      <a
        href={ig.url}
        target="_blank"
        rel="noopener noreferrer"
        className={s.pill}
        data-show={show}
        tabIndex={show ? 0 : -1}
        onClick={() => track('cta_instagram', { where: 'pill' })}
      >
        Follow {ig.handle || 'on Instagram'}
        <Arrow />
      </a>
      <button
        type="button"
        className={s.pillX}
        data-show={show}
        tabIndex={show ? 0 : -1}
        aria-label="Dismiss Instagram bar"
        onClick={onDismiss}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          aria-hidden="true"
        >
          <path d="m3 3 10 10M13 3 3 13" />
        </svg>
      </button>
    </div>
  )
}
