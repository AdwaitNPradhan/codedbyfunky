'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import css from './shell.module.css'
import type { Env, Game, GameFactory, GameMeta, Pt, UiState } from './engine'
import { Fx } from './fx'
import { readTheme } from './color'
import { loadBest, saveBest } from './storage'
import { sfx as playSfx, isMuted, setMuted } from './sfx'

type Api = { start: () => void; pause: () => void; resume: () => void }
type Result = { score: number; best: number; isBest: boolean }

/** Counts up to `to` — purely cosmetic. */
function CountUp({ to, reduced }: { to: number; reduced: boolean }) {
  const [v, setV] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced || to <= 0) {
      setV(to)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 700)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, reduced])
  return <>{v}</>
}

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1.2" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" />
  </svg>
)
const SoundIcon = ({ on }: { on: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="currentColor" stroke="none" />
    {on ? (
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    ) : (
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    )}
  </svg>
)

/**
 * Shared host for every mini-game: canvas + DPR + resize, rAF loop (paused off-screen / hidden tab / Esc),
 * pointer + keyboard routing (keys only while focused), HUD, start / pause / game-over overlays, best score,
 * screen shake and particle fx. A game only implements `create(env) → Game`.
 */
export function GameShell({
  meta,
  create,
  onScore,
  onGameOver,
  autoFocus,
}: GameProps & { meta: GameMeta; create: GameFactory }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const apiRef = useRef<Api | null>(null)
  const cbRef = useRef({ onScore, onGameOver })
  const reducedRef = useRef(false)

  const [ui, setUi] = useState<UiState>('ready')
  const [overVisible, setOverVisible] = useState(false)
  const [result, setResult] = useState<Result>({ score: 0, best: 0, isBest: false })
  const [best, setBest] = useState(0)
  const [muted, setMutedState] = useState(true)

  useEffect(() => {
    cbRef.current = { onScore, onGameOver }
  })

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!root || !canvas || !ctx) return

    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const fx = new Fx()
    let game: Game | undefined
    let raf = 0
    let looping = false
    let last = 0
    let shakeAmp = 0
    let score = 0
    let overTimer = 0
    let overReady = false
    let pid = -1
    let visible = true
    let dead = false

    const syncReduced = () => {
      reducedRef.current = mqReduce.matches
      env.reduced = mqReduce.matches
      fx.scale = mqReduce.matches ? 0.4 : 1
    }

    const env: Env = {
      ctx,
      w: 0,
      h: 0,
      dpr: 1,
      theme: readTheme(root),
      state: 'ready',
      reduced: mqReduce.matches,
      coarse: mqCoarse.matches,
      fx,
      time: 0,
      best: loadBest(meta.key),
      score(n) {
        score = n
        const el = scoreRef.current
        if (el) {
          el.textContent = String(Math.floor(n))
          el.classList.remove(css.bump)
          void el.offsetWidth
          if (!env.reduced) el.classList.add(css.bump)
        }
        cbRef.current.onScore?.(n)
      },
      gameOver(n) {
        if (env.state === 'playing') end(n ?? score)
      },
      shake(px) {
        if (!env.reduced) shakeAmp = Math.max(shakeAmp, px)
      },
      sfx: playSfx,
      font: (px, weight = 600) => `${weight} ${px}px ${env.theme.font}`,
    }
    syncReduced()
    setBest(env.best)
    setMutedState(isMuted())

    const setState = (s: UiState) => {
      env.state = s
      setUi(s)
    }

    /* ---------- frame ---------- */
    const drawFrame = () => {
      if (!env.w || !env.h || !game) return
      const d = env.dpr
      ctx.setTransform(d, 0, 0, d, 0, 0)
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, env.w, env.h)
      ctx.fillStyle = env.theme.bg.css
      ctx.fillRect(0, 0, env.w, env.h)
      const sx = shakeAmp > 0.2 ? (Math.random() - 0.5) * 2 * shakeAmp : 0
      const sy = shakeAmp > 0.2 ? (Math.random() - 0.5) * 2 * shakeAmp : 0
      ctx.setTransform(d, 0, 0, d, sx * d, sy * d)
      game.render()
      ctx.globalAlpha = 1
      fx.draw(ctx, env.font)
      ctx.setTransform(d, 0, 0, d, 0, 0)
      ctx.globalAlpha = 1
    }

    const tick = (t: number) => {
      raf = 0
      if (!looping || dead) return
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000))
      last = t
      env.time += dt
      shakeAmp *= Math.exp(-dt * 9)
      game?.update(dt)
      fx.update(dt)
      drawFrame()
      if (looping && !dead) raf = requestAnimationFrame(tick)
    }
    const startLoop = () => {
      if (looping || dead || !visible || document.hidden || env.state === 'paused' || !game) return
      looping = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stopLoop = () => {
      looping = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    /* ---------- state transitions ---------- */
    const start = () => {
      if (!game) return
      env.theme = readTheme(root)
      fx.clear()
      shakeAmp = 0
      window.clearTimeout(overTimer)
      overReady = false
      setOverVisible(false)
      env.best = loadBest(meta.key)
      setBest(env.best)
      game.reset()
      env.score(0)
      setState('playing')
      startLoop()
      root.focus({ preventScroll: true })
    }
    function end(n: number) {
      const isBest = n > env.best
      if (isBest) {
        saveBest(meta.key, n)
        env.best = n
      }
      env.score(n)
      setResult({ score: Math.floor(n), best: Math.floor(env.best), isBest })
      setBest(env.best)
      setState('over')
      pid = -1
      cbRef.current.onGameOver?.(n)
      overTimer = window.setTimeout(
        () => {
          overReady = true
          setOverVisible(true)
        },
        env.reduced ? 150 : 700,
      )
    }
    const pause = () => {
      if (env.state !== 'playing') return
      pid = -1
      setState('paused')
      stopLoop()
      drawFrame()
    }
    const resume = () => {
      if (env.state !== 'paused') return
      setState('playing')
      startLoop()
      root.focus({ preventScroll: true })
    }
    apiRef.current = { start, pause, resume }

    /* ---------- size ---------- */
    const resize = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      env.w = w
      env.h = h
      env.dpr = dpr
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      env.theme = readTheme(root)
      if (!game) {
        game = create(env)
        game.reset()
        startLoop()
      } else {
        game.resize?.()
      }
      drawFrame()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    /* ---------- visibility ---------- */
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (!visible) {
          if (env.state === 'playing') pause()
          stopLoop()
        } else {
          startLoop()
        }
      },
      { threshold: 0 },
    )
    io.observe(root)
    const onVis = () => {
      if (document.hidden) {
        if (env.state === 'playing') pause()
        stopLoop()
      } else {
        env.theme = readTheme(root)
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    mqReduce.addEventListener('change', syncReduced)

    /* ---------- pointer ---------- */
    const pt = (e: PointerEvent, down: boolean, cancel = false): Pt => {
      const r = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - r.left) * (env.w / (r.width || 1)),
        y: (e.clientY - r.top) * (env.h / (r.height || 1)),
        id: e.pointerId,
        type: e.pointerType,
        down,
        cancel,
      }
    }
    const onDown = (e: PointerEvent) => {
      env.coarse = e.pointerType !== 'mouse'
      if (env.state !== 'playing' || pid !== -1 || (e.pointerType === 'mouse' && e.button !== 0))
        return
      pid = e.pointerId
      try {
        canvas.setPointerCapture(pid)
      } catch {
        /* ignore */
      }
      root.focus({ preventScroll: true })
      game?.pointerDown?.(pt(e, true))
    }
    const onMove = (e: PointerEvent) => {
      if (env.state !== 'playing') return
      if (pid !== -1 && e.pointerId !== pid) return
      if (e.pointerType === 'mouse') env.coarse = false
      game?.pointerMove?.(pt(e, pid !== -1))
    }
    const onUp = (cancel: boolean) => (e: PointerEvent) => {
      if (e.pointerId !== pid) return
      pid = -1
      if (env.state === 'playing') game?.pointerUp?.(pt(e, false, cancel))
    }
    const onUpOk = onUp(false)
    const onUpCancel = onUp(true)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUpOk)
    canvas.addEventListener('pointercancel', onUpCancel)

    /* ---------- keyboard (root only → only while focused) ---------- */
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      const fromRoot = e.target === root
      const act = k === 'Enter' || k === ' '
      const isR = (k === 'r' || k === 'R') && !meta.typing
      if (k === 'Escape') {
        if (env.state === 'playing') pause()
        else if (env.state === 'paused') resume()
        else return
        e.preventDefault()
        e.stopPropagation()
        return
      }
      switch (env.state) {
        case 'ready':
          if (act && fromRoot) {
            e.preventDefault()
            start()
          }
          return
        case 'over':
          if (overReady && ((act && fromRoot) || isR)) {
            e.preventDefault()
            start()
          }
          return
        case 'paused':
          if (act && fromRoot) {
            e.preventDefault()
            resume()
          } else if (isR) start()
          return
        default:
      }
      if ((k === 'p' || k === 'P') && !meta.typing) {
        pause()
        return
      }
      const handled = game?.key?.(e, true)
      if (handled || meta.keys?.includes(k)) e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (env.state === 'playing') game?.key?.(e, false)
    }
    root.addEventListener('keydown', onKeyDown)
    root.addEventListener('keyup', onKeyUp)

    if (autoFocus) root.focus({ preventScroll: true })

    return () => {
      dead = true
      stopLoop()
      window.clearTimeout(overTimer)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mqReduce.removeEventListener('change', syncReduced)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUpOk)
      canvas.removeEventListener('pointercancel', onUpCancel)
      root.removeEventListener('keydown', onKeyDown)
      root.removeEventListener('keyup', onKeyUp)
      game?.destroy?.()
      apiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move focus to the primary overlay button so Enter / Space just work.
  useEffect(() => {
    if (ui === 'ready' && !autoFocus) return
    if (ui === 'ready' || ui === 'paused' || (ui === 'over' && overVisible))
      primaryRef.current?.focus({ preventScroll: true })
  }, [ui, overVisible, autoFocus])

  const api = () => apiRef.current
  const live = ui === 'playing' || ui === 'paused'

  return (
    <div
      ref={rootRef}
      className={css.root}
      tabIndex={0}
      role="group"
      aria-label={`${meta.title} — mini game`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className={css.canvas}
        style={{ touchAction: meta.touch ?? 'pan-y', cursor: meta.cursor }}
      />

      <div className={css.hud} data-on={live}>
        <div>
          <span className={css.lbl}>Score</span>
          <span ref={scoreRef} className={css.score}>
            0
          </span>
        </div>
        {best > 0 && (
          <div>
            <span className={css.lbl}>Best</span>
            <span className={css.bestVal}>{best}</span>
          </div>
        )}
      </div>

      <div className={css.btns}>
        <button
          type="button"
          className={css.iconBtn}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          aria-pressed={!muted}
          onClick={() => {
            const m = !muted
            setMuted(m)
            setMutedState(m)
            if (!m) playSfx('good')
            rootRef.current?.focus({ preventScroll: true })
          }}
        >
          <SoundIcon on={!muted} />
        </button>
        {live && (
          <button
            type="button"
            className={css.iconBtn}
            aria-label={ui === 'paused' ? 'Resume' : 'Pause'}
            onClick={() => (ui === 'paused' ? api()?.resume() : api()?.pause())}
          >
            <PauseIcon />
          </button>
        )}
      </div>

      {ui === 'ready' && (
        <div className={css.overlay}>
          <div className={css.card}>
            <p className={css.eyebrow}>Mini game</p>
            <h2 className={css.title}>{meta.title}</h2>
            <ul className={css.how}>
              {meta.how.map((h) => (
                <li key={h.k + h.t}>
                  <kbd>{h.k}</kbd>
                  <span>{h.t}</span>
                </li>
              ))}
            </ul>
            <div className={css.btnRow}>
              <button
                ref={primaryRef}
                type="button"
                className={css.primary}
                onClick={() => api()?.start()}
              >
                Play
              </button>
            </div>
            <p className={css.hint}>
              {meta.controls}
              {best > 0 ? ` · Best ${best}` : ''}
            </p>
          </div>
        </div>
      )}

      {ui === 'paused' && (
        <div className={css.overlay}>
          <div className={css.card}>
            <p className={css.eyebrow}>{meta.title}</p>
            <h2 className={css.title}>Paused</h2>
            <div className={css.btnRow}>
              <button
                ref={primaryRef}
                type="button"
                className={css.primary}
                onClick={() => api()?.resume()}
              >
                Resume
              </button>
              <button type="button" className={css.secondary} onClick={() => api()?.start()}>
                Restart
              </button>
            </div>
            <p className={css.hint}>Esc to resume · R to restart</p>
          </div>
        </div>
      )}

      {ui === 'over' && overVisible && (
        <div className={css.overlay} role="status">
          <div className={css.card}>
            <p className={css.eyebrow}>Game over</p>
            <p className={css.big}>
              <CountUp to={result.score} reduced={reducedRef.current} />
            </p>
            {result.isBest ? (
              <span className={css.badge}>New best</span>
            ) : (
              <p className={css.hint}>Best {result.best}</p>
            )}
            <div className={css.btnRow}>
              <button
                ref={primaryRef}
                type="button"
                className={css.primary}
                onClick={() => api()?.start()}
              >
                Play again
              </button>
            </div>
            <p className={css.hint}>{meta.typing ? 'Enter to restart' : 'Enter or R to restart'}</p>
          </div>
        </div>
      )}
      <span className={css.sr} aria-live="polite">
        {ui === 'over' ? `Game over. Score ${result.score}.` : ''}
      </span>
    </div>
  )
}
