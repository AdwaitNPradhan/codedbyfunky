'use client'

import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import type { GameKey } from '@/games/keys'
import { gameLoaders } from '@/games/registry'
import css from './GameEmbed.module.css'

type Props = {
  game: GameKey
  title: string
  /** Custom poster/cover UI shown before Play. Receives the start callback. */
  poster?: (start: () => void) => ReactNode
  className?: string
  style?: CSSProperties
  onScore?: (n: number) => void
  onGameOver?: (n: number) => void
  /** Skip the poster and load the game immediately. */
  autoStart?: boolean
}

/** Catches a failed chunk load (offline, deploy in between…) and offers a retry. */
class Boundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GameEmbed]', error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className={css.state} role="alert">
        <span>The game could not load.</span>
        <button
          type="button"
          className={css.retry}
          onClick={() => {
            this.setState({ failed: false })
            this.props.onRetry()
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}

const Loading = () => (
  <div className={css.state} role="status" aria-label="Loading game">
    <span className={css.dots}>
      <i />
      <i />
      <i />
    </span>
  </div>
)

/**
 * Lazy game host. Shows a poster until the visitor presses Play, then loads the game chunk.
 * Size it from the outside (width/height or aspect-ratio on className/style). Games fill 100% of it.
 */
export function GameEmbed({
  game,
  title,
  poster,
  className,
  style,
  onScore,
  onGameOver,
  autoStart,
}: Props) {
  const [started, setStarted] = useState(Boolean(autoStart))
  const [attempt, setAttempt] = useState(0)
  const [canFs, setCanFs] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  // `attempt` forces a fresh lazy() after a failed chunk load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const Game = useMemo(() => (started ? lazy(gameLoaders[game]) : null), [started, game, attempt])
  const prefetch = () => void gameLoaders[game]().catch(() => {})

  useEffect(() => {
    setCanFs(Boolean(document.fullscreenEnabled))
    const onFs = () => setIsFs(document.fullscreenElement === hostRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const start = useCallback(() => setStarted(true), [])
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void hostRef.current?.requestFullscreen?.().catch(() => {})
  }

  const hostStyle = {
    position: 'relative',
    overflow: 'hidden',
    ...style,
    ...(started && canFs ? { '--game-hud-inset': '44px' } : null),
  } as CSSProperties

  return (
    <div
      ref={hostRef}
      className={[css.host, className].filter(Boolean).join(' ')}
      style={hostStyle}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      role="region"
      aria-label={`${title} — mini game`}
    >
      {Game ? (
        <>
          <Boundary onRetry={() => setAttempt((a) => a + 1)}>
            <Suspense fallback={<Loading />}>
              <Game autoFocus onScore={onScore} onGameOver={onGameOver} />
            </Suspense>
          </Boundary>
          {canFs && (
            <button
              type="button"
              onClick={fullscreen}
              aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen'}
              className={css.iconBtn}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {isFs ? (
                  <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                ) : (
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                )}
              </svg>
            </button>
          )}
        </>
      ) : poster ? (
        poster(start)
      ) : (
        <button type="button" className={css.poster} onClick={start} aria-label={`Play ${title}`}>
          <span className={css.play}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
            </svg>
          </span>
          <span className={css.posterTitle}>{title}</span>
          <span className={css.posterHint}>Press to play</span>
        </button>
      )}
    </div>
  )
}
