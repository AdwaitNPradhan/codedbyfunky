'use client'

import s from '../orbit.module.css'

/**
 * Cover shown while the first 3D frame loads. It is CSS-timed as a fallback (see .veil), so if JS never runs the
 * server-rendered text appears anyway after a moment.
 */
export function Veil({ state, name, fast, onSkip }: { state: 'show' | 'lift' | 'gone'; name: string; fast: boolean; onSkip: () => void }) {
  if (state === 'gone') return null
  return (
    <div className={s.veil} data-state={state} data-fast={fast ? 'true' : undefined}>
      <div className={s.veilMark} aria-hidden="true">
        <svg viewBox="0 0 100 100" className={s.veilRing}>
          <circle cx="50" cy="50" r="46" />
        </svg>
        <span>{name}</span>
      </div>
      <button type="button" className={s.skip} onClick={onSkip}>
        Skip intro
      </button>
    </div>
  )
}
