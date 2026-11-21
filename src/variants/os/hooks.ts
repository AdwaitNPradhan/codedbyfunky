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
