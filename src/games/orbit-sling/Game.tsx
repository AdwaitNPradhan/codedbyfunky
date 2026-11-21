'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER } from '../_shared/color'
import { glow } from '../_shared/draw'
import { TAU, clamp, easeOutCubic, lerp, mulberry32 } from '../_shared/math'
import {
  CAPTURE_R,
  H,
  HGT,
  LEVELS,
  MAX_FLIGHT,
  MAX_PULL,
  MIN_PULL,
  POWER,
  PROBE_R,
  W,
  genLevel,
  simulate,
  solve,
  step,
  wellAt,
  type Level,
  type Outcome,
  type Probe,
} from './physics'

const META: GameMeta = {
  key: 'orbit-sling',
  title: 'Orbit Sling',
  how: [
    { k: 'Drag', t: 'Pull back anywhere to aim. The dotted line is your real path.' },
    { k: 'Let go', t: 'Release to launch. Gravity wells bend the probe toward them.' },
    { k: 'Land', t: 'Reach the pulsing beacon. Planets and hazard walls crash you.' },
  ],
  controls: 'Drag + release · or ← → aim, ↑ ↓ power, Space launch · 3 probes per level',
  touch: 'none',
  cursor: 'crosshair',
  keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '],
}

type Phase = 'aim' | 'flight' | 'crash' | 'win'
const SHOTS = 3

