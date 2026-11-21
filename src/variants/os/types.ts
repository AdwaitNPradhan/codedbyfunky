export type AppId =
  | 'about'
  | 'files'
  | 'preview'
  | 'photos'
  | 'games'
  | 'game'
  | 'lab'
  | 'skills'
  | 'terminal'
  | 'mail'
  | 'resume'
  | 'settings'
  | 'browser'

export type Geo = { x: number; y: number; w: number; h: number }
export type WinProps = Record<string, string>

export type WinState = {
  /** `app` or `app:key` for multi-instance apps (preview, game). */
  id: string
  app: AppId
  props: WinProps
  geo: Geo
  /** Geometry before maximise / snap, restored on un-maximise or drag-out. */
  prev: Geo | null
  z: number
  minimized: boolean
  maximized: boolean
  snap: 'l' | 'r' | null
  /** Bumped when geometry is changed by the system (not by the user dragging). */
  geoTick: number
}

export type Wall = 'teal' | 'ember' | 'slate'
export type Accent = 'orange' | 'sun' | 'mint' | 'rose'

export type Settings = {
  wall: Wall
  accent: Accent
  reduceMotion: boolean
  sound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  wall: 'teal',
  accent: 'orange',
  reduceMotion: false,
  sound: false,
}
export const WALLS: Wall[] = ['teal', 'ember', 'slate']
export const ACCENTS: Accent[] = ['orange', 'sun', 'mint', 'rose']

/** Props every app component receives. Data and OS actions come from `useOS()`. */
export type AppProps = {
  id: string
  props: WinProps
  /** True when the window is focused (or the sheet is on top on mobile). */
  active: boolean
  /** True when the window is minimised or hidden behind another sheet. Pause loops. */
  hidden: boolean
}
