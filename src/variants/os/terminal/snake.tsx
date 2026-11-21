'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { loadBest, saveBest } from '@/games/_shared/storage'
import { sfx } from '../sound'
import ui from '../apps/apps.module.css'
import { at, COLS, newGame, OPP, ROWS, step, type Dir, type Game } from './snakeRules'

/* ───────── terminal UI ───────── */
const BEST_KEY = 'os-snake'
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  w: 'up',
  k: 'up',
  ArrowDown: 'down',
  s: 'down',
  j: 'down',
  ArrowLeft: 'left',
  a: 'left',
  h: 'left',
  ArrowRight: 'right',
  d: 'right',
  l: 'right',
}
const PAD: { dir: Dir; label: string; glyph: string }[] = [
  { dir: 'up', label: 'Up', glyph: '▲' },
  { dir: 'left', label: 'Left', glyph: '◀' },
  { dir: 'down', label: 'Down', glyph: '▼' },
  { dir: 'right', label: 'Right', glyph: '▶' },
]

type Cell = 'head' | 'body' | 'food' | 'empty'
// ASCII only: the site's mono font has no box or block glyphs, and a fallback font is wider.
// Snake cells are coloured spaces, so every cell is exactly 2ch wide.
const GLYPH: Record<Cell, string> = { head: '  ', body: '  ', food: '<>', empty: '  ' }
const CLS: Record<Cell, string | undefined> = { head: ui.snakeHead, body: ui.snakeBody, food: ui.tErr, empty: undefined }

/** One board row as runs of same-kind cells, so a frame is a few spans, not 216. */
function Row({ g, y }: { g: Game; y: number }) {
  const runs: ReactNode[] = []
  let kind: Cell | null = null
  let text = ''
  const flush = () => {
    if (kind) runs.push(<span key={runs.length} className={CLS[kind]}>{text}</span>)
  }
  for (let x = 0; x < COLS; x++) {
    const c: Cell =
      g.snake[0].x === x && g.snake[0].y === y ? 'head' : at(g.snake, x, y) ? 'body' : g.food.x === x && g.food.y === y ? 'food' : 'empty'
    if (c !== kind) {
      flush()
      kind = c
      text = ''
    }
    text += GLYPH[c]
  }
  flush()
  return (
    <>
      {runs}
      {'\n'}
    </>
  )
}

/** `snake` in the FunkyOS terminal: the board takes keyboard focus until you quit. */
export function Snake({ touch, onExit }: { touch: boolean; onExit: () => void }) {
  const [g, setG] = useState(newGame)
  const [paused, setPaused] = useState(false)
  const [quit, setQuit] = useState(false)
  const [best, setBest] = useState(() => loadBest(BEST_KEY))
  // Up to 2 turns typed inside one tick, so a fast "up, left" is not lost.
  const queue = useRef<Dir[]>([])
  const box = useRef<HTMLDivElement>(null)
  const live = !g.over && !paused && !quit

  useEffect(() => box.current?.focus({ preventScroll: true }), [])

  useEffect(() => {
    if (!live) return
    const t = setTimeout(
      () => {
        const n = step(g, queue.current.shift() ?? g.dir)
        if (n.score > g.score) sfx.click()
        if (n.over) {
          sfx.error()
          if (n.score > best) {
            saveBest(BEST_KEY, n.score)
            setBest(n.score)
          }
        }
        setG(n)
      },
      Math.max(65, 140 - g.score * 4),
    )
    return () => clearTimeout(t)
  }, [live, g, best])

  const turn = (dir: Dir) => {
    if (!live) return
    const last = queue.current.at(-1) ?? g.dir
    if (dir !== last && dir !== OPP[last] && queue.current.length < 2) queue.current.push(dir)
  }
  const restart = () => {
    queue.current = []
    setPaused(false)
    setG(newGame())
  }
  const exit = () => {
    setQuit(true)
    onExit()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (quit) return
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const dir = KEYS[k]
    if (dir) turn(dir)
    else if (k === ' ' || k === 'p') {
      if (!g.over) setPaused((p) => !p)
    } else if (k === 'q' || k === 'Escape' || (e.ctrlKey && k === 'c')) exit()
    else if ((k === 'r' || k === 'Enter') && g.over) restart()
    else return
    e.preventDefault()
    // Keep arrows and letters away from the desktop's own shortcuts.
    e.stopPropagation()
  }

  const status = quit
    ? `snake exited. Score ${g.score}.`
    : g.over
      ? `Game over. Score ${g.score}. Best ${Math.max(best, g.score)}.`
      : paused
        ? 'Paused.'
        : ''
  const hint = quit
    ? null
    : g.over
      ? touch
        ? 'tap Retry or Quit'
        : 'R retry · Q quit'
      : paused
        ? touch
          ? 'tap Resume'
          : 'space resumes · Q quit'
        : touch
          ? 'use the arrows'
          : 'arrows / WASD / hjkl move · space pause · Q quit'

  return (
    <div
      ref={box}
      className={ui.snake}
      tabIndex={quit ? -1 : 0}
      role="application"
      aria-roledescription="game"
      aria-label="Snake. Arrow keys move, space pauses, Q quits."
      onKeyDown={onKey}
      // Leaving the game (another window, the input) pauses it. Its own buttons do not.
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && live && setPaused(true)}
      // The terminal refocuses its input on any click; a click here belongs to the game.
      onPointerUp={(e) => e.stopPropagation()}
      data-quit={quit || undefined}
    >
      <div className={ui.snakeBar}>
        <span className={ui.tHead}>SNAKE</span> score {g.score} · best {Math.max(best, g.score)}
        {paused && !g.over && <span className={ui.tUser}> · paused</span>}
        {g.over && <span className={ui.tErr}> · game over</span>}
      </div>
      <pre className={ui.snakeBoard} aria-hidden="true">
        {Array.from({ length: ROWS }, (_, y) => (
          <Row key={y} g={g} y={y} />
        ))}
      </pre>
      {hint && <div className={ui.tDim}>{hint}</div>}
      {touch && !quit && (
        <div className={ui.snakePad} role="group" aria-label="Snake controls">
          {g.over ? (
            <button type="button" onClick={restart}>
              Retry
            </button>
          ) : (
            <>
              {PAD.map((b) => (
                <button key={b.dir} type="button" aria-label={b.label} onClick={() => turn(b.dir)}>
                  {b.glyph}
                </button>
              ))}
              <button type="button" onClick={() => setPaused((p) => !p)}>
                {paused ? 'Resume' : 'Pause'}
              </button>
            </>
          )}
          <button type="button" onClick={exit}>
            Quit
          </button>
        </div>
      )}
      <p className={ui.srOnly} role="status">
        {status}
      </p>
    </div>
  )
}
