'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER } from '../_shared/color'
import { fillRR, rr } from '../_shared/draw'
import { TAU, chance, clamp, easeOutCubic, hash01, lerp, rand } from '../_shared/math'

const META: GameMeta = {
  key: 'bug-squash',
  title: 'Bug Squash',
  how: [
    { k: 'Tap', t: 'Squash bugs before they crawl into PROD.' },
    { k: '×N', t: 'Chain squashes fast to raise the combo multiplier.' },
    { k: 'Care', t: 'Never squash a green feature. That breaks the build.' },
  ],
  controls: 'Click or tap · Space squashes the nearest bug · P / Esc pauses',
  touch: 'pan-y',
  cursor: 'crosshair',
  keys: [' '],
}

type Kind = 'beetle' | 'sprinter' | 'tank' | 'feature'
type Bug = {
  kind: Kind
  x: number
  y: number
  r: number
  speed: number
  hp: number
  maxHp: number
  t: number
  wob: number
  wobF: number
  ang: number
  vy: number
  flash: number
  gait: number
}
type Decal = {
  x: number
  y: number
  age: number
  r: number
  rot: number
  blobs: [number, number, number][]
}

const LIVES = 3

const create: GameFactory = (env) => {
  let bugs: Bug[] = []
  let decals: Decal[] = []
  let t = 0
  let lives = LIVES
  let combo = 0
  let comboT = 0
  let score = 0
  let spawnT = 0
  let scroll = 0
  let gateFlash = 0
  let seeded = false
  let hoverY = -1
  let lostPulse = 0

  let palFor: unknown = null
  let pal: string[] = []

  const lineH = () => clamp(env.h / 17, 22, 32)
  const gutter = () => (env.w < 420 ? 28 : 40)
  const gateW = () => 12
  const baseR = () => clamp(Math.min(env.w, env.h) * 0.062, 17, 30)
  const diff = () => 1 - Math.exp(-t / 42)
  const mult = () => Math.min(8, 1 + Math.floor((combo - 1) / 4))

  function palette() {
    if (palFor === env.theme) return
    palFor = env.theme
    const th = env.theme
    pal = [th.accent2.a(0.55), th.fg.a(0.26), th.accent.a(0.5), th.fg.a(0.14), th.muted.a(0.9)]
  }

  function spawn(atX?: number) {
    const d = diff()
    const r0 = baseR()
    let kind: Kind = 'beetle'
    const roll = Math.random()
    const pFeature = t > 6 ? 0.13 : 0
    const pTank = t > 18 ? 0.12 + d * 0.12 : 0
    const pSprint = t > 8 ? 0.12 + d * 0.28 : 0
    if (roll < pFeature) kind = 'feature'
    else if (roll < pFeature + pTank) kind = 'tank'
    else if (roll < pFeature + pTank + pSprint) kind = 'sprinter'
    const mul = lerp(1, 2.45, d)
    const base = env.w * 0.09 * mul
    const spec: Record<Kind, { r: number; sp: number; hp: number }> = {
      beetle: { r: 1, sp: 1, hp: 1 },
      sprinter: { r: 0.78, sp: 1.85, hp: 1 },
      tank: { r: 1.35, sp: 0.55, hp: 2 },
      feature: { r: 1, sp: 0.8, hp: 1 },
    }
    const s = spec[kind]
    const r = r0 * s.r
    const top = 56 + r
    const y = rand(top, Math.max(top + 1, env.h - r - 14))
    bugs.push({
      kind,
      x: atX ?? gutter() - r - rand(0, 40),
      y,
      r,
      speed: base * s.sp * rand(0.9, 1.1),
      hp: s.hp,
      maxHp: s.hp,
      t: rand(0, 10),
      wob: kind === 'sprinter' ? rand(40, 70) : rand(10, 26),
      wobF: kind === 'sprinter' ? rand(5, 8) : rand(2, 4),
      ang: 0,
      vy: 0,
      flash: 0,
      gait: kind === 'sprinter' ? 26 : kind === 'tank' ? 9 : 15,
    })
  }

  function splat(b: Bug, color: string) {
    const blobs: Decal['blobs'] = []
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.3, 0.3)
      const d = b.r * rand(0.5, 1.3)
      blobs.push([Math.cos(a) * d, Math.sin(a) * d, b.r * rand(0.16, 0.4)])
    }
    decals.push({ x: b.x, y: b.y, age: 0, r: b.r, rot: rand(0, TAU), blobs })
    if (decals.length > 24) decals.shift()
    env.fx.burst(b.x, b.y, color, 14, { speed: 260, size: 3.2, life: 0.55, g: 380 })
    env.fx.burst(b.x, b.y, env.theme.fg.a(0.9), 5, {
      speed: 160,
      size: 2,
      life: 0.4,
      square: true,
      g: 300,
    })
    env.fx.ring(b.x, b.y, color, { r1: b.r * 2.2, life: 0.35 })
  }

  function lose(reason: string, x: number, y: number) {
    lives -= 1
    combo = 0
    comboT = 0
    lostPulse = 1
    env.shake(11)
    env.sfx('bad')
    env.fx.text(x, y, reason, DANGER, { size: 14, life: 1.1 })
    if (lives <= 0) {
      env.sfx('lose')
      env.gameOver(score)
    }
  }

  function hit(px: number, py: number) {
    const extra = env.coarse ? 14 : 4
    let best: Bug | null = null
    let bd = Infinity
    for (const b of bugs) {
      const d = Math.hypot(b.x - px, b.y - py)
      if (d < b.r * 1.25 + extra && d < bd) {
        best = b
        bd = d
      }
    }
    const th = env.theme
    if (!best) {
      if (combo > 0)
        env.fx.text(px, py - 6, 'miss', th.fg.a(0.6), { size: 12, life: 0.6, rise: 18 })
      env.fx.ring(px, py, th.fg.a(0.4), { r1: 22, life: 0.25, width: 2 })
      combo = 0
      comboT = 0
      return
    }
    if (best.kind === 'feature') {
      bugs.splice(bugs.indexOf(best), 1)
      env.fx.burst(best.x, best.y, th.accent.css, 18, { speed: 280, g: 200 })
      lose('FEATURE BROKEN', best.x, best.y)
      return
    }
    best.hp -= 1
    if (best.hp > 0) {
      best.flash = 1
      best.x += 10
      env.shake(3)
      env.sfx('hit')
      env.fx.burst(best.x, best.y, th.fg.a(0.9), 6, { speed: 180, size: 2, square: true })
      env.fx.text(best.x, best.y - best.r, 'CRACK', th.fg.css, { size: 11, life: 0.6, rise: 20 })
      return
    }
    bugs.splice(bugs.indexOf(best), 1)
    combo += 1
    comboT = 1.7
    const base = best.kind === 'tank' ? 40 : best.kind === 'sprinter' ? 25 : 10
    const gain = base * mult()
    score += gain
    env.score(score)
    splat(best, best.kind === 'sprinter' ? DANGER : th.accent.css)
    env.shake(best.kind === 'tank' ? 6 : 2.5)
    env.sfx('pop')
    env.fx.text(best.x, best.y - best.r * 1.1, `+${gain}`, mult() > 1 ? th.accent.css : th.fg.css, {
      size: 14 + Math.min(10, mult() * 2),
    })
    if (combo > 0 && combo % 4 === 0) {
      env.sfx('good')
      env.fx.text(env.w / 2, 86, `COMBO ×${mult()}`, th.accent2.css, {
        size: 22,
        life: 1,
        rise: 14,
      })
    }
  }

  /* ---------- drawing ---------- */
  function drawCode() {
    const { ctx, w, h, theme: th } = env
    const lh = lineH()
    const g = gutter()
    const hh = lh * 0.3
    const ws = clamp(w / 640, 0.55, 1.3)
    const base = Math.floor(scroll / lh)
    const off = scroll - base * lh
    ctx.font = env.font(10.5, 500)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let k = 0; k * lh - off < h + lh; k++) {
      const i = base + k
      const y = k * lh - off
      if (hoverY >= y && hoverY < y + lh) {
        ctx.fillStyle = th.fg.a(0.045)
        ctx.fillRect(g, y, w - g, lh)
      }
      ctx.fillStyle = th.fg.a(0.22)
      ctx.fillText(String(i + 1), g - 8, y + lh / 2)
      if (hash01(i * 7 + 5) < 0.1) continue
      const indent = Math.floor(hash01(i * 13 + 1) * 4)
      let x = g + 14 + indent * 16 * ws
      const n = 2 + Math.floor(hash01(i * 17 + 2) * 5)
      for (let s = 0; s < n; s++) {
        const wdt = (12 + hash01(i * 31 + s * 7 + 3) * 64) * ws
        ctx.fillStyle = pal[Math.floor(hash01(i * 11 + s * 5 + 4) * 5)]
        rr(ctx, x, y + (lh - hh) / 2, wdt, hh, hh / 2)
        ctx.fill()
        x += wdt + 7 * ws
        if (x > w) break
      }
    }
    ctx.strokeStyle = th.fg.a(0.1)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(g + 0.5, 0)
    ctx.lineTo(g + 0.5, h)
    ctx.stroke()
    const vg = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.3,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75,
    )
    vg.addColorStop(0, th.bg.a(0))
    vg.addColorStop(1, th.bg.a(0.7))
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }

  function drawGate() {
    const { ctx, w, h, theme: th } = env
    const gw = gateW()
    let near = 0
    for (const b of bugs) near = Math.max(near, clamp(1 - (w - b.x) / (w * 0.25), 0, 1))
    const a = 0.22 + near * 0.3 + gateFlash * 0.5
    const g = ctx.createLinearGradient(w - gw * 3, 0, w, 0)
    g.addColorStop(0, 'rgba(255,77,109,0)')
    g.addColorStop(1, `rgba(255,77,109,${a})`)
    ctx.fillStyle = g
    ctx.fillRect(w - gw * 3, 0, gw * 3, h)
    ctx.fillStyle = `rgba(255,77,109,${0.55 + gateFlash * 0.45})`
    ctx.fillRect(w - 3, 0, 3, h)
    ctx.save()
    ctx.translate(w - gw - 3, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = env.font(10, 800)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = `rgba(255,77,109,${0.7 + gateFlash * 0.3})`
    ctx.fillText('P R O D', 0, 0)
    ctx.restore()
  }

  function drawFeature(b: Bug) {
    const { ctx, theme: th } = env
    const s = b.r
    const bob = Math.sin(b.t * 3) * 2
    ctx.save()
    ctx.translate(b.x, b.y + bob)
    fillRR(ctx, -s, -s * 0.8, s * 2, s * 1.6, s * 0.45, th.accent.css)
    ctx.strokeStyle = th.bg.css
    ctx.lineWidth = Math.max(2.5, s * 0.18)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-s * 0.42, 0)
    ctx.lineTo(-s * 0.1, s * 0.3)
    ctx.lineTo(s * 0.46, -s * 0.28)
    ctx.stroke()
    ctx.font = env.font(Math.max(8, s * 0.42), 800)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = th.accent.a(0.9)
    ctx.fillText('FEATURE', 0, s * 0.95)
    ctx.restore()
  }

  function drawBug(b: Bug) {
    if (b.kind === 'feature') return drawFeature(b)
    const { ctx, theme: th } = env
    const s = b.r
    const body =
      b.kind === 'sprinter'
        ? DANGER
        : b.kind === 'tank'
          ? th.accent2.mix(th.fg, 0.4)
          : th.accent2.css
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.ang)
    ctx.lineCap = 'round'
    ctx.strokeStyle = th.fg.a(0.7)
    ctx.lineWidth = Math.max(1.6, s * 0.11)
    for (let i = 0; i < 3; i++) {
      const lx = (-0.5 + i * 0.5) * s
      const sw = Math.sin(b.t * b.gait + i * 2.1) * 0.38 * s
      ctx.beginPath()
      ctx.moveTo(lx, -0.35 * s)
      ctx.lineTo(lx + sw, -1.12 * s)
      ctx.moveTo(lx, 0.35 * s)
      ctx.lineTo(lx - sw, 1.12 * s)
      ctx.stroke()
    }
    const ry = b.kind === 'sprinter' ? 0.55 : b.kind === 'tank' ? 0.85 : 0.72
    // antennae
    ctx.beginPath()
    ctx.moveTo(1.1 * s, -0.15 * s)
    ctx.quadraticCurveTo(1.6 * s, -0.4 * s, 1.85 * s, -0.75 * s + Math.sin(b.t * 6) * 0.1 * s)
    ctx.moveTo(1.1 * s, 0.15 * s)
    ctx.quadraticCurveTo(1.6 * s, 0.4 * s, 1.85 * s, 0.75 * s - Math.sin(b.t * 6) * 0.1 * s)
    ctx.stroke()
    // body
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.ellipse(-0.1 * s, 0, 1.0 * s, ry * s, 0, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(1.0 * s, 0, 0.42 * s, 0, TAU)
    ctx.fill()
    // shell detail
    ctx.strokeStyle = th.bg.a(0.5)
    ctx.lineWidth = Math.max(1.2, s * 0.08)
    ctx.beginPath()
    ctx.moveTo(-1.0 * s, 0)
    ctx.lineTo(0.6 * s, 0)
    ctx.stroke()
    ctx.fillStyle = th.bg.a(0.35)
    for (const [px, py] of [
      [-0.35, -0.3],
      [-0.35, 0.3],
      [0.2, -0.26],
      [0.2, 0.26],
    ]) {
      ctx.beginPath()
      ctx.arc(px * s, py * s * (ry / 0.72), s * 0.1, 0, TAU)
      ctx.fill()
    }
    // eyes
    ctx.fillStyle = th.bg.css
    ctx.beginPath()
    ctx.arc(1.15 * s, -0.17 * s, s * 0.1, 0, TAU)
    ctx.arc(1.15 * s, 0.17 * s, s * 0.1, 0, TAU)
    ctx.fill()
    if (b.kind === 'tank' && b.hp < b.maxHp) {
      ctx.strokeStyle = th.bg.css
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-0.6 * s, -0.5 * s)
      ctx.lineTo(-0.2 * s, -0.05 * s)
      ctx.lineTo(-0.5 * s, 0.25 * s)
      ctx.lineTo(0.0, 0.6 * s)
      ctx.stroke()
    }
    if (b.flash > 0) {
      ctx.globalAlpha = b.flash * 0.8
      ctx.fillStyle = th.fg.css
      ctx.beginPath()
      ctx.ellipse(-0.1 * s, 0, 1.0 * s, ry * s, 0, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  function drawHud() {
    const { ctx, w, theme: th } = env
    // server pips = lives
    const cx = w / 2
    for (let i = 0; i < LIVES; i++) {
      const x = cx + (i - 1) * 24 - 8
      const alive = i < lives
      const pulse = !alive && lostPulse > 0 && i === lives ? lostPulse : 0
      fillRR(ctx, x, 10 - pulse * 2, 16, 20, 4, alive ? th.accent.a(0.9) : th.fg.a(0.12))
      ctx.fillStyle = alive ? th.bg.a(0.85) : DANGER
      ctx.fillRect(x + 3, 15, 10, 2)
      ctx.fillRect(x + 3, 21, 6, 2)
    }
    if (combo >= 2) {
      const m = mult()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.font = env.font(13, 800)
      ctx.fillStyle = th.fg.a(0.75)
      ctx.fillText(`COMBO ${combo}`, cx, 50)
      ctx.font = env.font(m > 1 ? 24 : 18, 800)
      ctx.fillStyle = m > 1 ? th.accent2.css : th.fg.css
      ctx.fillText(`×${m}`, cx, 74)
      ctx.fillStyle = th.fg.a(0.12)
      ctx.fillRect(cx - 28, 82, 56, 3)
      ctx.fillStyle = th.accent.css
      ctx.fillRect(cx - 28, 82, 56 * clamp(comboT / 1.7, 0, 1), 3)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = env.font(10, 700)
    ctx.fillStyle = th.fg.a(0.35)
    ctx.fillText(`SPRINT ${1 + Math.floor(t / 15)}`, gutter() + 12, env.h - 10)
  }

  return {
    reset() {
      bugs = []
      decals = []
      t = 0
      lives = LIVES
      combo = 0
      comboT = 0
      score = 0
      spawnT = 0.5
      gateFlash = 0
      lostPulse = 0
      seeded = false
    },
    update(dt) {
      const playing = env.state === 'playing'
      const ambient = env.state === 'ready'
      palette()
      scroll += dt * (playing ? 14 + diff() * 34 : 12)
      if (playing) t += dt
      gateFlash = Math.max(0, gateFlash - dt * 2.4)
      lostPulse = Math.max(0, lostPulse - dt * 2)
      if (ambient && !seeded) {
        seeded = true
        for (let i = 0; i < 5; i++) spawn(rand(env.w * 0.1, env.w * 0.8))
      }
      if (playing || ambient) {
        spawnT -= dt
        if (spawnT <= 0) {
          const d = diff()
          spawnT = playing ? lerp(2.1, 0.4, d) * rand(0.8, 1.2) : 1.4
          if (!ambient || bugs.length < 7) spawn()
          if (playing && chance(0.1 + d * 0.35)) spawn()
        }
      }
      if (comboT > 0) {
        comboT -= dt
        if (comboT <= 0) combo = 0
      }
      const gx = env.w - gateW() - 2
      for (let i = bugs.length - 1; i >= 0; i--) {
        const b = bugs[i]
        b.t += dt
        b.flash = Math.max(0, b.flash - dt * 5)
        const wy = Math.cos(b.t * b.wobF) * b.wob * b.wobF * 0.02
        b.vy = wy * 60
        b.x += b.speed * dt
        b.y = clamp(b.y + b.vy * dt, 52 + b.r * 0.4, env.h - b.r - 6)
        b.ang = Math.atan2(b.vy, b.speed) * 0.7
        if (b.x - b.r * 0.4 >= gx) {
          bugs.splice(i, 1)
          if (b.kind !== 'feature' && playing) {
            gateFlash = 1
            lose('SHIPPED TO PROD', env.w - 90, b.y)
          } else if (b.kind === 'feature' && playing) {
            // features reaching prod = good
            score += 15
            env.score(score)
            env.fx.text(env.w - 80, b.y, '+15 shipped', env.theme.accent.css, { size: 12 })
            env.fx.ring(gx, b.y, env.theme.accent.css, { r1: 30 })
            env.sfx('good')
          }
        }
      }
      for (let i = decals.length - 1; i >= 0; i--) {
        decals[i].age += dt
        if (decals[i].age > 2.4) decals.splice(i, 1)
      }
    },
    render() {
      const { ctx, theme: th } = env
      palette()
      drawCode()
      for (const d of decals) {
        const k = d.age / 2.4
        ctx.globalAlpha = (1 - k) * 0.55
        ctx.fillStyle = th.accent.css
        ctx.save()
        ctx.translate(d.x, d.y)
        ctx.rotate(d.rot)
        const grow = easeOutCubic(Math.min(1, d.age / 0.12))
        ctx.beginPath()
        ctx.arc(0, 0, d.r * 0.7 * grow, 0, TAU)
        for (const [bx, by, br] of d.blobs) {
          ctx.moveTo(bx * grow + br, by * grow)
          ctx.arc(bx * grow, by * grow, br * grow, 0, TAU)
        }
        ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
      drawGate()
      for (const b of bugs) drawBug(b)
      if (env.state !== 'ready') drawHud()
    },
    pointerDown(p) {
      env.sfx('click')
      hit(p.x, p.y)
    },
    pointerMove(p) {
      hoverY = p.y
    },
    key(e, down) {
      // Space / Enter squash at the last hover row for keyboard access.
      if (down && e.key === ' ') {
        const live = bugs.filter((c) => c.kind !== 'feature')
        if (!live.length) return true
        const b = live.reduce((a, c) => (c.x > a.x ? c : a))
        hit(b.x, b.y)
        return true
      }
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
