'use client'

import type { CSSProperties } from 'react'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty } from './common'
import ui from './apps.module.css'

/** Library: pick a game, it opens in its own window. */
export default function Games(_: AppProps) {
  const os = useOS()
  const games = os.data.games
  if (games.length === 0) return <Empty>No games in the CMS yet.</Empty>
  return (
    <div className={`${ui.scroll} ${ui.library}`}>
      <p className={ui.libIntro}>Small browser games I built. Each one opens in its own window.</p>
      <ul className={ui.gameGrid}>
        {games.map((g) => (
          <li key={g.id} className={ui.gameCard} style={{ '--ga': g.accent ?? 'var(--accent)' } as CSSProperties}>
            <button type="button" className={ui.gameCover} onClick={() => os.open('game', { slug: g.slug })} aria-label={`Play ${g.title}`}>
              {g.cover ? <Pic img={g.cover} size="card" sizes="(max-width: 700px) 50vw, 240px" alt="" /> : null}
              <span className={ui.playTag}>▶ Play</span>
            </button>
            <div className={ui.gameInfo}>
              <h3>{g.title}</h3>
              <p>{g.tagline}</p>
              {g.controls && <p className={ui.dim}>{g.controls}</p>}
              <a className={ui.miniLink} href={`/games/${g.slug}`} target="_blank" rel="noopener noreferrer">
                Open full screen ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
