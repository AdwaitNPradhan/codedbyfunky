'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER, OK } from '../_shared/color'
import { fillRR, rr } from '../_shared/draw'
import { TAU, clamp, easeOutCubic, hash01, lerp, rand } from '../_shared/math'

const META: GameMeta = {
  key: 'deploy-dash',
  title: 'Deploy Dash',
  how: [
    { k: 'Jump', t: 'Space / ↑ / tap. Hold longer to jump higher. Clear failing builds.' },
    { k: 'Duck', t: '↓ / S, or hold the bottom of the screen, under flaky-test drones.' },
    { k: 'Check', t: 'Grab green checks and pass pipeline stages for bonus points.' },
  ],
  controls: 'Space / ↑ jump · ↓ duck · tap / hold bottom on touch',
  touch: 'none',
  keys: [' ', 'ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'],
}

const STAGES = ['lint', 'build', 'test', 'deploy']
const STAGE_LEN = 26
const STAGE_OFF = 22

type Obs = {
  kind: 'block' | 'tall' | 'drone'
  wx: number
  w: number
  h: number
  by: number
  phase: number
}
type Pick = { wx: number; hgt: number; phase: number; taken: boolean }

const G = 74 // gravity, units/s²
const V0 = 25 // jump velocity, units/s (apex ≈ 4.2 units)
const RW = 1.5
const RH = 1.85
const DH = 1.0

