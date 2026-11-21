'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SiteData } from '@/lib/types'
import { sfx } from '../sound'
import styles from '../os.module.css'

type Mode = 'full' | 'mobile' | 'quick' | 'reduced'

/** Timeline in ms: when each log line starts, when the logo shows, when the desktop is revealed, when we unmount. */
const PLAN: Record<
  Mode,
  { lineAt: number; lineGap: number; logoAt: number; revealAt: number; doneAt: number }
> = {
  full: { lineAt: 120, lineGap: 120, logoAt: 1100, revealAt: 2500, doneAt: 3200 },
  mobile: { lineAt: 60, lineGap: 70, logoAt: 480, revealAt: 1000, doneAt: 1400 },
  quick: { lineAt: 0, lineGap: 0, logoAt: 0, revealAt: 300, doneAt: 600 },
  reduced: { lineAt: 0, lineGap: 0, logoAt: 0, revealAt: 0, doneAt: 300 },
}

export function Boot({
  data,
  mode,
  onReveal,
  onDone,
}: {
  data: SiteData
  mode: Mode
  onReveal: () => void
  onDone: () => void
}) {
  const plan = PLAN[mode]
  const [lines, setLines] = useState(0)
  const [logo, setLogo] = useState(mode === 'quick' || mode === 'reduced')
  const [out, setOut] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const revealed = useRef(false)
  const done = useRef(false)

  const log = [
    'FunkyOS BIOS v1.0',
    'checking memory… ok',
    `mounting portfolio.db… ok (${data.projects.length} projects, ${data.photos.length} photos, ${data.games.length} games)`,
    'loading next, react, payload… ok',
    'starting window manager… ok',
  ]

  const reveal = useCallback(() => {
    if (revealed.current) return
    revealed.current = true
    sfx.chime()
    onReveal()
  }, [onReveal])

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    timers.current.forEach(clearTimeout)
    setOut(true)
    timers.current = [setTimeout(onDone, mode === 'reduced' ? 300 : 400)]
  }, [onDone, mode])

  // Skip fast-forwards: reveal now, fade out.
  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout)
    reveal()
    finish()
  }, [reveal, finish])

  useEffect(() => {
    const t = timers.current
    const at = (ms: number, f: () => void) => t.push(setTimeout(f, ms))
    if (mode === 'full' || mode === 'mobile') {
      log.forEach((_, i) => at(plan.lineAt + i * plan.lineGap, () => setLines(i + 1)))
      at(plan.logoAt, () => setLogo(true))
    }
    at(plan.revealAt, reveal)
    at(plan.revealAt, finish)
    return () => t.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const on = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.key === 'Tab' || e.metaKey || e.ctrlKey || e.altKey))
        return
      skip()
    }
    window.addEventListener('keydown', on)
    window.addEventListener('pointerdown', on)
    return () => {
      window.removeEventListener('keydown', on)
      window.removeEventListener('pointerdown', on)
    }
  }, [skip])

  return (
    <div
      className={`${styles.boot} ${out ? styles.bootOut : ''}`}
      role="status"
      aria-label="FunkyOS is starting"
      data-os-splash
    >
      {!logo && (
        <p className={styles.bootLines} aria-hidden="true">
          {log.slice(0, lines).map((l) => (
            <span key={l}>{l}</span>
          ))}
          <span>
            <i className={styles.bootCursor} />
          </span>
        </p>
      )}
      {logo && (
        <div className={styles.bootLogoWrap} aria-hidden="true">
          <p className={styles.bootLogo}>
            Funky<b>OS</b>
          </p>
          <div className={styles.bootBar}>
            <i
              style={{
                animationDuration:
                  mode === 'quick' ? '0.3s' : mode === 'mobile' ? '0.5s' : undefined,
              }}
            />
          </div>
        </div>
      )}
      <button type="button" className={styles.skip} onClick={skip}>
        Skip intro
      </button>
    </div>
  )
}
