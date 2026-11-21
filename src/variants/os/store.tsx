'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from 'motion/react'
import type { SiteData } from '@/lib/types'
import { DOCK_RESERVE, idFor, MENU_H, META } from './appmeta'
import { setSoundEnabled, sfx } from './sound'
import { isVersionKey } from './versions'
import { clamp, safeParse, store } from './util'
import {
  DEFAULT_SETTINGS,
  type AppId,
  type Geo,
  type Settings,
  type WinProps,
  type WinState,
} from './types'

export type Area = { w: number; h: number }
type State = { wins: WinState[]; z: number }

type Action =
  | {
      t: 'open'
      id: string
      app: AppId
      props: WinProps
      size: { w: number; h: number }
      area: Area
      mobile: boolean
    }
  | { t: 'close'; id: string }
  | { t: 'focus'; id: string }
  | { t: 'min'; id: string }
  | { t: 'minAll' }
  | { t: 'geo'; id: string; geo: Geo }
  | { t: 'snap'; id: string; side: 'l' | 'r' | 'max'; area: Area }
  | { t: 'max'; id: string; area: Area }
  | { t: 'clamp'; area: Area }
  | { t: 'cascade'; area: Area }
  | { t: 'closeAll' }

const fit = (g: Geo, a: Area): Geo => {
  const w = Math.min(g.w, a.w)
  const h = Math.min(g.h, a.h)
  return { w, h, x: clamp(g.x, 0, Math.max(0, a.w - w)), y: clamp(g.y, 0, Math.max(0, a.h - h)) }
}
const full = (a: Area): Geo => ({ x: 0, y: 0, w: a.w, h: a.h })
const half = (side: 'l' | 'r', a: Area): Geo => {
  const w = Math.round(a.w / 2)
  return { x: side === 'l' ? 0 : a.w - w, y: 0, w, h: a.h }
}

const top = (wins: WinState[]) =>
  wins.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null

function reducer(s: State, a: Action): State {
  const upd = (id: string, f: (w: WinState) => WinState) =>
    s.wins.map((w) => (w.id === id ? f(w) : w))
  switch (a.t) {
    case 'open': {
      const found = s.wins.find((w) => w.id === a.id)
      const z = s.z + 1
      if (found) {
        return {
          z,
          wins: upd(a.id, (w) => ({
            ...w,
            props: { ...w.props, ...a.props },
            minimized: false,
            z,
          })),
        }
      }
      const idx = s.wins.filter((w) => !w.minimized).length
      const off = (idx % 8) * 24
      const w = Math.min(a.size.w, a.area.w - (a.mobile ? 0 : 16))
      const h = Math.min(a.size.h, a.area.h - (a.mobile ? 0 : 16))
      const geo = fit(
        {
          w,
          h,
          x: Math.round((a.area.w - w) / 2) - 40 + off,
          y: Math.round((a.area.h - h) / 2) - 30 + off,
        },
        a.area,
      )
      const win: WinState = {
        id: a.id,
        app: a.app,
        props: a.props,
        geo,
        prev: null,
        z,
        minimized: false,
        maximized: false,
        snap: null,
        geoTick: 0,
      }
      return { z, wins: [...s.wins, win] }
    }
    case 'close':
      return { ...s, wins: s.wins.filter((w) => w.id !== a.id) }
    case 'closeAll':
      return { ...s, wins: [] }
    case 'focus': {
      const cur = s.wins.find((w) => w.id === a.id)
      if (!cur) return s
      if (!cur.minimized && cur.z === s.z) return s
      const z = s.z + 1
      return { z, wins: upd(a.id, (w) => ({ ...w, minimized: false, z })) }
    }
    case 'min':
      return { ...s, wins: upd(a.id, (w) => ({ ...w, minimized: true })) }
    case 'minAll':
      return { ...s, wins: s.wins.map((w) => ({ ...w, minimized: true })) }
    case 'geo':
      return {
        ...s,
        wins: upd(a.id, (w) => ({ ...w, geo: a.geo, prev: null, maximized: false, snap: null })),
      }
    case 'snap':
      return {
        ...s,
        wins: upd(a.id, (w) => {
          const prev = w.maximized || w.snap ? w.prev : w.geo
          if (a.side === 'max')
            return {
              ...w,
              prev,
              geo: full(a.area),
              maximized: true,
              snap: null,
              geoTick: w.geoTick + 1,
            }
          return {
            ...w,
            prev,
            geo: half(a.side, a.area),
            maximized: false,
            snap: a.side,
            geoTick: w.geoTick + 1,
          }
        }),
      }
    case 'max':
      return {
        ...s,
        wins: upd(a.id, (w) => {
          if (w.maximized || w.snap) {
            return {
              ...w,
              geo: fit(w.prev ?? w.geo, a.area),
              prev: null,
              maximized: false,
              snap: null,
              geoTick: w.geoTick + 1,
            }
          }
          return { ...w, prev: w.geo, geo: full(a.area), maximized: true, geoTick: w.geoTick + 1 }
        }),
      }
    case 'clamp':
      return {
        ...s,
        wins: s.wins.map((w) => {
          const geo = w.maximized
            ? full(a.area)
            : w.snap
              ? half(w.snap, a.area)
              : fit(w.geo, a.area)
          const same =
            geo.x === w.geo.x && geo.y === w.geo.y && geo.w === w.geo.w && geo.h === w.geo.h
          return same ? w : { ...w, geo, geoTick: w.geoTick + 1 }
        }),
      }
    case 'cascade': {
      let i = 0
      return {
        ...s,
        wins: s.wins.map((w) => {
          if (w.minimized) return w
          const off = (i++ % 8) * 24
          const g = fit({ ...(w.prev ?? w.geo), x: 24 + off, y: 16 + off }, a.area)
          return { ...w, geo: g, prev: null, maximized: false, snap: null, geoTick: w.geoTick + 1 }
        }),
      }
    }
  }
}

