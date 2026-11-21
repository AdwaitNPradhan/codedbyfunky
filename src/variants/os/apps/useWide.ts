'use client'

import { useEffect, useRef, useState } from 'react'

/** True while the element is at least `min` px wide. Used to pick list+detail or one pane. */
export function useWide<T extends HTMLElement>(min: number) {
  const ref = useRef<T>(null)
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const on = () => setWide(el.clientWidth >= min)
    on()
    const ro = new ResizeObserver(on)
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return [ref, wide] as const
}
