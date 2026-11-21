'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER, OK } from '../_shared/color'
import { rr } from '../_shared/draw'
import { TAU, clamp, damp, easeOutBack, hash01, lerp, rand } from '../_shared/math'

const META: GameMeta = {
  key: 'server-stack',
  title: 'Server Stack',
  how: [
    { k: 'Tap', t: 'Drop the sliding server onto the rack.' },
    { k: 'Trim', t: 'Anything hanging over the edge is cut off. The rack gets narrower.' },
    {
      k: 'Perfect',
      t: 'Land dead-on to keep your width and build a streak. 3 in a row grows it back.',
    },
  ],
  controls: 'Click, tap or Space to drop · Esc pauses',
  touch: 'pan-y',
  cursor: 'pointer',
  keys: [' ', 'ArrowDown'],
}

type Unit = { x: number; w: number; floor: number; fall: number; squash: number; glow: number }
type Debris = {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  rot: number
  vr: number
  color: string
  floor: number
}

const tri = (p: number) => {
  const q = ((p % 2) + 2) % 2
  return q < 1 ? q : 2 - q
}

const create: GameFactory = (env) => {
  let tower: Unit[] = []
  let debris: Debris[] = []
  let phase = 0
  let movePop = 0
  let score = 0
  let streak = 0
  let cam = 0
  let prevW = 0
  let baseW = 0
  let shownFloors = 0
  let flash = 0

  const uh = () => clamp(env.h * 0.062, 22, 40)
  const groundY = () => env.h - clamp(env.h * 0.07, 28, 56)
  const hoverGap = () => uh() * 1.5
  const speed = () => lerp(0.58, 1.35, 1 - Math.exp(-tower.length / 34)) // screen-widths per second (centre travel)
  const surfaceY = (floor: number) => groundY() - (floor + 1) * uh() + cam // top edge of a unit in screen px

  const top = () => tower[tower.length - 1]
  const mw = () => top().w
  const mx = () => tri(phase) * env.w - mw() / 2

  function color(floor: number) {
    const th = env.theme
    const t = (floor * 0.09) % 2
    return th.accent.mix(th.accent2, t < 1 ? t : 2 - t)
  }

  function unitBody(
    x: number,
    y: number,
    w: number,
    h: number,
    floor: number,
    col: string,
    led: number,
  ) {
    const { ctx, theme: th } = env
    const r = Math.min(5, h * 0.22)
    rr(ctx, x, y, w, h - 1, r)
    ctx.fillStyle = col
    ctx.fill()
    const sh = ctx.createLinearGradient(0, y, 0, y + h)
    sh.addColorStop(0, 'rgba(255,255,255,0.18)')
    sh.addColorStop(0.5, 'rgba(0,0,0,0)')
    sh.addColorStop(1, 'rgba(0,0,0,0.22)')
    rr(ctx, x, y, w, h - 1, r)
    ctx.fillStyle = sh
    ctx.fill()
    if (w < 60) return
    // vents
    const vents = Math.min(12, Math.floor((w * 0.3) / 6))
    ctx.fillStyle = th.bg.a(0.38)
    for (let i = 0; i < vents; i++) ctx.fillRect(x + 10 + i * 6, y + h * 0.28, 2.2, h * 0.42)
    // LEDs
    const lx = x + w - 12
    const dots = [
      th.bg.a(0.85),
      hash01(floor * 31 + Math.floor(env.time * 3 * (1 + (floor % 3) * 0.3))) > 0.4
        ? OK
        : th.bg.a(0.4),
      hash01(floor * 17 + Math.floor(env.time * 1.5)) > 0.8 ? '#ffb020' : th.bg.a(0.4),
    ]
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = dots[i]
      ctx.beginPath()
      ctx.arc(lx - i * 8, y + h / 2 - 0.5, 2.1, 0, TAU)
      ctx.fill()
    }
    if (led > 0) {
      ctx.fillStyle = `rgba(255,255,255,${led * 0.5})`
      rr(ctx, x, y, w, h - 1, r)
      ctx.fill()
    }
    if (w > 150 && h >= 24) {
      ctx.font = env.font(Math.max(8, h * 0.3), 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = th.bg.a(0.6)
      ctx.fillText(`SRV-${String(floor + 1).padStart(3, '0')}`, x + w / 2, y + h / 2)
    }
  }

  function drop() {
    if (env.state !== 'playing') return
    const t = top()
    const m = { x: mx(), w: mw() }
    const h = uh()
    const floor = tower.length
    const tol = Math.max(5, m.w * 0.03)
    const off = m.x - t.x
    const overlap = Math.min(m.x + m.w, t.x + t.w) - Math.max(m.x, t.x)
    const th = env.theme
    const y = surfaceY(floor)
    env.sfx('drop')
    if (overlap <= 2) {
      // miss — whole unit falls off
      debris.push({
        x: m.x,
        y: y - hoverGap() * 0.4 - cam,
        w: m.w,
        h,
        vx: off > 0 ? 90 : -90,
        vy: 40,
        rot: 0,
        vr: off > 0 ? 2.2 : -2.2,
        color: DANGER,
        floor,
      })
      env.shake(12)
      env.sfx('lose')
      env.fx.text(env.w / 2, y - 30, 'MISSED THE RACK', DANGER, { size: 15, life: 1.2 })
      flash = 1
      env.gameOver(score)
      return
    }
    let nx = Math.max(m.x, t.x)
    let nw = overlap
    const perfect = Math.abs(off) <= tol
    if (perfect) {
      nx = t.x
      nw = t.w
      streak += 1
      if (streak >= 3) {
        const grown = Math.min(baseW, nw * 1.08 + 3)
        nx -= (grown - nw) / 2
        nw = grown
      }
    } else {
      streak = 0
      // trimmed chunk falls away
      const cw = m.w - overlap
      const cx = off < 0 ? m.x : t.x + t.w
      debris.push({
        x: cx,
        y: y - cam,
        w: cw,
        h,
        vx: off < 0 ? -rand(40, 90) : rand(40, 90),
        vy: rand(-30, 20),
        rot: 0,
        vr: off < 0 ? -rand(1, 2.5) : rand(1, 2.5),
        color: color(floor),
        floor,
      })
      env.shake(Math.min(7, 2 + (cw / m.w) * 8))
      env.sfx('hit')
    }
    tower.push({ x: nx, w: nw, floor, fall: hoverGap(), squash: 1, glow: perfect ? 1 : 0 })
    const gain = 1 + (perfect ? 1 + Math.min(5, streak) : 0)
    score += gain
    env.score(score)
    const cx = nx + nw / 2
    if (perfect) {
      env.sfx('good')
      env.fx.ring(cx, y + h / 2, th.fg.a(0.8), {
        r0: nw * 0.25,
        r1: nw * 0.75,
        life: 0.5,
        width: 3,
      })
      env.fx.burst(cx, y + h / 2, color(floor), 16, {
        speed: 240,
        size: 3,
        g: 260,
        angle: -Math.PI / 2,
        spread: 2.4,
      })
      env.fx.text(cx, y - h * 0.9, streak > 1 ? `PERFECT ×${streak}` : 'PERFECT', th.accent.css, {
        size: 16 + Math.min(8, streak * 1.5),
        life: 0.95,
      })
    } else {
      env.fx.text(cx, y - h * 0.8, `+${gain}`, th.fg.a(0.85), { size: 13, life: 0.6, rise: 24 })
    }
    phase = floor % 2 === 0 ? 0 : 1
    movePop = 0
    if (tower.length > 0 && tower.length % 10 === 0) {
      env.fx.text(env.w / 2, env.h * 0.3, `${tower.length}U RACK`, th.accent2.css, {
        size: 26,
        life: 1.4,
        rise: 20,
      })
    }
  }

  function drawBackdrop() {
    const { ctx, w, h, theme: th } = env
    // distant server-room LEDs (parallax)
    const step = 24
    const par = cam * 0.25
    const cols = Math.ceil(w / step) + 1
    const rows = Math.ceil(h / step) + 2
    const off = par % step
    const row0 = Math.floor(par / step)
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const id = (row0 - j) * 977 + i * 131
        const base = hash01(id)
        if (base < 0.72) continue
        const on = hash01(id + Math.floor(env.time * (0.6 + base)))
        ctx.fillStyle = on > 0.5 ? th.accent.a(0.2) : th.fg.a(0.07)
        ctx.fillRect(i * step + 6, h - (j * step - off) - 8, 2.4, 2.4)
      }
    }
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, th.bg.a(0.0))
    g.addColorStop(1, th.accent2.a(0.08))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  function drawRails() {
    const { ctx, w, h, theme: th } = env
    const hh = uh()
    const g = groundY()
    const half = baseW / 2 + 16
    const cx = w / 2
    ctx.strokeStyle = th.fg.a(0.1)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - half, 0)
    ctx.lineTo(cx - half, g + cam)
    ctx.moveTo(cx + half, 0)
    ctx.lineTo(cx + half, g + cam)
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.strokeStyle = th.fg.a(0.07)
    ctx.beginPath()
    const j0 = Math.max(0, Math.floor((cam - 0) / hh) - 1)
    for (let j = j0; g - j * hh + cam > -hh; j++) {
      const y = g - j * hh + cam
      if (y > h + hh) continue
      ctx.moveTo(cx - half - 6, y + 0.5)
      ctx.lineTo(cx - half + 4, y + 0.5)
      ctx.moveTo(cx + half - 4, y + 0.5)
      ctx.lineTo(cx + half + 6, y + 0.5)
    }
    ctx.stroke()
    ctx.font = env.font(9, 700)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let n = 10; n < tower.length + 14; n += 10) {
      const y = g - n * hh + cam
      if (y < -10 || y > h + 10) continue
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = th.accent2.a(0.35)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = th.accent2.a(0.8)
      ctx.fillText(`${n}U`, w - 10, y - 8)
    }
    // ground
    ctx.fillStyle = th.fg.a(0.08)
    ctx.fillRect(0, g + cam, w, h)
    ctx.fillStyle = th.fg.a(0.25)
    ctx.fillRect(0, g + cam, w, 2)
  }

  return {
    reset() {
      const w = env.w
      baseW = clamp(w * 0.5, 110, 300)
      prevW = w
      tower = [{ x: w / 2 - baseW / 2, w: baseW, floor: 0, fall: 0, squash: 0, glow: 0 }]
      debris = []
      phase = 0
      movePop = 0
      score = 0
      streak = 0
      cam = 0
      shownFloors = 0
      flash = 0
    },
    resize() {
      if (!prevW) {
        prevW = env.w
        return
      }
      const k = env.w / prevW
      prevW = env.w
      baseW *= k
      for (const u of tower) {
        u.x *= k
        u.w *= k
      }
      for (const d of debris) {
        d.x *= k
        d.w *= k
      }
    },
    update(dt) {
      const playing = env.state === 'playing'
      if (env.state !== 'over') {
        phase += (speed() * dt) / 1
        movePop = Math.min(1, movePop + dt * 7)
      }
      const target = Math.max(0, env.h * 0.6 - (groundY() - tower.length * uh()))
      cam = damp(cam, target, 5, dt)
      flash = Math.max(0, flash - dt * 2)
      for (const u of tower) {
        u.fall *= Math.exp(-dt * 26)
        if (u.fall < 0.4) u.fall = 0
        u.squash = Math.max(0, u.squash - dt * 6)
        u.glow = Math.max(0, u.glow - dt * 1.6)
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i]
        d.vy += 1500 * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.rot += d.vr * dt
        if (d.y + cam > env.h + 120) debris.splice(i, 1)
      }
      if (playing) shownFloors = tower.length - 1
    },
    render() {
      const { ctx, w, theme: th } = env
      drawBackdrop()
      drawRails()
      const hh = uh()
      // tower
      for (const u of tower) {
        const y = surfaceY(u.floor) - u.fall
        if (y > env.h + hh || y < -hh) continue
        const sq = u.squash
        ctx.save()
        ctx.translate(u.x + u.w / 2, y + hh)
        ctx.scale(1 + sq * 0.04, 1 - sq * 0.1)
        unitBody(-u.w / 2, -hh, u.w, hh, u.floor, color(u.floor), u.glow)
        ctx.restore()
        if (u.glow > 0) {
          ctx.globalAlpha = u.glow * 0.5
          ctx.strokeStyle = th.fg.css
          ctx.lineWidth = 2
          rr(ctx, u.x - 2, y - 2, u.w + 4, hh + 3, 6)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
      // moving unit
      if (env.state !== 'over') {
        const t = top()
        const floor = tower.length
        const y = surfaceY(floor) - hoverGap()
        const x = mx()
        const s = easeOutBack(movePop)
        ctx.save()
        ctx.translate(x + t.w / 2, y + hh / 2)
        ctx.scale(lerp(0.85, 1, s), lerp(0.85, 1, s))
        ctx.globalAlpha = clamp(movePop * 1.5, 0, 1)
        unitBody(-t.w / 2, -hh / 2, t.w, hh, floor, color(floor), 0)
        ctx.restore()
        ctx.globalAlpha = 1
        // drop guide
        const off = Math.abs(x - t.x)
        const near = clamp(1 - off / Math.max(14, t.w * 0.22), 0, 1)
        ctx.strokeStyle = th.fg.a(0.1 + near * 0.35)
        ctx.setLineDash([3, 5])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y + hh)
        ctx.lineTo(x, surfaceY(floor - 1))
        ctx.moveTo(x + t.w, y + hh)
        ctx.lineTo(x + t.w, surfaceY(floor - 1))
        ctx.stroke()
        ctx.setLineDash([])
      }
      // debris
      for (const d of debris) {
        ctx.save()
        ctx.translate(d.x + d.w / 2, d.y + cam + hh / 2)
        ctx.rotate(d.rot)
        ctx.globalAlpha = 0.9
        unitBody(-d.w / 2, -hh / 2, d.w, hh, d.floor, d.color, 0)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,77,109,${flash * 0.18})`
        ctx.fillRect(0, 0, w, env.h)
      }
      if (env.state === 'playing' || env.state === 'over') {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.font = env.font(11, 800)
        ctx.fillStyle = th.fg.a(0.5)
        ctx.fillText(`${shownFloors}U`, w / 2, 22)
        if (streak > 0) {
          ctx.fillStyle = th.accent.css
          ctx.font = env.font(10, 800)
          ctx.fillText(`STREAK ${streak}`, w / 2, 38)
        }
      }
    },
    pointerDown() {
      drop()
    },
    key(e, down) {
      if (down && !e.repeat && (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter')) {
        drop()
        return true
      }
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
