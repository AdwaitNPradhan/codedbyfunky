'use client'

import Lenis from 'lenis'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SiteData } from '@/lib/types'
import { gsap, ScrollTrigger } from './gsap'
import { archivo, plexMono } from './fonts'
import { BPContext, type BP, type Sheet } from './ctx'
import { CyanFilter, Frame, GridBg, IndexSheet, Loader, TitleBlock, TopBar, type Phase } from './Chrome'
import { Cursor, MeasureLayer } from './Cursor'
import { MasterTrace } from './MasterTrace'
import { Hero } from './Hero'
import { About } from './About'
import { Projects } from './Projects'
import { Hardware } from './Hardware'
import { Photos } from './Photos'
import { Games } from './Games'
import { Skills } from './Skills'
import { Experience } from './Experience'
import { Contact, Footer } from './Contact'
import { isTyping, pad2 } from './util'
import b from './base.module.css'

export default function Site({ data }: { data: SiteData }) {
  const { settings, projects, photos, games, hardware, skills, experience } = data
  const rootRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const [reduced, setReduced] = useState<boolean | null>(null)
  const [fine, setFine] = useState(false)
  const [phase, setPhase] = useState<Phase>('boot')
  const [fast, setFast] = useState(false)
  const [locks, setLocks] = useState(0)
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null)
  const [grid, setGrid] = useState(false)
  const [measure, setMeasure] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<string | null>(null)
  const [contactOk, setContactOk] = useState(false)
  const [sheetIdx, setSheetIdx] = useState(0)

  const sheets = useMemo<Sheet[]>(() => {
    const l: Omit<Sheet, 'part'>[] = [
      { id: 'sheet-cover', name: 'COVER' },
      { id: 'sheet-notes', name: 'GENERAL NOTES' },
    ]
    if (projects.length) l.push({ id: 'sheet-work', name: 'ASSEMBLY BOM', nav: 'Work' })
    if (hardware.length) l.push({ id: 'sheet-hardware', name: 'HARDWARE', nav: 'Hardware' })
    if (photos.length) l.push({ id: 'sheet-plates', name: 'REFERENCE PLATES', nav: 'Photography' })
    if (games.length) l.push({ id: 'sheet-tests', name: 'TEST REPORT', nav: 'Games' })
    if (skills.length) l.push({ id: 'sheet-pinout', name: 'PINOUT' })
    if (experience.length) l.push({ id: 'sheet-revisions', name: 'REVISION TABLE' })
    l.push({ id: 'sheet-order', name: 'WORK ORDER' })
    return l.map((s, i) => ({ ...s, part: `P-${pad2(i + 1)}` }))
  }, [projects.length, hardware.length, photos.length, games.length, skills.length, experience.length])

  // media queries, read once on the client
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener('change', set)
    setFine(window.matchMedia('(pointer: fine)').matches)
    return () => mq.removeEventListener('change', set)
  }, [])

  // smooth scroll, synced to ScrollTrigger exactly once
  useEffect(() => {
    if (reduced !== false) return
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  // overlays freeze the page: inert wrapper + no scroll behind
  useEffect(() => {
    const el = document.documentElement
    if (locks > 0) {
      lenisRef.current?.stop()
      const prev = el.style.overflow
      el.style.overflow = 'hidden'
      return () => {
        el.style.overflow = prev
        lenisRef.current?.start()
      }
    }
  }, [locks])

  const lock = useCallback(() => {
    setLocks((n) => n + 1)
    return () => setLocks((n) => Math.max(0, n - 1))
  }, [])

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id)
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY - (id === 'sheet-cover' || id === 'main' ? 0 : 56)
      if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.1, force: true })
      else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' })
    },
    [reduced],
  )

  // in-page anchors go through the same scroller (and keep the URL honest)
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
      const id = a.getAttribute('href')!.slice(1)
      if (!id || id.startsWith('project-')) return
      const el = document.getElementById(id)
      if (!el) return
      e.preventDefault()
      try {
        history.pushState(null, '', `#${id}`)
      } catch {
        /* ignore */
      }
      scrollTo(id)
      if (el.tabIndex === -1) el.focus({ preventScroll: true })
    },
    [scrollTo],
  )

  // which sheet is on the title block
  useEffect(() => {
    if (reduced === null) return
    const sts = sheets.map((s, i) => {
      const el = document.getElementById(s.id)
      if (!el) return null
      return ScrollTrigger.create({
        trigger: el,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self) => {
          if (self.isActive) setSheetIdx(i)
        },
      })
    })
    return () => sts.forEach((t) => t?.kill())
  }, [sheets, reduced])

  // one calm reveal for content blocks; sections add their own signature moments.
  // IntersectionObserver (not ScrollTrigger) so it still fires after programmatic jumps and anchor scrolls.
  useEffect(() => {
    if (reduced !== false) return
    const els = Array.from(pageRef.current?.querySelectorAll<HTMLElement>('[data-reveal]') ?? [])
    if (!els.length) return
    gsap.set(els, { opacity: 0, y: 24 })
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).map((e) => e.target)
        if (!vis.length) return
        vis.forEach((v) => io.unobserve(v))
        gsap.to(vis, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, overwrite: true, clearProps: 'opacity,transform' })
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => {
      io.disconnect()
      gsap.set(els, { clearProps: 'opacity,transform' })
    }
  }, [reduced])

  // keep trigger positions honest as images, fonts and accordions change the page height
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    let t = 0
    const refresh = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => ScrollTrigger.refresh(), 200)
    }
    const ro = new ResizeObserver(refresh)
    ro.observe(page)
    document.fonts?.ready.then(refresh)
    return () => {
      window.clearTimeout(t)
      ro.disconnect()
    }
  }, [])

  // keyboard toys: G grid, M measure, Esc leaves measure
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (locks > 0 || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'g') setGrid((v) => !v)
      else if (key === 'm') setMeasure((v) => !v)
      else if (e.key === 'Escape') setMeasure(false)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [locks])

  const ctx = useMemo<BP>(
    () => ({
      reduced,
      fine,
      sheets,
      activeSkill,
      setActiveSkill,
      overlayRoot,
      lock,
      scrollTo,
      contactOk,
      setContactOk,
      openIndex: () => setIndexOpen(true),
    }),
    [reduced, fine, sheets, activeSkill, overlayRoot, lock, scrollTo, contactOk],
  )

  const onReveal = useCallback(() => setPhase('reveal'), [])
  const onDone = useCallback(() => setPhase('done'), [])

  return (
    <BPContext.Provider value={ctx}>
      <div
        ref={rootRef}
        className={`${b.root} ${archivo.variable} ${plexMono.variable}`}
        data-variant="blueprint"
        data-grid={grid ? 'on' : 'off'}
        data-measure={measure ? 'on' : 'off'}
        data-phase={phase}
        onClick={onClick}
      >
        <CyanFilter />
        <div ref={pageRef} className={b.page} inert={locks > 0}>
          <a className={b.skip} href="#main">
            Skip to content
          </a>
          <GridBg />
          <Frame phase={phase} fast={fast} />
          <MasterTrace host={pageRef} />
          <TopBar settings={settings} sheets={sheets} idx={sheetIdx} />
          <TitleBlock
            settings={settings}
            sheets={sheets}
            idx={sheetIdx}
            revCount={experience.length}
            grid={grid}
            setGrid={setGrid}
            measure={measure}
            setMeasure={setMeasure}
          />
          <main id="main" tabIndex={-1} className={b.main}>
            <Hero settings={settings} phase={phase} />
            <About settings={settings} />
            <Projects projects={projects} />
            <Hardware hardware={hardware} />
            <Photos photos={photos} settings={settings} />
            <Games games={games} />
            <Skills skills={skills} projects={projects} />
            <Experience items={experience} settings={settings} />
            <Contact settings={settings} />
          </main>
          <Footer settings={settings} />
          <MeasureLayer active={measure} onExit={() => setMeasure(false)} />
        </div>
        <div ref={setOverlayRoot} />
        {indexOpen && <IndexSheet sheets={sheets} settings={settings} onClose={() => setIndexOpen(false)} />}
        <Cursor rootRef={rootRef} measure={measure} />
        <Loader handle={settings.handle} onReveal={onReveal} onDone={onDone} onFast={setFast} />
      </div>
    </BPContext.Provider>
  )
}
