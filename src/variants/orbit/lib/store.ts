import { createContext, useContext } from 'react'
import type { SiteData } from '@/lib/types'
import { N_STATIONS } from './config'

export type ItemKind = 'project' | 'photo' | 'game' | 'hw'

/** Mutable bag read every frame by three.js. Never put React state in here. */
export type Store = {
  /** smoothed scroll in px */
  s: number
  /** px / s */
  vel: number
  /** camera path parameter (control-point index space) */
  u: number
  /** float station position (visibility, fog tint) */
  pos: number
  /** active station (int) */
  station: number
  /** dwell progress 0..1 per station (clamped) */
  local: number[]
  /** 1 → 0 dolly-in at load */
  intro: number
  /** performance.now() of the last contact success */
  pulse: number
  /** active item index per kind */
  idx: Record<ItemKind, number>
  /** key hovered in DOM (e.g. "project:2") so 3D mirrors it */
  hover: string | null
  skillGroup: string | null
  expHover: number
  /** pointer in -1..1 */
  mouse: { x: number; y: number }
  /** highest station whose assets may load */
  reach: number
  /** set by the cursor component */
  cursor: (label: string | null) => void
}

export function createStore(): Store {
  return {
    s: 0,
    vel: 0,
    u: 0,
    pos: 0,
    station: 0,
    local: Array.from({ length: N_STATIONS }, () => 0),
    intro: 1,
    pulse: -1e9,
    idx: { project: 0, photo: 0, game: 0, hw: 0 },
    hover: null,
    skillGroup: null,
    expHover: -1,
    mouse: { x: 0, y: 0 },
    reach: 1,
    cursor: () => {},
  }
}

export type OrbitApi = {
  toStation: (i: number, opts?: { immediate?: boolean }) => void
  toItem: (kind: ItemKind, i: number) => void
  openProject: (slug: string) => void
  openPhoto: (i: number) => void
  /** select a game, then start it */
  playGame: (i: number) => void
  registerGameStart: (id: string, start: (() => void) | null) => void
  /** true once when a play request was queued for this game before its embed mounted */
  consumePlay: (id: string) => boolean
  gameStarted: (id: string) => void
  exitGame: () => void
  setSkillGroup: (g: string | null) => void
  hoverKey: (k: string | null) => void
  /** Plain view: lists every item, no 3D */
  showAll: () => void
}

export type OrbitCtx = {
  data: SiteData
  store: Store
  api: OrbitApi
  /** flight (3D scroll) vs plain stacked page */
  flight: boolean
  mobile: boolean
  station: number
  idx: Record<ItemKind, number>
  skillGroup: string | null
  /** id of the game currently being played (scroll is locked) */
  playing: string | null
  /** bumps when a game is exited so its embed remounts to the poster */
  gameReset: number
}

export const Ctx = createContext<OrbitCtx | null>(null)
export function useOrbit() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOrbit outside provider')
  return c
}