const create: GameFactory = (env) => {
  let s = 1
  let ox = 0
  let oy = 0
  let portrait = false

  let level: Level = LEVELS[0]
  let levelIdx = 0
  let T = 0
  let phase: Phase = 'aim'
  let phaseT = 0
  let probe: Probe = { x: 0, y: 0, vx: 0, vy: 0 }
  let acc = 0
  let flightT = 0
  let stepN = 0
  let trail: number[] = []
  let shots = SHOTS
  let score = 0
  let everLaunched = false
  let bannerT = 0
  let lostText = ''
  const aim = { active: false, ax: 0, ay: 0, px: 0, py: 0 }
  const kb = { used: false, ang: 0, pow: 100, l: false, r: false, u: false, d: false }
  let demoT = 0
  let demoShot: { vx: number; vy: number } | null = null
  let starsFor: unknown = null
  let starFar: HTMLCanvasElement | null = null
  let starNear: HTMLCanvasElement | null = null

  /* ---------- layout / transforms ---------- */
  function layout() {
    portrait = env.h > env.w * 1.1
    const top = env.h < 320 ? 38 : 50
    const aw = env.w
    const ah = env.h - top - 8
    const vw = portrait ? HGT : W
    const vh = portrait ? W : HGT
    s = Math.max(0.05, Math.min(aw / vw, ah / vh))
    ox = (aw - vw * s) / 2
    oy = top + (ah - vh * s) / 2
  }
  const toScreen = (vx: number, vy: number): [number, number] =>
    portrait ? [ox + (HGT - vy) * s, oy + vx * s] : [ox + vx * s, oy + vy * s]
  const toVirtual = (px: number, py: number): [number, number] =>
    portrait ? [(py - oy) / s, HGT - (px - ox) / s] : [(px - ox) / s, (py - oy) / s]
  const px1 = () => 1 / s

  /* ---------- level flow ---------- */
  function resetProbe() {
    probe = { x: level.pad.x, y: level.pad.y, vx: 0, vy: 0 }
    trail = []
    phase = 'aim'
    phaseT = 0
    aim.active = false
    flightT = 0
    stepN = 0
  }
  function loadLevel(i: number) {
    levelIdx = i
    level = i < LEVELS.length ? LEVELS[i] : genLevel(i)
    shots = SHOTS
    kb.ang = Math.atan2(level.beacon.y - level.pad.y, level.beacon.x - level.pad.x)
    kb.pow = 100
    kb.used = false
    bannerT = 2.1
    resetProbe()
  }

  function cap(dx: number, dy: number) {
    const l = Math.hypot(dx, dy)
    if (l > MAX_PULL) return { x: (dx / l) * MAX_PULL, y: (dy / l) * MAX_PULL }
    return { x: dx, y: dy }
  }
  function pullVec(): { x: number; y: number } | null {
    if (phase !== 'aim') return null
    if (env.state !== 'playing') {
      if (!demoShot || demoT < 0.5) return null
      const k = easeOutCubic(clamp((demoT - 0.5) / 0.9, 0, 1))
      return { x: (-demoShot.vx / POWER) * k, y: (-demoShot.vy / POWER) * k }
    }
    if (aim.active) return cap(aim.px - aim.ax, aim.py - aim.ay)
    if (kb.used) return { x: -Math.cos(kb.ang) * kb.pow, y: -Math.sin(kb.ang) * kb.pow }
    return null
  }

  function launch(vx: number, vy: number) {
    probe = { x: level.pad.x, y: level.pad.y, vx, vy }
    trail = [probe.x, probe.y]
    phase = 'flight'
    phaseT = 0
    flightT = 0
    stepN = 0
    acc = 0
    aim.active = false
    if (env.state === 'playing') {
      shots -= 1
      everLaunched = true
    }
    const [sx, sy] = toScreen(level.pad.x, level.pad.y)
    env.fx.ring(sx, sy, env.theme.accent.css, { r1: 40, life: 0.4 })
    env.fx.burst(sx, sy, env.theme.fg.a(0.8), 8, { speed: 120, size: 2, life: 0.4 })
    env.sfx('launch')
  }

  const clampScreen = (x: number, y: number): [number, number] => [
    clamp(x, 24, env.w - 24),
    clamp(y, 60, env.h - 24),
  ]

  function endFlight(out: Outcome) {
    const th = env.theme
    const playing = env.state === 'playing'
    const [sx, sy] = clampScreen(...toScreen(probe.x, probe.y))
    phaseT = 0
    if (out === 'win') {
      phase = 'win'
      const bonus = shots * 60 + Math.max(0, Math.round(60 - flightT * 6))
      const gain = 100 + levelIdx * 25 + bonus
      const [bx, by] = toScreen(level.beacon.x, level.beacon.y)
      env.fx.burst(bx, by, th.accent.css, 34, { speed: 340, size: 3.4, life: 0.8 })
      env.fx.burst(bx, by, th.fg.a(0.9), 12, { speed: 200, size: 2, life: 0.6, square: true })
      env.fx.ring(bx, by, th.accent.css, { r1: 120, life: 0.7, width: 4 })
      env.fx.ring(bx, by, th.accent2.css, { r1: 70, life: 0.5 })
      env.sfx('win')
      if (playing) {
        score += gain
        env.score(score)
        env.fx.text(bx, by - 34, `+${gain}`, th.accent.css, { size: 26, life: 1.3, rise: 26 })
        if (shots === SHOTS - 1)
          env.fx.text(bx, by + 38, 'FIRST TRY', th.accent2.css, { size: 13, life: 1.3, rise: 10 })
      }
      return
    }
    phase = 'crash'
    env.fx.burst(sx, sy, th.accent2.css, 22, { speed: 320, size: 3.4, life: 0.7 })
    env.fx.burst(sx, sy, th.fg.a(0.9), 10, { speed: 220, size: 2, life: 0.5, square: true })
    env.fx.ring(sx, sy, DANGER, { r1: 60, life: 0.45 })
    if (out === 'lost') {
      lostText = 'SIGNAL LOST'
      env.fx.text(sx, sy - 18, lostText, DANGER, { size: 13, life: 1 })
    } else {
      env.shake(8)
    }
    if (playing) env.sfx('bad')
  }

  /* ---------- stars ---------- */
  function buildStars() {
    const th = env.theme
    const mk = (n: number, seed: number, maxR: number, alpha: number) => {
      const c = document.createElement('canvas')
      const d = env.dpr
      const cw = env.w + 60
      const ch = env.h + 60
      c.width = Math.round(cw * d)
      c.height = Math.round(ch * d)
      const g = c.getContext('2d')
      if (!g) return c
      g.scale(d, d)
      g.fillStyle = th.fg.css
      const r = mulberry32(seed)
      for (let i = 0; i < n; i++) {
        g.globalAlpha = alpha * (0.35 + 0.65 * r())
        g.beginPath()
        g.arc(r() * cw, r() * ch, 0.4 + r() * maxR, 0, TAU)
        g.fill()
      }
      return c
    }
    const area = env.w * env.h
    starFar = mk(Math.round(area / 2600), 11, 0.8, 0.5)
    starNear = mk(Math.round(area / 11000), 23, 1.5, 0.85)
    starsFor = th
  }

  /* ---------- drawing ---------- */
  function drawBackground() {
    const { ctx, w, h, theme: th } = env
    if (starsFor !== th) buildStars()
    const nb = ctx.createRadialGradient(
      w * 0.78,
      h * 0.28,
      0,
      w * 0.78,
      h * 0.28,
      Math.max(w, h) * 0.6,
    )
    nb.addColorStop(0, th.accent2.a(0.13))
    nb.addColorStop(1, th.accent2.a(0))
    ctx.fillStyle = nb
    ctx.fillRect(0, 0, w, h)
    const nb2 = ctx.createRadialGradient(
      w * 0.15,
      h * 0.85,
      0,
      w * 0.15,
      h * 0.85,
      Math.max(w, h) * 0.5,
    )
    nb2.addColorStop(0, th.accent.a(0.07))
    nb2.addColorStop(1, th.accent.a(0))
    ctx.fillStyle = nb2
    ctx.fillRect(0, 0, w, h)
    const par = (probe.x - W / 2) * s
    const drift = T * 2
    if (starFar)
      ctx.drawImage(
        starFar,
        -30 - par * 0.012 - (drift % 30) * 0.2,
        -30 - (probe.y - HGT / 2) * s * 0.012,
        w + 60,
        h + 60,
      )
    if (starNear)
      ctx.drawImage(
        starNear,
        -30 - par * 0.035 - (drift % 30) * 0.5,
        -30 - (probe.y - HGT / 2) * s * 0.035,
        w + 60,
        h + 60,
      )
  }

  function drawWell(i: number, q: { x: number; y: number }, r: number) {
    const { ctx, theme: th } = env
    const c = th.accent2
    const p = px1()
    glow(ctx, q.x, q.y, r * 3.4, c, 0.3)
    ctx.save()
    ctx.translate(q.x, q.y)
    ctx.strokeStyle = c.a(0.26)
    ctx.lineWidth = p * 1.1
    ctx.setLineDash([p * 4, p * 9])
    ctx.lineDashOffset = -T * 9 * (i % 2 ? 1 : -1)
    for (const m of [1.9, 2.8]) {
      ctx.beginPath()
      ctx.arc(0, 0, r * m, 0, TAU)
      ctx.stroke()
    }
    ctx.setLineDash([])
    const g = ctx.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.08, 0, 0, r)
    g.addColorStop(0, c.mix(th.fg, 0.6))
    g.addColorStop(0.5, c.css)
    g.addColorStop(1, c.mix(th.bg, 0.6))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fill()
    if (r > 24) {
      ctx.save()
      ctx.rotate(-0.35 + i * 0.5)
      ctx.strokeStyle = th.fg.a(0.45)
      ctx.lineWidth = p * 1.6
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 1.55, r * 0.42, 0, Math.PI * 0.08, Math.PI * 0.92)
      ctx.stroke()
      ctx.restore()
    }
    ctx.restore()
  }

  function drawWall(wl: Level['walls'][number]) {
    const { ctx, theme: th } = env
    const p = px1()
    ctx.save()
    ctx.beginPath()
    ctx.rect(wl.x, wl.y, wl.w, wl.h)
    ctx.fillStyle = th.bg.mix(th.fg, 0.08)
    ctx.fill()
    ctx.clip()
    ctx.strokeStyle = 'rgba(255,77,109,0.5)'
    ctx.lineWidth = p * 3
    const gap = 16
    ctx.beginPath()
    for (let k = -wl.h; k < wl.w + wl.h; k += gap) {
      ctx.moveTo(wl.x + k, wl.y + wl.h)
      ctx.lineTo(wl.x + k + wl.h, wl.y)
    }
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,77,109,0.95)'
    ctx.lineWidth = p * 1.6
    ctx.strokeRect(wl.x, wl.y, wl.w, wl.h)
  }

  function drawBeacon() {
    const { ctx, theme: th } = env
    const b = level.beacon
    const p = px1()
    glow(ctx, b.x, b.y, 70, th.accent, 0.32)
    const pulse = (T * 0.8) % 1
    for (let i = 0; i < 3; i++) {
      const k = (pulse + i / 3) % 1
      ctx.strokeStyle = th.accent.a((1 - k) * 0.7)
      ctx.lineWidth = p * 2
      ctx.beginPath()
      ctx.arc(b.x, b.y, lerp(8, CAPTURE_R + 12, k), 0, TAU)
      ctx.stroke()
    }
    ctx.strokeStyle = th.accent.a(0.35)
    ctx.lineWidth = p * 1.2
    ctx.setLineDash([p * 3, p * 5])
    ctx.beginPath()
    ctx.arc(b.x, b.y, CAPTURE_R, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = th.accent.css
    ctx.beginPath()
    ctx.arc(b.x, b.y, 9 + Math.sin(T * 5) * 0.8, 0, TAU)
    ctx.fill()
    ctx.fillStyle = th.bg.css
    ctx.beginPath()
    ctx.arc(b.x, b.y, 3.6, 0, TAU)
    ctx.fill()
  }

  function drawProbeAt(x: number, y: number, glowA = 0.5) {
    const { ctx, theme: th } = env
    glow(ctx, x, y, 22, th.accent, glowA)
    ctx.fillStyle = th.fg.css
    ctx.beginPath()
    ctx.arc(x, y, PROBE_R + 0.5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = th.accent.css
    ctx.beginPath()
    ctx.arc(x, y, 2.6, 0, TAU)
    ctx.fill()
  }

  function drawWorld() {
    const { ctx, theme: th } = env
    const p = px1()
    const pad = level.pad
    // arena corner brackets
    ctx.strokeStyle = th.fg.a(0.2)
    ctx.lineWidth = p * 1.5
    const L = 22
    for (const [cx, cy, dx, dy] of [
      [0, 0, 1, 1],
      [W, 0, -1, 1],
      [0, HGT, 1, -1],
      [W, HGT, -1, -1],
    ]) {
      ctx.beginPath()
      ctx.moveTo(cx + dx * L, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + dy * L)
      ctx.stroke()
    }
    // orbit guides for moving wells
    ctx.strokeStyle = th.accent2.a(0.14)
    ctx.lineWidth = p
    ctx.setLineDash([p * 2, p * 7])
    for (const w of level.wells) {
      if (!w.orbit) continue
      ctx.beginPath()
      ctx.arc(w.orbit.cx, w.orbit.cy, w.orbit.R, 0, TAU)
      ctx.stroke()
    }
    ctx.setLineDash([])
    for (const wl of level.walls) drawWall(wl)
    drawBeacon()
    level.wells.forEach((w, i) => drawWell(i, wellAt(w, T), w.r))

    // pad
    ctx.strokeStyle = th.fg.a(0.55)
    ctx.lineWidth = p * 1.6
    ctx.setLineDash([p * 3, p * 4])
    ctx.lineDashOffset = -T * 6
    ctx.beginPath()
    ctx.arc(pad.x, pad.y, 15, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = th.fg.a(0.85)
    for (const dy of [-22, 22]) {
      ctx.beginPath()
      ctx.arc(pad.x, pad.y + dy, 3.2, 0, TAU)
      ctx.fill()
    }

    const pull = phase === 'aim' ? pullVec() : null
    const plen = pull ? Math.hypot(pull.x, pull.y) : 0
    if (pull && plen >= 2) {
      const ok = plen >= MIN_PULL
      const vx = -pull.x * POWER
      const vy = -pull.y * POWER
      // trajectory preview with the real integrator
      const tr = simulate(level, vx, vy, T, 3, 5)
      const n = tr.pts.length / 2
      for (let i = 1; i < n; i++) {
        const k = i / n
        ctx.globalAlpha = (1 - k * 0.85) * (ok ? 0.95 : 0.35)
        ctx.fillStyle = th.fg.css
        ctx.beginPath()
        ctx.arc(tr.pts[i * 2], tr.pts[i * 2 + 1], p * (2.6 - k * 1.2), 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (ok && n > 2) {
        const ex = tr.pts[(n - 1) * 2]
        const ey = tr.pts[(n - 1) * 2 + 1]
        if (tr.outcome === 'win') {
          ctx.strokeStyle = th.accent.css
          ctx.lineWidth = p * 2
          ctx.beginPath()
          ctx.arc(ex, ey, 12, 0, TAU)
          ctx.stroke()
        } else if (tr.outcome === 'well' || tr.outcome === 'wall') {
          ctx.strokeStyle = DANGER
          ctx.lineWidth = p * 2.2
          ctx.beginPath()
          ctx.moveTo(ex - 6, ey - 6)
          ctx.lineTo(ex + 6, ey + 6)
          ctx.moveTo(ex + 6, ey - 6)
          ctx.lineTo(ex - 6, ey + 6)
          ctx.stroke()
        }
      }
      // elastic band
      const mx = pad.x + pull.x
      const my = pad.y + pull.y
      const stretch = plen / MAX_PULL
      ctx.strokeStyle = th.fg.a(0.85)
      ctx.lineWidth = p * lerp(3, 1.4, stretch)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(pad.x, pad.y - 22)
      ctx.lineTo(mx, my)
      ctx.lineTo(pad.x, pad.y + 22)
      ctx.stroke()
      // power ring
      ctx.strokeStyle = stretch > 0.92 ? DANGER : th.accent.css
      ctx.lineWidth = p * 3.2
      ctx.beginPath()
      ctx.arc(pad.x, pad.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * stretch)
      ctx.stroke()
      drawProbeAt(mx, my, 0.45)
    } else if (phase === 'aim') {
      drawProbeAt(pad.x, pad.y + Math.sin(T * 3) * 1.2, 0.35 + Math.sin(T * 3) * 0.1)
    }

    // trail + flying probe
    if (trail.length > 4) {
      const n = trail.length / 2
      for (let i = 1; i < n; i++) {
        const k = i / n
        ctx.strokeStyle = th.accent.a(k * 0.85)
        ctx.lineWidth = p * (0.6 + k * 3.4)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(trail[(i - 1) * 2], trail[(i - 1) * 2 + 1])
        ctx.lineTo(trail[i * 2], trail[i * 2 + 1])
        ctx.stroke()
      }
    }
    if (phase === 'flight') drawProbeAt(probe.x, probe.y, 0.6)
    if (phase === 'win') drawProbeAt(level.beacon.x, level.beacon.y, 0.9)
  }

  function drawHud() {
    const { ctx, w, h, theme: th } = env
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    if (w > 330) {
      ctx.font = env.font(11, 700)
      ctx.fillStyle = th.fg.a(0.7)
      ctx.fillText(`LEVEL ${levelIdx + 1} · ${level.name.toUpperCase()}`, w / 2, 20)
    } else {
      ctx.font = env.font(11, 700)
      ctx.fillStyle = th.fg.a(0.7)
      ctx.fillText(`LEVEL ${levelIdx + 1}`, w / 2, 20)
    }
    for (let i = 0; i < SHOTS; i++) {
      const x = w / 2 + (i - 1) * 18
      ctx.beginPath()
      ctx.arc(x, 34, 5, 0, TAU)
      if (i < shots) {
        ctx.fillStyle = th.accent.css
        ctx.fill()
      } else {
        ctx.strokeStyle = th.fg.a(0.3)
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
    if (bannerT > 0 && phase === 'aim') {
      const k = clamp(bannerT / 2.1, 0, 1)
      const a = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, k / 0.35)
      ctx.globalAlpha = a
      ctx.font = env.font(clamp(w * 0.09, 26, 44), 800)
      ctx.fillStyle = th.fg.css
      ctx.fillText(`LEVEL ${levelIdx + 1}`, w / 2, h * 0.5 - 4)
      ctx.font = env.font(14, 600)
      ctx.fillStyle = th.accent.css
      ctx.fillText(level.name.toUpperCase(), w / 2, h * 0.5 + 22)
      ctx.globalAlpha = 1
    }
    if (!everLaunched && levelIdx === 0 && phase === 'aim' && !aim.active && bannerT < 1.2) {
      ctx.globalAlpha = 0.55 + Math.sin(T * 4) * 0.25
      ctx.font = env.font(12, 600)
      ctx.fillStyle = th.fg.css
      ctx.fillText(
        env.coarse ? 'Drag back, then let go' : 'Drag back from anywhere, release to launch',
        w / 2,
        h - 16,
      )
      ctx.globalAlpha = 1
    }
  }

  /* ---------- Game ---------- */
  layout()
  return {
    reset() {
      layout()
      score = 0
      T = 0
      everLaunched = false
      demoT = 0
      loadLevel(0)
    },
    resize() {
      layout()
      starsFor = null
    },
    update(dt) {
      const playing = env.state === 'playing'
      const ambient = env.state === 'ready'
      if (bannerT > 0) bannerT -= dt
      if (!playing && !ambient) {
        T += dt
        return
      }
      if (phase === 'flight') {
        acc += Math.min(dt, 0.05)
        let out: Outcome = 'fly'
        let n = 0
        while (acc >= H && n < 14 && out === 'fly') {
          acc -= H
          n++
          out = step(level, probe, T)
          T += H
          flightT += H
          stepN++
          if (stepN % 2 === 0) {
            trail.push(probe.x, probe.y)
            if (trail.length > 360) trail.splice(0, 2)
          }
          if (flightT > MAX_FLIGHT) out = 'lost'
        }
        if (out !== 'fly') endFlight(out)
      } else {
        T += dt
      }
      if (phase === 'aim') {
        if (playing) {
          if (kb.used) {
            kb.ang += ((kb.r ? 1 : 0) - (kb.l ? 1 : 0)) * dt * 1.2
            kb.pow = clamp(
              kb.pow + ((kb.u ? 1 : 0) - (kb.d ? 1 : 0)) * dt * 80,
              MIN_PULL + 4,
              MAX_PULL,
            )
          }
        } else {
          if (!demoShot) {
            const sols = solve(LEVELS[0], 0, 6, 14)
            const pick = sols[Math.floor(sols.length * 0.6)] ?? sols[0]
            demoShot = pick ? { vx: pick.vx, vy: pick.vy } : { vx: 330, vy: 0 }
          }
          demoT += dt
          if (demoT > 1.5 && demoShot) launch(demoShot.vx, demoShot.vy)
        }
      } else if (phase === 'crash' || phase === 'win') {
        phaseT += dt
        if (phase === 'crash' && phaseT > 0.95) {
          if (playing && shots <= 0) {
            env.sfx('lose')
            env.gameOver(score)
          } else {
            demoT = 0
            resetProbe()
          }
        } else if (phase === 'win' && phaseT > 1.5) {
          if (playing) loadLevel(levelIdx + 1)
          else {
            demoT = 0
            resetProbe()
          }
        }
      }
    },
    render() {
      const { ctx } = env
      drawBackground()
      ctx.save()
      ctx.translate(ox, oy)
      ctx.scale(s, s)
      if (portrait) ctx.transform(0, 1, -1, 0, HGT, 0)
      drawWorld()
      ctx.restore()
      if (env.state !== 'ready') drawHud()
    },
    pointerDown(p) {
      if (phase !== 'aim') return
      const [vx, vy] = toVirtual(p.x, p.y)
      aim.active = true
      aim.ax = aim.px = vx
      aim.ay = aim.py = vy
      kb.used = false
      env.sfx('click')
    },
    pointerMove(p) {
      if (!aim.active || !p.down) return
      const [vx, vy] = toVirtual(p.x, p.y)
      aim.px = vx
      aim.py = vy
    },
    pointerUp(p) {
      if (!aim.active) return
      const pull = cap(aim.px - aim.ax, aim.py - aim.ay)
      aim.active = false
      if (p.cancel || phase !== 'aim') return
      if (Math.hypot(pull.x, pull.y) >= MIN_PULL) launch(-pull.x * POWER, -pull.y * POWER)
    },
    key(e, down) {
      const k = e.key
      if (k === 'ArrowLeft') kb.l = down
      else if (k === 'ArrowRight') kb.r = down
      else if (k === 'ArrowUp') kb.u = down
      else if (k === 'ArrowDown') kb.d = down
      else if (k === ' ' || k === 'Enter') {
        if (down && !e.repeat && phase === 'aim') {
          if (kb.used)
            launch(-(-Math.cos(kb.ang) * kb.pow) * POWER, -(-Math.sin(kb.ang) * kb.pow) * POWER)
          else kb.used = true
        }
        return k === ' '
      } else return false
      if (down && phase === 'aim') {
        kb.used = true
        aim.active = false
      }
      return true
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
