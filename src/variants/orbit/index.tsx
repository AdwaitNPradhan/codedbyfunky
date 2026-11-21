'use client'

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import clsx from 'clsx'
import type { SiteData } from '@/lib/types'
import { fontClasses } from './fonts'
import { countsOf, MOBILE_QUERY, STATIONS, type Caps, type Quality } from './lib/config'
import { gamesOf } from './lib/items'
import { loadMotion } from './lib/motion'
import { Ctx, createStore, type ItemKind, type OrbitApi, type OrbitCtx } from './lib/store'
import { track } from './lib/util'
import { useFlight } from './lib/useFlight'
import { useMagnetic } from './lib/useMagnetic'
import { useSound } from './lib/useSound'
import { buildRoute } from './lib/world'
import { Contact } from './stations/Contact'
import { Games } from './stations/Games'
import { Hardware } from './stations/Hardware'
import { Intro } from './stations/Intro'
import { Photography } from './stations/Photography'
import { Skills } from './stations/Skills'
import { Work } from './stations/Work'
import { CaseStudy } from './ui/CaseStudy'
import { Cursor } from './ui/Cursor'
import { Hud } from './ui/Hud'
import { PhotoViewer } from './ui/PhotoViewer'
import { Veil } from './ui/Veil'
import s from './orbit.module.css'

// three.js, r3f, drei and postprocessing live in one lazy chunk that starts after first paint.
const Scene = dynamic(() => import('./scene/Scene'), { ssr: false })

type ModalState = { kind: 'project'; slug: string } | { kind: 'photo'; i: number } | null

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const hashOf = (station: number) => (station === 0 ? location.pathname + location.search : '#' + STATIONS[station].id)

