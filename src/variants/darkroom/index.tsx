'use client'

import Lenis from 'lenis'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SiteData } from '@/lib/types'
import { About } from './About'
import { Contact, Footer } from './Contact'
import { Cursor, FilmEdges, Grain, Hud, InstaPill, Intro, TopBar } from './Chrome'
import { scrollVel } from './engine'
import { body, display, mono } from './fonts'
import { gsap, ScrollTrigger } from './gsap'
import { Hero } from './Hero'
import { DarkroomCtx, pad2, useMedia, useReducedMotion, type Ctx, type Overlay } from './lib'
import { Experience, Games, Hardware, Skills } from './More'
import { Photography } from './Photography'
import s from './root.module.css'
import { Work } from './Work'

// Overlays are separate chunks: nothing below loads before the first visitor interaction.
const Lightbox = dynamic(() => import('./Lightbox'), { ssr: false })
const ProjectDialog = dynamic(() => import('./ProjectDialog'), { ssr: false })

const IG_KEY = 'darkroomIgDismissed'
const projectFromHash = () => location.hash.match(/^#project-(.+)$/)?.[1] ?? null

export default function DarkroomSite({ data }: { data: SiteData }) {
  const { settings, projects, photos, games, hardware, skills, experience } = data
  const reduced = useReducedMotion()
  const mobile = useMedia('(max-width: 700px)')
  const rootEl = useRef<HTMLDivElement>(null)
  const frameEl = useRef<HTMLSpanElement>(null)
  const lenis = useRef<Lenis | null>(null)
  const pushed = useRef(false)
  const [active, setActive] = useState('top')
  const [pill, setPill] = useState(false)
  const [igGone, setIgGone] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [projTrigger, setProjTrigger] = useState<HTMLElement | null>(null)

  /* ---------- scroll engine: Lenis + ScrollTrigger synced exactly once ---------- */
  useEffect(() => {
    const html = document.documentElement
    const prev = { ox: html.style.overflowX, bx: document.body.style.overflowX, sc: html.style.scrollbarColor }
    html.style.overflowX = 'clip'
    document.body.style.overflowX = 'clip'
    html.style.scrollbarColor = '#e5391f #141210'
    ScrollTrigger.config({ ignoreMobileResize: true })

    let l: Lenis | null = null
    let raf: ((t: number) => void) | null = null
    if (!reduced) {
      l = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false })
      l.on('scroll', ScrollTrigger.update)
      raf = (t: number) => l!.raf(t * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
    }
    lenis.current = l

    let last = window.scrollY
    const vel = (_: number, dt: number) => {
      const y = window.scrollY
      scrollVel.v += ((y - last) / Math.max(dt, 1)) * 1000 * 0.15 - scrollVel.v * 0.15
      last = y
    }
    gsap.ticker.add(vel)

    const refresh = () => ScrollTrigger.refresh()
    void document.fonts.ready.then(refresh)
    window.addEventListener('load', refresh)

    return () => {
      window.removeEventListener('load', refresh)
      gsap.ticker.remove(vel)
      if (raf) gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      l?.destroy()
      lenis.current = null
      html.style.overflowX = prev.ox
      document.body.style.overflowX = prev.bx
      html.style.scrollbarColor = prev.sc
    }
  }, [reduced])

  /* ---------- page-level triggers: active section, frame counter, Instagram pill, grease marks ---------- */
  useEffect(() => {
    const root = rootEl.current
    if (!root) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-section]').forEach((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(el.dataset.section || ''),
        }),
      )
      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (frameEl.current) frameEl.current.textContent = `frame ${pad2(1 + Math.floor(self.progress * 35))} / 36`
        },
      })
      if (document.querySelector('#photography') && document.querySelector('#contact'))
        ScrollTrigger.create({
          trigger: '#photography',
          start: 'top 60%',
          endTrigger: '#contact',
          end: 'top 70%',
          onToggle: (self) => setPill(self.isActive),
        })
      if (!reduced) {
        const paths = gsap.utils.toArray<SVGPathElement>('[data-grease]')
        gsap.set(paths, { drawSVG: '0%' })
        ScrollTrigger.batch(paths, {
          start: 'top 85%',
          once: true,
          onEnter: (els) => gsap.to(els, { drawSVG: '100%', duration: 0.7, ease: 'power2.out', stagger: 0.12 }),
        })
      }
    }, root)
    return () => ctx.revert()
  }, [reduced])

  /* ---------- warm the overlay chunks when the browser is idle ---------- */
  useEffect(() => {
    const warm = () => {
      void import('./Lightbox')
      void import('./ProjectDialog')
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm)
      return () => w.cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(warm, 2500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- persisted dismissal is only readable after mount
      setIgGone(localStorage.getItem(IG_KEY) === '1')
    } catch {}
  }, [])

  /* ---------- overlays: scroll lock, inert page, hash deep links ---------- */
  useEffect(() => {
    const html = document.documentElement
    if (overlay) {
      lenis.current?.stop()
      html.style.overflowY = 'hidden'
    }
    return () => {
      lenis.current?.start()
      html.style.overflowY = ''
    }
  }, [overlay])

  useEffect(() => {
    const sync = () => {
      const slug = projectFromHash()
      if (slug && projects.some((p) => p.slug === slug)) {
        setOverlay((cur) => (cur?.kind === 'project' ? { ...cur, slug } : { kind: 'project', slug, x: window.innerWidth / 2, y: window.innerHeight / 2 }))
      } else setOverlay((cur) => (cur?.kind === 'project' ? null : cur))
    }
    if (projectFromHash()) sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [projects])

  const scrollTo = useCallback((target: string | number, immediate = false) => {
    const l = lenis.current
    if (l) l.scrollTo(target, { immediate, duration: 1.4, easing: (x: number) => 1 - Math.pow(1 - x, 4) })
    else if (typeof target === 'number') window.scrollTo({ top: target })
    else document.querySelector(target)?.scrollIntoView()
  }, [])

  const openPhoto = useCallback((id: string, trigger: HTMLElement | null) => setOverlay({ kind: 'photo', id, trigger }), [])
  const openProject = useCallback(
    (slug: string, x: number, y: number, trigger?: HTMLElement | null) => {
      setProjTrigger(trigger ?? null)
      history.pushState(null, '', `#project-${slug}`)
      pushed.current = true
      setOverlay({ kind: 'project', slug, x, y })
    },
    [],
  )

  const overlayKind = useRef<'photo' | 'project' | null>(null)
  overlayKind.current = overlay?.kind ?? null

  const closeOverlay = useCallback((restore: HTMLElement | null) => {
    if (overlayKind.current === 'project') {
      if (pushed.current) {
        pushed.current = false
        history.back()
      } else if (projectFromHash()) history.replaceState(null, '', location.pathname + location.search)
    }
    setOverlay(null)
    requestAnimationFrame(() => restore?.focus({ preventScroll: true }))
  }, [])

  const ctx = useMemo<Ctx>(() => ({ scrollTo, openPhoto, openProject, reduced }), [scrollTo, openPhoto, openProject, reduced])
  const showPill = pill && !(mobile && igGone)

  return (
    <DarkroomCtx.Provider value={ctx}>
      <div ref={rootEl} id="darkroom-root" data-variant="darkroom" className={`${s.root} ${display.variable} ${body.variable} ${mono.variable}`}>
        <Intro />
        <a href="#main" className={s.skip}>Skip to content</a>

        <div inert={overlay !== null}>
          <Grain />
          <FilmEdges />
          <Cursor />
          <TopBar settings={settings} active={active} />
          <Hud frameRef={frameEl} barOn={showPill && mobile} />
          <InstaPill
            ig={settings.instagram}
            show={showPill}
            onDismiss={() => {
              setIgGone(true)
              try {
                localStorage.setItem(IG_KEY, '1')
              } catch {}
            }}
          />

          <main id="main">
            <Hero data={data} />
            <Work projects={projects} />
            <About data={data} />
            <Photography photos={photos} ig={settings.instagram} />
            <Games games={games} />
            <Hardware items={hardware} />
            <Skills skills={skills} />
            <Experience items={experience} />
            <Contact data={data} />
          </main>
          <Footer data={data} />
        </div>

        {overlay?.kind === 'photo' && (
          <Lightbox photos={photos} startId={overlay.id} trigger={overlay.trigger} reduced={reduced} onClose={closeOverlay} />
        )}
        {overlay?.kind === 'project' && (
          <ProjectDialog
            projects={projects}
            slug={overlay.slug}
            x={overlay.x}
            y={overlay.y}
            trigger={projTrigger}
            reduced={reduced}
            onNavigate={(slug) => {
              history.replaceState(null, '', `#project-${slug}`)
              setOverlay({ ...overlay, slug })
            }}
            onContact={() => {
              closeOverlay(null)
              window.setTimeout(() => scrollTo('#contact'), 60)
            }}
            onClose={closeOverlay}
          />
        )}
      </div>
    </DarkroomCtx.Provider>
  )
}
