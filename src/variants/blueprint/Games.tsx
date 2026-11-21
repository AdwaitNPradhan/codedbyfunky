'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GameEmbed } from '@/components/games/GameEmbed'
import { gsap, ScrollTrigger } from './gsap'
import { useBP, useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { Duotone } from './Duotone'
import { pad2 } from './util'
import type { Game } from '@/lib/types'
import s from './sections.module.css'
import b from './base.module.css'

function Test({ g, n, open, onToggle }: { g: Game; n: number; open: boolean; onToggle: () => void }) {
  const { reduced } = useBP()
  const stamp = useRef<HTMLSpanElement>(null)
  const li = useRef<HTMLLIElement>(null)
  const panel = `test-${g.slug}`

  // the PASS stamp slams down once, as the row enters
  useEffect(() => {
    const el = stamp.current
    const row = li.current
    if (!el || !row || reduced !== false) return
    gsap.set(el, { opacity: 0, scale: 1.6 })
    const st = ScrollTrigger.create({
      trigger: row,
      start: 'top 88%',
      end: 'max',
      once: true,
      onEnter: () => void gsap.to(el, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' }),
    })
    return () => st.kill()
  }, [reduced])

  return (
    <li ref={li} className={s.test} data-open={open ? '1' : undefined} data-reveal>
      <h3>
        <button type="button" className={s.testHead} aria-expanded={open} aria-controls={panel} onClick={onToggle}>
          <span className={`${s.testNo} ${b.mono}`}>TEST {pad2(n)}:</span>
          <span className={s.testName}>{g.title}</span>
          <span className={s.testTag}>{g.tagline}</span>
          <span ref={stamp} className={s.stamp} aria-label="Passed">
            PASS
          </span>
          <svg className={s.chev} viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
            <path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </h3>
      {open && (
        <div id={panel} className={s.testPanel}>
          <GameEmbed
            game={g.component}
            title={g.title}
            className={s.gameFrame}
            poster={(start) => (
              <button type="button" className={s.poster} onClick={start}>
                {g.cover && (
                  <span className={s.posterImg} aria-hidden="true">
                    <Duotone img={g.cover} alt="" sizes="(max-width: 900px) 90vw, 640px" />
                  </span>
                )}
                <span className={s.posterBody}>
                  <span className={s.playIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path d="M7 4.5L19 12L7 19.5Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span className={s.posterTitle}>Play {g.title}</span>
                  {g.controls && <span className={s.posterCtl}>INPUT: {g.controls}</span>}
                </span>
              </button>
            )}
          />
          <div className={s.testMeta}>
            {g.description && <p>{g.description}</p>}
            {g.controls && (
              <p className={b.mono}>
                INPUT: {g.controls}
              </p>
            )}
            <Link className={b.textLink} href={`/games/${g.slug}`}>
              Open full screen
              <svg viewBox="0 0 16 8" width="16" height="8" aria-hidden="true">
                <path d="M0 4H15M11 0.5L15 4L11 7.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </li>
  )
}

/** Sheet 06: the shared mini-games, filed as a test report. */
export function Games({ games }: { games: Game[] }) {
  const sh = useSheet('sheet-tests')
  const sorted = useMemo(() => [...games.filter((g) => g.featured), ...games.filter((g) => !g.featured)], [games])
  const [open, setOpen] = useState<string | null>(sorted[0]?.id ?? null)
  if (!games.length) return null
  return (
    <section id="sheet-tests" data-sheet className={`${s.sheet} ${s.testsSheet}`} aria-labelledby="h-tests">
      <div className={s.wrap}>
        <SheetHead id="h-tests" part={sh.part} tag="TEST REPORT" title="Games" />
        <ol className={s.tests}>
          {sorted.map((g, i) => (
            <Test key={g.id} g={g} n={i + 1} open={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)} />
          ))}
        </ol>
      </div>
    </section>
  )
}
