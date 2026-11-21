'use client'

import { useEffect, useRef } from 'react'
import { domMax, LazyMotion } from 'motion/react'
import type { SiteData } from '@/lib/types'
import { bodyFont, displayFont, pixelFont } from './fonts'
import { loadGsap } from './lib/gsap'
import { fireConfetti } from './lib/confetti'
import { award, hydrate, onCoin, setHue, toast, useArcade } from './lib/store'
import { sfx } from './lib/sound'
import { cx, useReduced } from './lib/misc'
import { Veil } from './components/Veil'
import { Nav, Toasts } from './components/Nav'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { About } from './components/About'
import { Work } from './components/Work'
import { Play } from './components/Play'
import { Photos } from './components/Photos'
import { Lab } from './components/Lab'
import { Skills } from './components/Skills'
import { Experience } from './components/Experience'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { Toys } from './components/Toys'
import './styles/base.css'
import './styles/layout.css'
import './styles/sections.css'
import './styles/play.css'
import './styles/toys.css'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export default function ArcadeSite({ data }: { data: SiteData }) {
  const { settings: s, projects, photos, games, hardware, skills, experience } = data
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReduced()
  const hue = useArcade((st) => st.hue)

  useEffect(() => {
    hydrate()
    // square-wave blip on every button / pill press (only audible when SOUND is on)
    const press = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.('.ar-btn, .ar-pill, .ar-toybox__btn')) sfx.press()
    }
    window.addEventListener('pointerdown', press, { passive: true })
    const offCoin = onCoin(() => sfx.coin())
    return () => {
      window.removeEventListener('pointerdown', press)
      offCoin()
    }
  }, [])

  // Konami code: swap the palette (hue shift via CSS variable) and throw confetti. Disabled for reduced motion.
  useEffect(() => {
    if (reduced) return
    let i = 0
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      i = k === KONAMI[i] ? i + 1 : k === KONAMI[0] ? 1 : 0
      if (i === KONAMI.length) {
        i = 0
        const on = !hue
        setHue(on)
        if (root.current) fireConfetti(root.current)
        award('cheat-code')
        toast('CHEAT CODE ACCEPTED', on ? 'Palette swapped. Enter it again to swap back.' : 'Palette restored.')
        sfx.jingle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reduced, hue])

  // Slab slam: content enters with y 60 -> 0, rotate 2 -> 0 (back.out), once, for slabs below the fold.
  useEffect(() => {
    if (reduced || !root.current) return
    let cancelled = false
    let io: IntersectionObserver | null = null
    let ctx: { revert: () => void } | null = null
    loadGsap().then(({ gsap }) => {
      if (cancelled || !root.current) return
      ctx = gsap.context(() => {
        const els = gsap.utils.toArray<HTMLElement>('[data-slam]').filter((el) => !el.closest('#top') && el.getBoundingClientRect().top >= window.innerHeight * 0.85)
        gsap.set(els, { y: 60, rotate: 2, transformOrigin: '0% 100%' })
        // fires when a slab's top edge crosses 85% of the viewport height
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue
              io?.unobserve(e.target)
              gsap.to(e.target, { y: 0, rotate: 0, duration: 0.5, ease: 'back.out(1.7)', clearProps: 'transform' })
            }
          },
          { rootMargin: '0px 0px -15% 0px' },
        )
        els.forEach((el) => io?.observe(el))
      }, root.current)
    })
    return () => {
      cancelled = true
      io?.disconnect()
      ctx?.revert()
    }
  }, [reduced])

  const roleItems = s.roles.length ? s.roles : ['Software engineer']
  const status = s.availability.status === 'open' ? ['OPEN TO WORK'] : s.availability.status === 'selective' ? ['SELECTIVELY OPEN'] : []
  const tickerA = [...roleItems.map((r) => r.toUpperCase()), ...status]
  const tickerB = ['INSERT COIN', games.length ? `${games.length} GAMES INSIDE` : 'PLAY SOMETHING', 'DRAG EVERYTHING', 'COLLECT COINS']
  const tickerC = [photos.length ? `${photos.length} FRAMES` : 'PHOTOS', s.instagram.handle ? s.instagram.handle.toUpperCase() : 'FOLLOW ALONG', hardware.length ? `${hardware.length} GADGETS` : 'GADGETS', 'SOLDER FUMES']

  // Sync features on purpose: async features build the visual element after hydration and overwrite motion values set in between.
  return (
    <LazyMotion features={domMax}>
      <div
        ref={root}
        data-variant="arcade"
        data-hue={hue ? 'on' : undefined}
        className={cx(displayFont.variable, bodyFont.variable, pixelFont.variable, 'ar-root')}
      >
        <a className="ar-skip" href="#main">
          Skip to content
        </a>
        <Veil />
        <Nav handle={s.handle} resumeUrl={s.resumeUrl} />
        <main id="main">
          <Hero s={s} gameCount={games.length} photoCount={photos.length} />
          <Marquee items={tickerA} />
          <About s={s} />
          <Work projects={projects} />
          <Marquee items={tickerB} tone="cream" reverse />
          <Play games={games} />
          <Marquee items={tickerC} />
          <Photos photos={photos} instagram={s.instagram} />
          <Lab hardware={hardware} />
          <Skills skills={skills} />
          <Experience items={experience} />
          <Contact s={s} />
        </main>
        <Footer s={s} />
        <Toasts />
        <Toys rootRef={root} />
      </div>
    </LazyMotion>
  )
}
