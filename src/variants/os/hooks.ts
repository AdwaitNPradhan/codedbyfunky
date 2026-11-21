'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

const noop = () => () => {}
/** False on the server and during hydration, true afterwards. Avoids hydration mismatches. */
export const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

export function useMedia(query: string, server = false) {
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

/** True when this page runs inside an iframe (for example inside a FunkyOS browser window). */
export const useFramed = () =>
  useSyncExternalStore(
    noop,
    () => {
      try {
        return window.self !== window.top
      } catch {
        return true
      }
    },
    () => false,
  )

/** `/os?plain=1` shows the content as a normal page. */
export const usePlainParam = () =>
  useSyncExternalStore(
    (cb) => {
      window.addEventListener('popstate', cb)
      return () => window.removeEventListener('popstate', cb)
    },
    () => new URLSearchParams(window.location.search).get('plain') === '1',
    () => false,
  )

/** Clock string that only exists on the client. Updates every 10 seconds. */
export function useClock(opts: Intl.DateTimeFormatOptions) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])
  return now ? now.toLocaleString('en-GB', opts) : ''
}

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }

/** A weak device or a data-saver connection. 3D is simplified or off there. */
export function isLowPower() {
  const n = navigator as Nav
  return (
    Boolean(n.connection?.saveData) ||
    (n.hardwareConcurrency ?? 4) < 4 ||
    (n.deviceMemory ?? 8) < 4
  )
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(gl)
  } catch {
    return false
  }
}

/** The 3D wallpaper runs only on a desktop with a mouse, a decent device and WebGL. */
export function canRunWallpaper3D() {
  return (
    !isLowPower() && window.matchMedia('(hover: hover) and (pointer: fine)').matches && hasWebGL()
  )
}