export default function OrbitSite({ data }: { data: SiteData }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [store] = useState(createStore)
  const counts = useMemo(() => countsOf(data), [data])

  const [caps, setCaps] = useState<Caps | null>(null)
  const [view, setView] = useState<'flight' | 'plain'>('flight')
  const [station, setStation] = useState(0)
  const [idx, setIdx] = useState<Record<ItemKind, number>>({ project: 0, photo: 0, game: 0, hw: 0 })
  const [modal, setModal] = useState<ModalState>(null)
  const [skillGroup, setSkillGroupState] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [gameReset, setGameReset] = useState(0)
  const [sceneOn, setSceneOn] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [minDone, setMinDone] = useState(false)
  const [veil, setVeil] = useState<'show' | 'lift' | 'gone'>('show')
  const [heroGo, setHeroGo] = useState(false)
  const [fast, setFast] = useState(false)

  const flight = view === 'flight' && caps !== null
  const mobile = caps?.mobile ?? false
  const route = useMemo(() => buildRoute(counts, mobile), [counts, mobile])

  // ---- capability detection (client only) ----
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    let webgl = false
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2')
      webgl = Boolean(gl)
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webgl = false
    }
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
    const lowEnd = Boolean(nav.connection?.saveData) || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let pref: string | null = null
    try {
      pref = localStorage.getItem('orbit:view')
      setFast(sessionStorage.getItem('orbitSeen') === '1')
    } catch {
      /* storage blocked */
    }
    const lowfx = new URLSearchParams(location.search).has('lowfx')
    setCaps({ mobile: mq.matches, reduced: rm.matches, webgl, lowEnd, coarse, lowfx })
    setView(rm.matches || !webgl || pref === 'plain' || (lowEnd && pref !== 'flight') ? 'plain' : 'flight')
    const onMq = () => setCaps((c) => (c ? { ...c, mobile: mq.matches } : c))
    mq.addEventListener('change', onMq)
    return () => mq.removeEventListener('change', onMq)
  }, [])

  // ---- 3D after first paint ----
  useEffect(() => {
    if (!flight) {
      setSceneOn(false)
      setSceneReady(false)
      return
    }
    const t = window.setTimeout(() => setSceneOn(true), 60)
    return () => window.clearTimeout(t)
  }, [flight, mobile])

  // ---- intro veil ----
  const lifted = useRef(false)
  const lift = useCallback(() => {
    if (lifted.current) return
    lifted.current = true
    setVeil('lift')
    try {
      sessionStorage.setItem('orbitSeen', '1')
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setHeroGo(true), fast ? 350 : 1500)
    window.setTimeout(() => setVeil('gone'), 900)
  }, [store, fast])

  useEffect(() => {
    if (!caps) return
    if (!flight) {
      lifted.current = true
      setVeil('gone')
      setHeroGo(true)
      store.intro = 0
      return
    }
    store.intro = 1
    const t1 = window.setTimeout(() => setMinDone(true), fast ? 250 : 1000)
    const t2 = window.setTimeout(lift, 3200)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [caps, flight, fast, lift, store])

  useEffect(() => {
    if (flight && sceneReady && minDone && veil === 'show') lift()
  }, [flight, sceneReady, minDone, veil, lift])

  // camera dolly-in starts once the veil is lifting AND the first frame exists (a late scene still gets its dolly)
  const dollied = useRef(false)
  useEffect(() => {
    if (!flight) {
      dollied.current = false
      return
    }
    if (dollied.current || !sceneReady || veil === 'show') return
    dollied.current = true
    void loadMotion().then(({ gsap }) => {
      gsap.to(store, { intro: 0, duration: fast ? 0.7 : 2.2, ease: 'power4.inOut', overwrite: true })
    })
  }, [flight, sceneReady, veil, store, fast])

  const skip = useCallback(() => {
    track('intro_skip')
    lifted.current = true
    store.intro = 0
    void loadMotion().then(({ gsap }) => gsap.killTweensOf(store))
    setVeil('gone')
    setHeroGo(true)
  }, [store])

  // ---- smooth scroll + scroll-linked panels ----
  const onIdx = useCallback((kind: ItemKind, i: number) => setIdx((p) => (p[kind] === i ? p : { ...p, [kind]: i })), [])
  const flightRef = useFlight({
    enabled: flight,
    rootRef,
    store,
    route,
    counts,
    mobile,
    heroGo,
    onStation: setStation,
    onIdx,
  })

  // ---- scroll lock for modals and games ----
  useEffect(() => {
    const on = Boolean(modal) || Boolean(playing)
    if (flightRef.current) flightRef.current.lockScroll(on)
    else document.documentElement.style.overflow = on ? 'hidden' : ''
    return () => {
      if (!flightRef.current) document.documentElement.style.overflow = ''
    }
  }, [modal, playing, flightRef])

  // ---- modal ↔ history ----
  const allProjects = data.projects
  const allPhotos = data.photos

  const modalFromHash = useCallback(
    (h: string): ModalState => {
      if (h.startsWith('#project-')) {
        const slug = decodeURIComponent(h.slice(9))
        return allProjects.some((p) => p.slug === slug) ? { kind: 'project', slug } : null
      }
      if (h.startsWith('#photo-')) {
        const i = Number(h.slice(7))
        return Number.isInteger(i) && allPhotos[i] ? { kind: 'photo', i } : null
      }
      return null
    },
    [allProjects, allPhotos],
  )

  useEffect(() => {
    const m = modalFromHash(location.hash)
    if (m) setModal(m)
    const onPop = () => setModal(modalFromHash(location.hash))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [modalFromHash])

  const stationRef = useRef(station)
  stationRef.current = station
  const openModal = useCallback((m: NonNullable<ModalState>, hash: string) => {
    try {
      history.pushState({ orbitModal: true }, '', hash)
    } catch {
      /* sandboxed */
    }
    setModal(m)
  }, [])
  const closeModal = useCallback(() => {
    if (history.state?.orbitModal) history.back()
    else {
      setModal(null)
      try {
        history.replaceState(history.state, '', hashOf(stationRef.current))
      } catch {
        /* sandboxed */
      }
    }
  }, [])
  const swapModal = useCallback((m: NonNullable<ModalState>, hash: string) => {
    try {
      history.replaceState(history.state, '', hash)
    } catch {
      /* sandboxed */
    }
    setModal(m)
  }, [])

  // ---- games ----
  const playingRef = useRef<string | null>(null)
  playingRef.current = playing
  const startFns = useRef(new Map<string, () => void>())
  const pendingPlay = useRef<string | null>(null)

  // ---- the API every station and the 3D scene call ----
  const apiRef = useRef<OrbitApi>(null as unknown as OrbitApi)
  const api = useMemo<OrbitApi>(() => {
    const exitGame = () => {
      setPlaying(null)
      setGameReset((n) => n + 1)
    }
    const a: OrbitApi = {
      toStation: (i, opts) => {
        if (playingRef.current) exitGame()
        if (flightRef.current) {
          // unlock synchronously so the scroll below is not swallowed
          flightRef.current.lockScroll(false)
          flightRef.current.toStation(i, opts)
        } else document.getElementById(STATIONS[i].id)?.scrollIntoView({ block: 'start' })
      },
      toItem: (kind, i) => {
        store.idx[kind] = i
        setIdx((p) => ({ ...p, [kind]: i }))
        flightRef.current?.toItem(kind, i)
      },
      openProject: (slug) => {
        track('project_open', { slug })
        openModal({ kind: 'project', slug }, '#project-' + slug)
      },
      openPhoto: (i) => openModal({ kind: 'photo', i }, '#photo-' + i),
      playGame: (i) => {
        const g = gamesOf(data)[i]
        if (!g) return
        a.toItem('game', i)
        const start = startFns.current.get(g.id)
        if (start) {
          start()
          setPlaying(g.id)
        } else pendingPlay.current = g.id
      },
      registerGameStart: (id, fn) => {
        if (fn) startFns.current.set(id, fn)
        else startFns.current.delete(id)
      },
      consumePlay: (id) => {
        if (pendingPlay.current !== id) return false
        pendingPlay.current = null
        setPlaying(id)
        return true
      },
      gameStarted: (id) => setPlaying(id),
      exitGame,
      setSkillGroup: (g) => {
        store.skillGroup = g
        setSkillGroupState(g)
      },
      hoverKey: (k) => {
        store.hover = k
        store.expHover = k?.startsWith('exp:') ? Number(k.slice(4)) : -1
      },
      showAll: () => {
        try {
          localStorage.setItem('orbit:view', 'plain')
        } catch {
          /* ignore */
        }
        setView('plain')
      },
    }
    apiRef.current = a
    return a
  }, [data, store, flightRef, openModal])

  // ---- Plain / Flight toggle (keeps your place) ----
  const toggleView = useCallback(() => {
    const next = view === 'flight' ? 'plain' : 'flight'
    if (next === 'flight') {
      // find the station nearest the viewport centre so Flight resumes there
      const mid = window.innerHeight / 2
      let best = 0
      document.querySelectorAll<HTMLElement>('section[data-station]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom >= mid) best = Number(el.dataset.station)
      })
      try {
        history.replaceState(history.state, '', hashOf(best))
      } catch {
        /* ignore */
      }
      lifted.current = false
      setVeil('show')
      setMinDone(false)
      setHeroGo(false)
      store.intro = 0
    }
    try {
      localStorage.setItem('orbit:view', next)
    } catch {
      /* ignore */
    }
    track('plain_view_toggle', { to: next })
    setView(next)
  }, [view, store])

  const keepStation = useRef<number | null>(null)
  useEffect(() => {
    // after flight → plain, stay on the same section
    if (view === 'plain' && keepStation.current !== null) {
      const i = keepStation.current
      keepStation.current = null
      requestAnimationFrame(() => document.getElementById(STATIONS[i].id)?.scrollIntoView({ block: 'start' }))
    }
  }, [view])
  const onToggleView = useCallback(() => {
    if (view === 'flight') keepStation.current = stationRef.current
    toggleView()
  }, [view, toggleView])

  const sound = useSound(store, station)
  const finePointer = caps !== null && !caps.coarse && !caps.reduced
  useMagnetic(finePointer, rootRef)

  const quality: Quality = useMemo(
    () => ({
      mobile,
      dpr: mobile || caps?.lowfx ? [1, 1] : [1, 1.5],
      post: !mobile && !(caps?.lowEnd ?? false) && !(caps?.lowfx ?? false),
      stars: mobile ? 500 : 1400,
    }),
    [mobile, caps?.lowEnd, caps?.lowfx],
  )

  const ctx = useMemo<OrbitCtx>(
    () => ({ data, store, api, flight, mobile, station, idx, skillGroup, playing, gameReset }),
    [data, store, api, flight, mobile, station, idx, skillGroup, playing, gameReset],
  )

  const project = modal?.kind === 'project' ? allProjects.find((p) => p.slug === modal.slug) : undefined
  const photo = modal?.kind === 'photo' ? allPhotos[modal.i] : undefined
  const pIndex = project ? Math.max(0, allProjects.indexOf(project)) : 0

  return (
    <div
      ref={rootRef}
      className={clsx(s.root, fontClasses)}
      data-variant="orbit"
      data-view={flight ? 'flight' : 'plain'}
      data-mobile={mobile ? 'true' : undefined}
      data-cursor-on={finePointer ? 'true' : undefined}
    >
      <Ctx.Provider value={ctx}>
        <div className={s.app} inert={modal ? true : undefined}>
          <a className={s.skipLink} href="#main">
            Skip to content
          </a>
          <Hud plain={!flight} canFly={Boolean(caps && !caps.reduced && caps.webgl)} onToggleView={onToggleView} sound={sound} />

          <div className={s.stage} aria-hidden="true">
            <div className={s.poster2} />
            {flight && sceneOn && (
              <SceneBoundary onError={() => setView('plain')}>
                <Scene data={data} store={store} api={api} quality={quality} route={route} onReady={() => setSceneReady(true)} />
              </SceneBoundary>
            )}
          </div>

          <main id="main" className={s.track}>
            <Intro />
            <Work />
            <Photography />
            <Games />
            <Hardware />
            <Skills />
            <Contact />
          </main>

          <Veil state={veil} name={data.settings.handle || data.settings.name} fast={fast} onSkip={skip} />
        </div>

        {project && (
          <CaseStudy
            project={project}
            index={pIndex}
            total={allProjects.length}
            onClose={closeModal}
            onStep={(d) => {
              const n = allProjects[(pIndex + d + allProjects.length) % allProjects.length]
              swapModal({ kind: 'project', slug: n.slug }, '#project-' + n.slug)
              track('project_open', { slug: n.slug })
            }}
            onContact={() => {
              closeModal()
              window.setTimeout(() => api.toStation(6), 80)
            }}
          />
        )}
        {photo && modal?.kind === 'photo' && (
          <PhotoViewer
            photo={photo}
            index={modal.i}
            total={allPhotos.length}
            igUrl={data.settings.instagram.url || null}
            onClose={closeModal}
            onStep={(d) => {
              const n = (modal.i + d + allPhotos.length) % allPhotos.length
              swapModal({ kind: 'photo', i: n }, '#photo-' + n)
            }}
          />
        )}
        <Cursor store={store} enabled={finePointer} />
      </Ctx.Provider>
    </div>
  )
}