type OS = {
  data: SiteData
  wins: WinState[]
  activeId: string | null
  mobile: boolean
  reduced: boolean
  area: Area
  settings: Settings
  setSettings: (p: Partial<Settings>) => void
  open: (app: AppId, props?: WinProps) => void
  close: (id: string) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMax: (id: string) => void
  setGeo: (id: string, g: Geo) => void
  snap: (id: string, side: 'l' | 'r' | 'max') => void
  closeAll: () => void
  showDesktop: () => void
  cascade: () => void
  cycle: () => void
  /** Run once when the boot sequence ends: restores deep links or opens the welcome window. */
  start: () => void
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  confetti: number
  fireConfetti: () => void
  shutdown: () => void
  endShutdown: () => void
  shuttingDown: boolean
  busy: boolean
  plain: () => void
  external: (url: string) => void
}

const Ctx = createContext<OS | null>(null)
export const useOS = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useOS outside OSProvider')
  return v
}

const WINS_KEY = 'funkyos.wins.v1'
const SETTINGS_KEY = 'funkyos.settings.v1'

function initState(): State {
  const raw = safeParse<State | null>(store.get('session', WINS_KEY), null)
  if (!raw || !Array.isArray(raw.wins)) return { wins: [], z: 10 }
  // Browser windows are not restored: a reload would start several full old sites (one is WebGL) at once.
  const wins = raw.wins.filter(
    (w) => w && Object.hasOwn(META, w.app) && w.app !== 'browser' && w.geo,
  )
  return { wins, z: Math.max(10, ...wins.map((w) => w.z || 0)) }
}

function initSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...safeParse<Partial<Settings>>(store.get('local', SETTINGS_KEY), {}),
  }
}