const create: GameFactory = (env) => {
  let u = 16
  let gy = 0
  let px = 0
  let dist = 0
  let t = 0
  let speed = 9
  let live01 = 1 // world motion scale (eases to 0 on death)
  let hy = 0
  let vy = 0
  let grounded = true
  let coyote = 0
  let jumpBuf = 0
  let jumpHeld = false
  let duckHeld = false
  let duckK = 0
  let landSq = 0
  let dead = false
  let obstacles: Obs[] = []
  let picks: Pick[] = []
  let nextSpawn = 0
  let scoreF = 0
  let lastInt = 0
  let stageSeen = 0
  let stageFlash = 0
  let dustT = 0
  let hintT = 0
  let ptr: { id: number; y0: number; mode: 'jump' | 'duck' } | null = null

  const th = () => env.theme
  const playing = () => env.state === 'playing'
  const diff = () => 1 - Math.exp(-t / 60)

  function layout() {
    u = clamp(Math.min(env.w / 19, env.h / 14), 13, 44)
    const portrait = env.h > env.w * 1.15
    gy = Math.floor(env.h * (portrait ? 0.56 : 0.68))
    px = clamp(env.w * 0.2, 64, 240)
  }
  const duckZone = (y: number) => y > gy + (env.h - gy) * 0.33

  function reset() {
    layout()
    dist = 0
    t = 0
    speed = 9.5
    live01 = 1
    hy = 0
    vy = 0
    grounded = true
    coyote = 0
    jumpBuf = 0
    jumpHeld = false
    duckHeld = false
    duckK = 0
    landSq = 0
    dead = false
    obstacles = []
    picks = []
    nextSpawn = 32
    scoreF = 0
    lastInt = 0
    stageSeen = 0
    stageFlash = 0
    hintT = 0
    ptr = null
  }

  function spawnAhead() {
    const view = (env.w - px) / u
    while (nextSpawn < dist + view + 6) {
      const at = nextSpawn
      const d = diff()
      const r = Math.random()
      let width = 2
      if (t > 9 && r < 0.26 + d * 0.16) {
        obstacles.push({ kind: 'drone', wx: at, w: 1.9, h: 0.85, by: 1.5, phase: rand(0, 6) })
        width = 1.9
      } else if (t > 22 && r > 0.88) {
        obstacles.push({ kind: 'tall', wx: at, w: 1.8, h: 2.9, by: 0, phase: 0 })
        width = 1.8
      } else if (t > 30 && r > 0.7) {
        const w1 = rand(1.5, 2)
        obstacles.push({ kind: 'block', wx: at, w: w1, h: rand(1.5, 1.9), by: 0, phase: 0 })
        const w2 = rand(1.5, 2)
        const cg = speed * 0.5 + 2.4
        obstacles.push({
          kind: 'block',
          wx: at + w1 + cg,
          w: w2,
          h: rand(1.5, 1.9),
          by: 0,
          phase: 0,
        })
        width = w1 + cg + w2
      } else {
        width = rand(1.6, 2.4)
        obstacles.push({ kind: 'block', wx: at, w: width, h: rand(1.5, 2.0), by: 0, phase: 0 })
      }
      // reward arc above the obstacle
      if (Math.random() < 0.55) {
        const n = 3 + Math.floor(Math.random() * 2)
        for (let i = 0; i < n; i++) {
          const k = i / (n - 1)
          picks.push({
            wx: at - 0.3 + k * (width + 0.6),
            hgt:
              (obstacles[obstacles.length - 1].kind === 'drone' ? 0.7 : 3.1) +
              Math.sin(k * Math.PI) * 0.7,
            phase: rand(0, 6),
            taken: false,
          })
        }
      }
      const gap = speed * rand(1.0, 1.75) * (1 - 0.22 * d) + 1.5
      // a trail of low checks along the gap
      if (Math.random() < 0.5) {
        const n = 3
        for (let i = 0; i < n; i++)
          picks.push({
            wx: at + width + gap * (0.3 + i * 0.18),
            hgt: 0.9,
            phase: rand(0, 6),
            taken: false,
          })
      }
      nextSpawn = at + width + gap
    }
  }

  function jump() {
    vy = V0
    grounded = false
    coyote = 0
    jumpBuf = 0
    landSq = 0
    env.sfx('jump')
    env.fx.burst(px, gy, env.theme.fg.a(0.6), 6, {
      speed: 90,
      angle: -Math.PI / 2,
      spread: 2.2,
      size: 2,
      g: 60,
      life: 0.35,
    })
  }

  function die(why: string) {
    dead = true
    env.shake(14)
    env.sfx('lose')
    const th = env.theme
    const y = gy - (hy + RH / 2) * u
    env.fx.burst(px, y, DANGER, 16, { speed: 320, size: 3.2, life: 0.7, g: 400 })
    env.fx.burst(px, y, th.accent.css, 18, { speed: 280, size: 3, life: 0.8, g: 420, square: true })
    env.fx.ring(px, y, DANGER, { r1: u * 4, life: 0.5, width: 4 })
    env.fx.text(px, clamp(y - u * 2, 70, env.h), why, DANGER, { size: 15, life: 1.4, rise: 20 })
    env.gameOver(Math.floor(scoreF))
  }

  function setScore(n: number) {
    const i = Math.floor(n)
    if (i !== lastInt) {
      lastInt = i
      if (playing()) env.score(i)
    }
  }

  /** Attract mode: the packet plays itself (and never dies). */
  function autoplay() {
    let nearest: Obs | null = null
    for (const o of obstacles) {
      if (o.wx + o.w > dist - 0.5 && (!nearest || o.wx < nearest.wx)) nearest = o
    }
    jumpHeld = false
    duckHeld = false
    if (!nearest) return
    const dx = nearest.wx - dist
    if (nearest.kind === 'drone') {
      if (dx < speed * 0.42 && dx > -nearest.w - 0.5) duckHeld = true
    } else if (dx < speed * 0.36 && dx > 0 && grounded) {
      jumpBuf = 0.1
    }
    if (!grounded && vy > 0) jumpHeld = true
  }

  /* ---------- drawing ---------- */
  function drawBackdrop() {
    const { ctx, w, theme: th } = env
    // far: stage columns
    const colW = 20 * u
    const far = dist * 0.16 * u
    const base = Math.floor(far / colW)
    for (let i = base; i * colW - far < w; i++) {
      const x = i * colW - far
      const name = STAGES[((i % 4) + 4) % 4]
      ctx.fillStyle = th.fg.a(0.025)
      ctx.fillRect(x, 0, colW - 2, gy + u * 0.4)
      ctx.fillStyle = th.fg.a(0.07)
      ctx.fillRect(x, 0, 1.5, gy + u * 0.4)
      ctx.font = env.font(clamp(u * 0.62, 9, 13), 800)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = th.fg.a(0.22)
      ctx.fillText(`${(((i % 4) + 4) % 4) + 1} / ${name}`.toUpperCase(), x + 12, 74)
      ctx.fillStyle = th.accent.a(0.35)
      ctx.beginPath()
      ctx.arc(x + 12 + (name.length + 4) * 8.5, 70, 3, 0, TAU)
      ctx.fill()
    }
    // mid: faint code
    const off = dist * 0.42 * u
    const chunk = 14 * u
    const cb = Math.floor(off / chunk)
    const rowH = Math.max(14, u * 1.1)
    const rowsN = Math.floor((gy - 88) / rowH)
    for (let c = cb; c * chunk - off < w; c++) {
      for (let r = 0; r < rowsN; r++) {
        const key = c * 97 + r * 13
        if (hash01(key) < 0.45) continue
        const x0 = c * chunk - off + hash01(key + 1) * chunk * 0.3
        const wd = (0.25 + hash01(key + 2) * 0.6) * chunk * 0.7
        const y = 92 + r * rowH
        fillRR(
          ctx,
          x0,
          y,
          wd,
          rowH * 0.28,
          rowH * 0.14,
          hash01(key + 3) < 0.25 ? th.accent2.a(0.12) : th.fg.a(0.06),
        )
        if (hash01(key + 4) < 0.5)
          fillRR(ctx, x0 + wd + 6, y, wd * 0.4, rowH * 0.28, rowH * 0.14, th.fg.a(0.05))
      }
    }
  }

  function drawPipeline() {
    const { ctx, w, h, theme: th } = env
    const pipeH = u * 0.62
    // ground haze
    const g = ctx.createLinearGradient(0, gy, 0, h)
    g.addColorStop(0, th.fg.a(0.07))
    g.addColorStop(1, th.fg.a(0))
    ctx.fillStyle = g
    ctx.fillRect(0, gy, w, h - gy)
    // floor depth: dashes sliding past at three speeds
    for (let layer = 0; layer < 3; layer++) {
      const k = 0.85 - layer * 0.22
      const sp2 = u * (4 + layer * 2)
      const o2 = (dist * u * k) % sp2
      const yy = gy + pipeH + u * (2.4 + layer * 1.5)
      if (yy > h - 4) break
      ctx.fillStyle = th.fg.a(0.1 - layer * 0.025)
      for (let x = -o2; x < w; x += sp2)
        ctx.fillRect(x, yy, u * (1.4 - layer * 0.3), Math.max(2, u * 0.1))
    }
    // pipe
    fillRR(ctx, -10, gy, w + 20, pipeH, pipeH / 2, th.fg.a(0.16))
    fillRR(ctx, -10, gy, w + 20, pipeH * 0.34, pipeH * 0.17, th.fg.a(0.12))
    // flow dashes
    const sp = u * 2.4
    const off = (dist * u) % sp
    ctx.fillStyle = th.accent.a(0.65)
    for (let x = -sp + (sp - off); x < w + sp; x += sp)
      fillRR(ctx, x, gy + pipeH * 0.4, u * 0.8, pipeH * 0.2, pipeH * 0.1, th.accent.a(0.6))
    // stage nodes
    const i0 = Math.floor((dist - STAGE_OFF) / STAGE_LEN) - 1
    for (let i = i0; ; i++) {
      const wx = STAGE_OFF + i * STAGE_LEN
      const x = px + (wx - dist) * u
      if (x > w + u * 3) break
      if (x < -u * 3 || i < 0) continue
      const passed = wx <= dist
      const name = STAGES[i % 4]
      const pulse = i === stageSeen - 1 ? easeOutCubic(clamp(1 - stageFlash, 0, 1)) : 1
      const cy = gy + pipeH / 2
      ctx.beginPath()
      ctx.arc(x, cy, u * 0.62 * (1 + (1 - pulse) * 0.5), 0, TAU)
      ctx.fillStyle = passed ? OK : th.bg.css
      ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = passed ? OK : th.fg.a(0.5)
      ctx.stroke()
      if (passed) {
        ctx.strokeStyle = th.bg.css
        ctx.lineWidth = 2.2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(x - u * 0.25, cy)
        ctx.lineTo(x - u * 0.05, cy + u * 0.2)
        ctx.lineTo(x + u * 0.3, cy - u * 0.18)
        ctx.stroke()
      }
      ctx.font = env.font(clamp(u * 0.6, 9, 13), 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = passed ? th.fg.a(0.75) : th.fg.a(0.4)
      ctx.fillText(name.toUpperCase(), x, gy + pipeH + u * 0.5)
    }
  }

  function drawPick(p: Pick) {
    const { ctx, theme: th } = env
    const x = px + (p.wx - dist) * u
    if (x < -u || x > env.w + u) return
    const y = gy - p.hgt * u + Math.sin(env.time * 3 + p.phase) * u * 0.12
    const r = u * 0.42
    const flip = Math.abs(Math.cos(env.time * 2.4 + p.phase)) * 0.65 + 0.35
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(flip, 1)
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fillStyle = OK
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = th.bg.css
    ctx.lineWidth = Math.max(1.8, u * 0.11)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x - r * 0.4 * flip, y)
    ctx.lineTo(x - r * 0.08 * flip, y + r * 0.34)
    ctx.lineTo(x + r * 0.46 * flip, y - r * 0.3)
    ctx.stroke()
  }

  function drawObs(o: Obs) {
    const { ctx, theme: th } = env
    const x = px + (o.wx - dist) * u
    if (x > env.w + u * 3 || x + o.w * u < -u) return
    const wpx = o.w * u
    if (o.kind === 'drone') {
      const bob = Math.sin(env.time * 3 + o.phase) * 0.2
      const y = gy - (o.by + bob + o.h) * u
      const hpx = o.h * u
      const cxx = x + wpx / 2
      const flick = Math.random() < 0.06 ? 0.55 : 1
      ctx.globalAlpha = flick
      // scan beam hints the safe space underneath
      const beam = ctx.createLinearGradient(0, y + hpx, 0, gy)
      beam.addColorStop(0, 'rgba(255,77,109,0.2)')
      beam.addColorStop(1, 'rgba(255,77,109,0)')
      ctx.fillStyle = beam
      ctx.beginPath()
      ctx.moveTo(cxx - wpx * 0.22, y + hpx)
      ctx.lineTo(cxx + wpx * 0.22, y + hpx)
      ctx.lineTo(cxx + wpx * 0.5, gy)
      ctx.lineTo(cxx - wpx * 0.5, gy)
      ctx.fill()
      // rotor
      ctx.strokeStyle = th.fg.a(0.75)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      const rot = Math.sin(env.time * 55) * wpx * 0.42
      ctx.beginPath()
      ctx.moveTo(cxx - rot, y - 3)
      ctx.lineTo(cxx + rot, y - 3)
      ctx.moveTo(cxx, y - 3)
      ctx.lineTo(cxx, y + hpx * 0.2)
      ctx.stroke()
      // body
      fillRR(ctx, x, y, wpx, hpx, hpx * 0.5, th.accent2.mix(th.fg, 0.16))
      ctx.strokeStyle = th.fg.a(0.45)
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = th.bg.css
      ctx.beginPath()
      ctx.arc(cxx, y + hpx / 2, hpx * 0.28, 0, TAU)
      ctx.fill()
      ctx.fillStyle = Math.floor(env.time * 6 + o.phase) % 2 ? DANGER : th.accent.css
      ctx.beginPath()
      ctx.arc(cxx + Math.sin(env.time * 2 + o.phase) * hpx * 0.1, y + hpx / 2, hpx * 0.12, 0, TAU)
      ctx.fill()
      ctx.font = env.font(clamp(u * 0.55, 9, 12), 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = th.accent2.css
      ctx.fillText('flaky?', cxx, y - u * 0.35)
      ctx.globalAlpha = 1
      return
    }
    const hpx = o.h * u
    const y = gy - hpx
    fillRR(ctx, x, y, wpx, hpx, u * 0.22, DANGER)
    ctx.save()
    rr(ctx, x, y, wpx, hpx, u * 0.22)
    ctx.clip()
    ctx.strokeStyle = th.bg.a(0.3)
    ctx.lineWidth = Math.max(2, u * 0.16)
    ctx.beginPath()
    for (let i = -hpx; i < wpx + hpx; i += u * 0.7) {
      ctx.moveTo(x + i, y + hpx)
      ctx.lineTo(x + i + hpx, y)
    }
    ctx.stroke()
    ctx.restore()
    const s = Math.min(wpx, hpx, u * 1.8) * 0.28
    const mx = x + wpx / 2
    const my = y + Math.min(hpx / 2, u * 1.05)
    ctx.strokeStyle = th.bg.css
    ctx.lineWidth = Math.max(3, u * 0.22)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(mx - s, my - s)
    ctx.lineTo(mx + s, my + s)
    ctx.moveTo(mx + s, my - s)
    ctx.lineTo(mx - s, my + s)
    ctx.stroke()
    if (o.kind === 'tall') {
      ctx.font = env.font(clamp(u * 0.5, 8, 11), 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = th.bg.a(0.85)
      ctx.fillText('FAIL', mx, y + hpx * 0.72)
    }
  }

  function drawRunner() {
    const { ctx, theme: th } = env
    const w0 = RW * u * 1.05
    const h0 = RH * u * 1.05
    const stretch = clamp(Math.abs(vy) * 0.0085, 0, 0.22) * (grounded ? 0 : 1)
    const sq = landSq
    const sy = lerp(1, 0.55, duckK) * (1 + stretch) * (1 - sq * 0.26)
    const sx = lerp(1, 1.2, duckK) * (1 - stretch * 0.55) * (1 + sq * 0.3)
    const bob = grounded && !dead ? Math.abs(Math.sin(env.time * 13)) * u * 0.06 * (1 - duckK) : 0
    const feetY = gy - hy * u - bob
    const tilt = clamp(-vy * 0.008, -0.3, 0.3) * (grounded ? 0 : 1)
    ctx.save()
    ctx.translate(px, feetY)
    ctx.translate(0, (-h0 * sy) / 2)
    ctx.rotate(tilt)
    ctx.translate(0, (h0 * sy) / 2)
    ctx.scale(sx, sy)
    // exhaust flame (behind)
    const fl = (0.45 + 0.3 * Math.sin(env.time * 38)) * u * (grounded ? 0.8 : 1.5)
    ctx.fillStyle = th.accent2.css
    ctx.beginPath()
    ctx.moveTo(-w0 / 2, -h0 * 0.45)
    ctx.lineTo(-w0 / 2 - fl, -h0 * 0.36)
    ctx.lineTo(-w0 / 2, -h0 * 0.27)
    ctx.fill()
    ctx.fillStyle = th.fg.a(0.85)
    ctx.beginPath()
    ctx.moveTo(-w0 / 2, -h0 * 0.4)
    ctx.lineTo(-w0 / 2 - fl * 0.5, -h0 * 0.36)
    ctx.lineTo(-w0 / 2, -h0 * 0.32)
    ctx.fill()
    // belly thrusters when airborne
    if (!grounded) {
      const f2 = (0.3 + 0.2 * Math.sin(env.time * 44)) * u
      ctx.fillStyle = th.accent2.a(0.9)
      for (const fx of [-w0 * 0.22, w0 * 0.22]) {
        ctx.beginPath()
        ctx.moveTo(fx - u * 0.12, 0)
        ctx.lineTo(fx, f2)
        ctx.lineTo(fx + u * 0.12, 0)
        ctx.fill()
      }
    }
    // fins
    ctx.fillStyle = th.accent2.css
    ctx.beginPath()
    ctx.moveTo(-w0 / 2, -h0 * 0.34)
    ctx.lineTo(-w0 / 2 - u * 0.34, 0)
    ctx.lineTo(-w0 / 2 + u * 0.18, 0)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(w0 / 2, -h0 * 0.34)
    ctx.lineTo(w0 / 2 + u * 0.26, 0)
    ctx.lineTo(w0 / 2 - u * 0.18, 0)
    ctx.closePath()
    ctx.fill()
    // body
    fillRR(ctx, -w0 / 2, -h0, w0, h0 * 0.96, u * 0.4, th.accent.css)
    ctx.fillStyle = th.bg.a(0.22)
    ctx.fillRect(-w0 / 2, -h0 * 0.5, w0, u * 0.12)
    // porthole eye
    const ex = w0 * 0.12
    const ey = -h0 * 0.67
    ctx.fillStyle = th.bg.css
    ctx.beginPath()
    ctx.arc(ex, ey, u * 0.4, 0, TAU)
    ctx.fill()
    const blink = Math.floor(env.time * 2.2) % 9 === 0 && (env.time * 2.2) % 1 < 0.2 ? 0.2 : 1
    ctx.fillStyle = th.accent.css
    ctx.beginPath()
    ctx.ellipse(ex + u * 0.08, ey, u * 0.17, u * 0.17 * blink, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  return {
    reset,
    resize: layout,
    update(dt) {
      const play = playing()
      const ambient = env.state === 'ready'
      hintT += dt
      stageFlash = Math.max(0, stageFlash - dt * 2)
      landSq = Math.max(0, landSq - dt * 5)
      live01 = dead ? Math.max(0, live01 - dt * 2.2) : 1
      if (play) t += dt
      else if (ambient) t = Math.min(t + dt * 0.2, 5)
      // narrow screens see fewer units ahead, so ease the top speed a little
      const view = clamp((env.w - px) / u / 18, 0.8, 1)
      speed = (ambient ? 10 : 9.5 + 9 * (1 - Math.exp(-t / 60))) * view
      const sp = speed * live01
      if (!dead && (play || ambient)) {
        if (ambient) autoplay()
        // jump / duck state machine
        jumpBuf = Math.max(0, jumpBuf - dt)
        if (grounded) coyote = 0.1
        else coyote = Math.max(0, coyote - dt)
        if (jumpBuf > 0 && (grounded || coyote > 0)) jump()
        const duckNow = duckHeld
        duckK = lerp(duckK, duckNow && grounded ? 1 : 0, 1 - Math.exp(-dt * 24))
        let g = G
        if (!grounded) {
          if (vy > 0 && !jumpHeld) g *= 2.7
          if (duckNow && vy <= 0.5) g *= 2.4
        }
        if (!grounded) {
          vy -= g * dt
          hy += vy * dt
          if (hy <= 0) {
            hy = 0
            vy = 0
            grounded = true
            landSq = 1
            env.fx.burst(px, gy, th().fg.a(0.55), 8, {
              speed: 120,
              angle: -Math.PI / 2,
              spread: 2.8,
              size: 2,
              g: 70,
              life: 0.4,
            })
          }
        }
        dist += sp * dt
        if (play) {
          scoreF += sp * dt * 0.55
          setScore(scoreF)
        }
        // run dust
        dustT -= dt
        if (grounded && dustT <= 0) {
          dustT = 0.06
          env.fx.burst(px - u * 0.7, gy, th().fg.a(0.45), 1, {
            speed: 60,
            angle: Math.PI,
            spread: 0.7,
            size: 1.8,
            g: -30,
            life: 0.35,
          })
        }
        spawnAhead()
        // stages
        const stageNow = Math.floor((dist - STAGE_OFF) / STAGE_LEN) + 1
        if (dist >= STAGE_OFF && stageNow > stageSeen) {
          stageSeen = stageNow
          stageFlash = 1
          if (play) {
            scoreF += 50
            setScore(scoreF)
            env.sfx('good')
            env.fx.text(px + u * 2, gy - u * 4.5, `${STAGES[(stageNow - 1) % 4]} ✓  +50`, OK, {
              size: 14,
              life: 1.1,
            })
            env.fx.ring(px, gy, OK, { r1: u * 3.5, life: 0.5 })
          }
        }
        const rh = duckK > 0.5 ? DH : RH
        for (const p of picks) {
          if (p.taken) continue
          const dx = p.wx - dist
          const py = p.hgt
          if (Math.abs(dx) < 0.85 && py > hy - 0.5 && py < hy + rh + 0.5) {
            p.taken = true
            if (play) {
              scoreF += 25
              setScore(scoreF)
              env.sfx('pop')
              env.fx.text(px + u, gy - (py + 0.9) * u, '+25', OK, { size: 13, life: 0.7, rise: 22 })
            }
            env.fx.burst(px + dx * u, gy - py * u, OK, 8, { speed: 170, size: 2.4, life: 0.45 })
          }
        }
        if (play) {
          const inset = 0.22
          for (const o of obstacles) {
            if (o.wx > dist + 3) continue
            if (o.wx + o.w < dist - 2) continue
            const bob = o.kind === 'drone' ? Math.sin(env.time * 3 + o.phase) * 0.2 : 0
            const by = o.by + bob
            if (
              o.wx + inset < dist + RW / 2 - inset &&
              o.wx + o.w - inset > dist - RW / 2 + inset &&
              hy < by + o.h - inset &&
              hy + rh > by + inset
            ) {
              die(o.kind === 'drone' ? 'FLAKY TEST' : 'BUILD FAILED')
              break
            }
          }
        }
      } else if (dead) {
        dist += sp * dt
      }
      for (let i = obstacles.length - 1; i >= 0; i--)
        if (obstacles[i].wx + obstacles[i].w < dist - (px / u + 4)) obstacles.splice(i, 1)
      for (let i = picks.length - 1; i >= 0; i--)
        if (picks[i].taken || picks[i].wx < dist - (px / u + 4)) picks.splice(i, 1)
    },
    render() {
      const { ctx, theme: th } = env
      drawBackdrop()
      drawPipeline()
      for (const p of picks) if (!p.taken) drawPick(p)
      for (const o of obstacles) drawObs(o)
      if (!(dead && env.state === 'over')) drawRunner()
      // HUD strip
      if (env.state !== 'ready') {
        const stage = STAGES[Math.max(0, stageSeen - 1) % 4]
        ctx.font = env.font(11, 700)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillStyle = th.fg.a(0.5)
        ctx.fillText(
          `PIPELINE #${Math.floor(stageSeen / 4) + 1}  ·  ${stage.toUpperCase()}  ·  ×${(speed / (9.5 * clamp((env.w - px) / u / 18, 0.8, 1))).toFixed(1)}`,
          env.w / 2,
          24,
        )
      }
      if (playing() && hintT < 4.5 && !dead) {
        ctx.globalAlpha = clamp((4.5 - hintT) / 1, 0, 1) * 0.85
        ctx.font = env.font(clamp(u * 0.78, 12, 17), 700)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = th.fg.css
        ctx.fillText(
          env.coarse ? 'tap to jump · hold the bottom to duck' : 'space to jump · ↓ to duck',
          env.w / 2,
          gy - u * 9,
        )
        if (env.coarse) {
          ctx.fillStyle = th.fg.a(0.07)
          const zy = gy + (env.h - gy) * 0.33
          ctx.fillRect(0, zy, env.w, env.h - zy)
          ctx.fillStyle = th.fg.a(0.5)
          ctx.font = env.font(12, 800)
          ctx.fillText('⌄  HOLD TO DUCK  ⌄', env.w / 2, zy + (env.h - zy) / 2)
        }
        ctx.globalAlpha = 1
      }
    },
    pointerDown(p) {
      if (ptr) return
      if (duckZone(p.y)) {
        ptr = { id: p.id, y0: p.y, mode: 'duck' }
        duckHeld = true
      } else {
        ptr = { id: p.id, y0: p.y, mode: 'jump' }
        jumpBuf = 0.12
        jumpHeld = true
      }
    },
    pointerMove(p) {
      // swipe down from a jump press converts it into a duck
      if (ptr && ptr.mode === 'jump' && p.down && p.y - ptr.y0 > 38) {
        ptr.mode = 'duck'
        jumpHeld = false
        duckHeld = true
      }
    },
    pointerUp() {
      if (!ptr) return
      if (ptr.mode === 'duck') duckHeld = false
      else jumpHeld = false
      ptr = null
    },
    key(e, down) {
      switch (e.key) {
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (down && !e.repeat) jumpBuf = 0.12
          jumpHeld = down
          return true
        case 'ArrowDown':
        case 's':
        case 'S':
          duckHeld = down
          return true
      }
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
