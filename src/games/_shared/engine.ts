import type { Theme } from './color'
import type { Fx } from './fx'
import type { SfxName } from './sfx'

export type UiState = 'ready' | 'playing' | 'paused' | 'over'

/** Pointer in the game's CSS-pixel space (origin top-left of the canvas). */
export type Pt = { x: number; y: number; id: number; type: string; down: boolean; cancel?: boolean }

/** Everything the shell gives a game. `w`, `h`, `theme`, `state` change over time — read them live, never cache. */
export type Env = {
  ctx: CanvasRenderingContext2D
  /** CSS px */
  w: number
  h: number
  dpr: number
  theme: Theme
  state: UiState
  /** prefers-reduced-motion */
  reduced: boolean
  /** Last pointer was a finger (or device is coarse-pointer). */
  coarse: boolean
  fx: Fx
  /** Seconds of un-paused time since mount. */
  time: number
  /** Best score before this run. */
  best: number
  /** Set the score shown in the HUD + fire onScore. */
  score: (n: number) => void
  /** End the run (ignored unless playing). Defaults to the current score. */
  gameOver: (n?: number) => void
  /** Screen shake in px (ignored under reduced motion). */
  shake: (px: number) => void
  sfx: (name: SfxName) => void
  /** Canvas font string in the container's font-family. */
  font: (px: number, weight?: number) => string
}

export interface Game {
  /** Called on mount (attract mode), and on every start / restart. Lay everything out from env.w/env.h. */
  reset(): void
  /** Container size or DPR changed — re-layout. */
  resize?(): void
  /** Called every frame except while paused — including 'ready' and 'over' so ambience / death effects can animate. Gameplay only when env.state === 'playing'. */
  update(dt: number): void
  render(): void
  pointerDown?(p: Pt): void
  pointerMove?(p: Pt): void
  pointerUp?(p: Pt): void
  /** Only called while playing. Return true to preventDefault. */
  key?(e: KeyboardEvent, down: boolean): boolean | void
  destroy?(): void
}

export type GameFactory = (env: Env) => Game

export type GameMeta = {
  /** storage key + identity */
  key: string
  title: string
  /** how-to-play rows: a key-cap chip + a short sentence */
  how: { k: string; t: string }[]
  /** short controls line shown under the Play button */
  controls: string
  /** touch-action for the canvas. 'pan-y' lets the page scroll vertically when a finger drags (tap games). 'none' captures all touch. */
  touch?: 'none' | 'pan-y'
  cursor?: string
  /** Keys that get preventDefault while the game is focused and playing. */
  keys?: string[]
  /** Typing game: disables the P / R shortcuts so letters reach the game. */
  typing?: boolean
}
