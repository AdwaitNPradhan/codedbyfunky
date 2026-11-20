'use client'

import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { GameKey } from '@/games/keys'
import { gameLoaders } from '@/games/registry'

type Props = {
  game: GameKey
  title: string
  /** Custom poster/cover UI shown before Play. Receives the start callback. */
  poster?: (start: () => void) => ReactNode
  className?: string
  style?: CSSProperties
  onScore?: (n: number) => void
  onGameOver?: (n: number) => void
}

/**
 * Lazy game host. Shows a poster until the visitor presses Play, then loads the game chunk.
 * Size it from the outside (width/height or aspect-ratio on className/style). Games fill 100% of it.
 */
export function GameEmbed({ game, title, poster, className, style, onScore, onGameOver }: Props) {
  const [started, setStarted] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const Game = useMemo(() => (started ? lazy(gameLoaders[game]) : null), [started, game])
  const prefetch = () => void gameLoaders[game]()

  const start = () => setStarted(true)
  const fullscreen = () => hostRef.current?.requestFullscreen?.().catch(() => {})

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      aria-label={`${title} — mini game`}
    >
      {Game ? (
        <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Loading…</div>}>
          <Game autoFocus onScore={onScore} onGameOver={onGameOver} />
          <button
            type="button"
            onClick={fullscreen}
            aria-label="Fullscreen"
            style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, padding: '4px 8px', font: 'inherit', fontSize: 12, cursor: 'pointer', background: 'var(--game-bg, #000)', color: 'var(--game-fg, #fff)', border: '1px solid currentColor', borderRadius: 6, opacity: 0.8 }}
          >
            ⤢
          </button>
        </Suspense>
      ) : poster ? (
        poster(start)
      ) : (
        <button
          type="button"
          onClick={start}
          style={{ width: '100%', height: '100%', font: 'inherit', cursor: 'pointer', background: 'var(--game-bg, #111)', color: 'var(--game-fg, #fff)', border: 0 }}
        >
          ▶ Play {title}
        </button>
      )}
    </div>
  )
}
