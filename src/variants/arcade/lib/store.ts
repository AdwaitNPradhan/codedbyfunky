import { useSyncExternalStore } from 'react'

/**
 * Tiny external store: coins, achievements, toasts, sound, toy mode, palette.
 * Components call the exported actions imperatively (no context re-renders);
 * only HUD-like components subscribe through `useArcade`.
 */

export type ToyMode = 'pointer' | 'stamper' | 'gravity'
export type Toast = { id: number; title: string; desc: string }
export type Achievement = {
  id: string
  title: string
  desc: string
  coins: number
  secret?: boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'insert-coin', title: 'INSERT COIN', desc: 'Start any game on the wall.', coins: 5 },
  { id: 'high-score', title: 'HIGH SCORE', desc: 'Hit the score target in a game.', coins: 15 },
  { id: 'explorer', title: 'FULL TOUR', desc: 'Visit every section of the page.', coins: 10 },
  { id: 'card-shark', title: 'CARD SHARK', desc: 'Drag 5 cards or stickers around.', coins: 5 },
  { id: 'case-closed', title: 'CASE CLOSED', desc: 'Open a project case study.', coins: 5 },
  { id: 'tidy-up', title: 'TIDY MIND', desc: 'Tidy up the project pile.', coins: 3 },
  { id: 'shuffler', title: 'SHUFFLER', desc: 'Shuffle the project pile.', coins: 3 },
  { id: 'photo-flip', title: 'DARKROOM REGULAR', desc: 'Flip 3 polaroids.', coins: 5 },
  { id: 'copy-cat', title: 'COPY CAT', desc: 'Copy the email address.', coins: 5 },
  { id: 'loud', title: 'TURN IT UP', desc: 'Switch the sound on.', coins: 3 },
  { id: 'sticker-bomb', title: 'STICKER BOMB', desc: 'Stamp 10 stickers (desktop toy).', coins: 5 },
  { id: 'toy-tester', title: 'TOY TESTER', desc: 'Try all three cursor toys (desktop).', coins: 5 },
  {
    id: 'cheat-code',
    title: 'CHEAT CODE',
    desc: 'Some old habits die hard.',
    coins: 20,
    secret: true,
  },
]

type State = {
  coins: number
  coinPulse: number
  unlocked: string[]
  visited: string[]
  counters: Record<string, number>
  sound: boolean
  toy: ToyMode
  nativeCursor: boolean
  hue: boolean
  toasts: Toast[]
  hired: boolean
}

const initial: State = {
  coins: 0,
  coinPulse: 0,
  unlocked: [],
  visited: [],
  counters: {},
  sound: false,
  toy: 'pointer',
  nativeCursor: false,
  hue: false,
  toasts: [],
  hired: false,
}

let state: State = initial
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  emit()
}

export const getState = () => state

const KEY = 'funky:arcade:save'
function persist() {
  try {
    const { coins, unlocked, visited, counters, sound, hired } = state
    localStorage.setItem(KEY, JSON.stringify({ coins, unlocked, visited, counters, sound, hired }))
  } catch {}
}

export function hydrate() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    set({
      coins: Number(s.coins) || 0,
      unlocked: Array.isArray(s.unlocked) ? s.unlocked : [],
      visited: Array.isArray(s.visited) ? s.visited : [],
      counters: s.counters && typeof s.counters === 'object' ? s.counters : {},
      sound: Boolean(s.sound),
      hired: Boolean(s.hired),
    })
  } catch {}
}

export function addCoins(n: number) {
  set({ coins: state.coins + n, coinPulse: state.coinPulse + 1 })
  persist()
}

let toastId = 0
export function toast(title: string, desc: string, ms = 3800) {
  const id = ++toastId
  set({ toasts: [...state.toasts.slice(-2), { id, title, desc }] })
  setTimeout(() => dismissToast(id), ms)
}
export const dismissToast = (id: number) => set({ toasts: state.toasts.filter((t) => t.id !== id) })

/** Unlock an achievement once. Returns true when newly unlocked. */
export function award(id: string): boolean {
  if (state.unlocked.includes(id)) return false
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  if (!a) return false
  set({
    unlocked: [...state.unlocked, id],
    coins: state.coins + a.coins,
    coinPulse: state.coinPulse + 1,
  })
  persist()
  toast(`ACHIEVEMENT: ${a.title}`, `${a.desc} +${a.coins} coins`)
  coinListeners.forEach((f) => f('achievement'))
  return true
}

/** Increment a persistent counter; returns the new value. */
export function bump(counter: string, by = 1): number {
  const n = (state.counters[counter] ?? 0) + by
  set({ counters: { ...state.counters, [counter]: n } })
  persist()
  return n
}

export function visit(sectionId: string) {
  if (state.visited.includes(sectionId)) return
  const visited = [...state.visited, sectionId]
  set({ visited, coins: state.coins + 1, coinPulse: state.coinPulse + 1 })
  persist()
}

export const setSound = (sound: boolean) => {
  set({ sound })
  persist()
  if (sound) award('loud')
}
export const setToy = (toy: ToyMode) => set({ toy })
export const setNativeCursor = (nativeCursor: boolean) => set({ nativeCursor })
export const setHue = (hue: boolean) => set({ hue })
export const setHired = () => {
  if (state.hired) return
  set({ hired: true })
  persist()
}

/** Sound hooks listen here to play a coin on achievements. */
const coinListeners = new Set<(kind: 'achievement') => void>()
export const onCoin = (f: (kind: 'achievement') => void) => {
  coinListeners.add(f)
  return () => {
    coinListeners.delete(f)
  }
}

/** Subscribe to a primitive/stable slice of the store. */
export function useArcade<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(initial),
  )
}
