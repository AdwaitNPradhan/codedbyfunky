import { useEffect, useState, useSyncExternalStore } from 'react'

/** Cookie-less, network-less analytics hook: apps can listen for `funky:track` on window. */
export function track(event: string, props: Record<string, unknown> = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent('funky:track', { detail: { event, variant: 'arcade', ...props } }),
    )
  } catch {}
}

function useMedia(query: string, server = false) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => server,
  )
}

export const useReduced = () => useMedia('(prefers-reduced-motion: reduce)')
export const useCoarse = () => useMedia('(pointer: coarse)')
export const useFine = () => useMedia('(hover: hover) and (pointer: fine)')
export const useDesktop = () => useMedia('(min-width: 900px)', true)

/** Seeded PRNG so server and client render the same scatter before any user action. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ')

/** Intro gate: hero cards wait for the PRESS START veil to finish before they are thrown in. */
let introDone = false
const introCbs = new Set<() => void>()
export const isIntroDone = () => introDone
export function markIntroDone() {
  introDone = true
  introCbs.forEach((f) => f())
  introCbs.clear()
}
export function whenIntroDone(cb: () => void) {
  if (introDone) {
    cb()
    return () => {}
  }
  introCbs.add(cb)
  return () => introCbs.delete(cb)
}

export function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

export function fmtMonth(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Palette token cycle for slabs/cards (names of CSS vars). */
export const TONES = ['pink', 'yellow', 'blue', 'mint', 'orange', 'lilac'] as const
export type Tone = (typeof TONES)[number]
export const toneAt = (i: number): Tone => TONES[((i % TONES.length) + TONES.length) % TONES.length]
