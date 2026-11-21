'use client'

import { useOrbit, type ItemKind } from '../lib/store'
import { pad } from '../lib/util'
import { ArrowLeft, ArrowRight } from '../ui/bits'
import s from '../orbit.module.css'

/** Prev / next + counter. The touch-friendly twin of the 3D scrub (and the mobile replacement for the item list). */
export function Pager({ kind, count, className }: { kind: ItemKind; count: number; className?: string }) {
  const { api, idx } = useOrbit()
  if (count < 2) return null
  const i = idx[kind]
  const go = (n: number) => api.toItem(kind, Math.max(0, Math.min(count - 1, n)))
  return (
    <div className={className ? `${s.pager} ${className}` : s.pager} role="group" aria-label="Browse">
      <button type="button" className={s.pagerBtn} onClick={() => go(i - 1)} disabled={i <= 0} aria-label="Previous">
        <ArrowLeft />
      </button>
      <span className={s.pagerCount} aria-live="polite">
        {pad(i + 1)}/{pad(count)}
      </span>
      <button type="button" className={s.pagerBtn} onClick={() => go(i + 1)} disabled={i >= count - 1} aria-label="Next">
        <ArrowRight />
      </button>
    </div>
  )
}
