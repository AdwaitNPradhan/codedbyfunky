'use client'

import type { CSSProperties } from 'react'
import { GameEmbed } from '@/components/games/GameEmbed'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty } from './common'
import ui from './apps.module.css'

export default function GameWindow({ props, hidden }: AppProps) {
  const os = useOS()
  const g = os.data.games.find((x) => x.slug === props.slug)
  if (!g) return <Empty>That game is no longer in the CMS.</Empty>
  const vars = {
    '--game-bg': '#0b0f0c',
    '--game-fg': '#ece7da',
    '--game-accent': g.accent ?? '#ff6b35',
    '--game-accent-2': '#ffd166',
    '--game-muted': '#8f8a78',
  } as CSSProperties
  return (
    <div className={ui.gameWin} style={vars}>
      <div className={ui.gameBar}>
        <span>{g.controls || g.tagline}</span>
        <a className={ui.miniLink} href={`/games/${g.slug}`} target="_blank" rel="noopener noreferrer">
          Open full screen ↗
        </a>
      </div>
      <div className={ui.gameFrameWrap}>
        {/* A minimised window drops its game, which stops the loop. Restoring shows the Play poster again. */}
        {hidden ? null : (
          <GameEmbed
            game={g.component}
            title={g.title}
            style={{ position: 'absolute', inset: 0 }}
            poster={(start) => (
              <button type="button" className={ui.poster} onClick={start}>
                {g.cover && <Pic img={g.cover} size="card" sizes="720px" alt="" />}
                <span className={ui.posterShade} />
                <span className={ui.posterText}>
                  <strong>{g.title}</strong>
                  <span>{g.tagline}</span>
                  <span className={ui.posterBtn}>▶ Play</span>
                </span>
              </button>
            )}
          />
        )}
      </div>
    </div>
  )
}