export function OSProvider({
  data,
  mobile,
  children,
}: {
  data: SiteData
  mobile: boolean
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [settings, setSettingsState] = useState<Settings>(initSettings)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confetti, setConfetti] = useState(0)
  const [shuttingDown, setShuttingDown] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyT = useRef<ReturnType<typeof setTimeout>>(undefined)
  const sysReduced = useReducedMotion()
  const reduced = Boolean(sysReduced) || settings.reduceMotion

  const [vp, setVp] = useState<Area>(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setVp({ w: window.innerWidth, h: window.innerHeight }))
    }
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  const area = useMemo<Area>(
    () =>
      mobile ? { w: vp.w, h: vp.h } : { w: vp.w, h: Math.max(240, vp.h - MENU_H - DOCK_RESERVE) },
    [vp.w, vp.h, mobile],
  )
  const areaRef = useRef(area)
  areaRef.current = area

  useEffect(() => {
    dispatch({ t: 'clamp', area })
  }, [area])

  useEffect(() => {
    store.set('session', WINS_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    store.set('local', SETTINGS_KEY, JSON.stringify(settings))
    setSoundEnabled(settings.sound)
  }, [settings])

  const stateRef = useRef(state)
  stateRef.current = state
  const activeId = useMemo(() => top(state.wins), [state.wins])
  const returnFocus = (app: AppId) => {
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-dock-app="${app}"]`) ??
        document.querySelector<HTMLElement>(`[data-home-app="${app}"]`) ??
        document.querySelector<HTMLElement>(`[data-icon-app="${app}"]`)
      el?.focus({ preventScroll: true })
    })
  }

  const open = useCallback(
    (app: AppId, props: WinProps = {}) => {
      // A browser window needs a version. Without one, show the Old Versions folder.
      if (app === 'browser' && !isVersionKey(props.v)) {
        app = 'files'
        props = { path: 'versions' }
      }
      const m = META[app]
      sfx.click()
      setBusy(true)
      clearTimeout(busyT.current)
      busyT.current = setTimeout(() => setBusy(false), 300)
      dispatch({
        t: 'open',
        id: idFor(app, props),
        app,
        props,
        size: { w: m.w, h: m.h },
        area: areaRef.current,
        mobile,
      })
    },
    [mobile],
  )
  const close = useCallback((id: string) => {
    const w = stateRef.current.wins.find((x) => x.id === id)
    sfx.click()
    dispatch({ t: 'close', id })
    if (w) returnFocus(w.app)
  }, [])
  const focus = useCallback((id: string) => dispatch({ t: 'focus', id }), [])
  const minimize = useCallback((id: string) => {
    sfx.click()
    dispatch({ t: 'min', id })
  }, [])
  const toggleMax = useCallback((id: string) => {
    sfx.click()
    dispatch({ t: 'max', id, area: areaRef.current })
  }, [])
  const setGeo = useCallback((id: string, geo: Geo) => dispatch({ t: 'geo', id, geo }), [])
  const snap = useCallback(
    (id: string, side: 'l' | 'r' | 'max') =>
      dispatch({ t: 'snap', id, side, area: areaRef.current }),
    [],
  )
  const closeAll = useCallback(() => dispatch({ t: 'closeAll' }), [])
  const showDesktop = useCallback(() => dispatch({ t: 'minAll' }), [])
  const cascade = useCallback(() => dispatch({ t: 'cascade', area: areaRef.current }), [])
  const cycle = useCallback(() => {
    const live = stateRef.current.wins.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)
    if (live.length > 1) dispatch({ t: 'focus', id: live[live.length - 1].id })
  }, [])

  const setSettings = useCallback(
    (p: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...p })),
    [],
  )
  const external = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])
  const fireConfetti = useCallback(() => setConfetti((n) => n + 1), [])
  const plain = useCallback(() => {
    history.pushState(null, '', '/os?plain=1')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])
  const shutdown = useCallback(() => setShuttingDown(true), [])
  const endShutdown = useCallback(() => {
    setShuttingDown(false)
    dispatch({ t: 'closeAll' })
  }, [])

  const started = useRef(false)
  const start = useCallback(() => {
    if (started.current) return
    started.current = true
    const q = new URLSearchParams(window.location.search)
    const app = q.get('app')
    const hash = window.location.hash
    const slug = hash.startsWith('#project-') ? decodeURIComponent(hash.slice(9)) : ''
    const openApp = (a: AppId, p: WinProps = {}) =>
      dispatch({
        t: 'open',
        id: idFor(a, p),
        app: a,
        props: p,
        size: { w: META[a].w, h: META[a].h },
        area: areaRef.current,
        mobile,
      })
    if (app && Object.hasOwn(META, app)) {
      const path = q.get('path') || ''
      const [section, item] = path.split('/')
      if (app === 'files') {
        openApp('files', { path: section || 'projects' })
        if (item && section === 'projects') openApp('preview', { slug: item })
      } else if (app === 'browser') {
        const v = q.get('v') ?? ''
        if (isVersionKey(v)) openApp('browser', { v })
        else openApp('files', { path: 'versions' })
      } else openApp(app as AppId, q.get('slug') ? { slug: q.get('slug')! } : {})
    } else if (slug) {
      openApp('preview', { slug })
    } else if (stateRef.current.wins.length === 0 && !mobile) {
      openApp('about')
    }
  }, [mobile])

  // Deep link the focused case study as #project-<slug>.
  useEffect(() => {
    if (!started.current) return // keep a #project-<slug> from the URL until boot has read it
    const act = state.wins.find((w) => w.id === activeId)
    const wanted = act?.app === 'preview' && act.props.slug ? `#project-${act.props.slug}` : ''
    if (wanted && window.location.hash !== wanted) history.replaceState(null, '', wanted)
    else if (!wanted && window.location.hash.startsWith('#project-')) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [activeId, state.wins])

  const value = useMemo<OS>(
    () => ({
      data,
      wins: state.wins,
      activeId,
      mobile,
      reduced,
      area,
      settings,
      setSettings,
      open,
      close,
      focus,
      minimize,
      toggleMax,
      setGeo,
      snap,
      closeAll,
      showDesktop,
      cascade,
      cycle,
      start,
      paletteOpen,
      setPaletteOpen,
      confetti,
      fireConfetti,
      shutdown,
      endShutdown,
      shuttingDown,
      busy,
      plain,
      external,
    }),
    [
      data,
      state.wins,
      activeId,
      mobile,
      reduced,
      area,
      settings,
      setSettings,
      open,
      close,
      focus,
      minimize,
      toggleMax,
      setGeo,
      snap,
      closeAll,
      showDesktop,
      cascade,
      cycle,
      start,
      paletteOpen,
      confetti,
      fireConfetti,
      shutdown,
      endShutdown,
      shuttingDown,
      busy,
      plain,
      external,
    ],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
