'use client'

import { GameShell } from '../_shared/GameShell'
import type { Env, GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import type { Col, Theme } from '../_shared/color'
import { circle, fillRR, glow, strokeRR } from '../_shared/draw'
import {
  TAU,
  clamp,
  damp,
  easeOutBack,
  easeOutCubic,
  hash01,
  lerp,
  rand,
  randInt,
  shuffle,
} from '../_shared/math'

const META: GameMeta = {
  key: 'shutter-snap',
  title: 'Shutter Snap',
  how: [
    { k: 'Hold', t: 'Hold anywhere (or Space) to pull the subject into focus.' },
    { k: 'Let go', t: 'Release to shoot when it sits on a thirds point.' },
    { k: '8 shots', t: 'Sharp and well composed = Frameworthy. Hold too long and focus hunts.' },
  ],
  controls: 'Hold pointer or Space to focus · release to shoot',
  touch: 'none',
  cursor: 'crosshair',
  keys: [' ', 'Enter'],
}

const ROLL = 8

type Path = {
  kind: number
  dir: 1 | -1
  T: number
  y0: number
  amp: number
  freq: number
  ph: number
  size: number
  warp: number
  ground: boolean
  seed: number
}
/** Everything needed to redraw a frame (live, in the print, or as a thumbnail). */
type Look = {
  seed: number
  kind: number
  nx: number
  ny: number
  ang: number
  tilt: number
  size: number
  dir: 1 | -1
  anim: number
  blur: number
}
type Snap = Look & {
  sharp: number
  thirds: number
  pts: number
  perfect: boolean
  missed: boolean
  inFrame: boolean
  word: string
}

const lighter = (a: Col, b: Col) => (a.lum >= b.lum ? a : b)
const darker = (a: Col, b: Col) => (a.lum < b.lum ? a : b)

/* ---------- procedural subjects (unit space, ~±1.3 tall) ---------- */
function drawSubject(
  ctx: CanvasRenderingContext2D,
  look: Look,
  solid: boolean,
  col: string,
  detail: string,
  s: number,
) {
  const { kind, ang, tilt, dir, anim } = look
  ctx.save()
  ctx.scale(s, s)
  ctx.strokeStyle = col
  ctx.fillStyle = col
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const thin = 1.6 / s
  const lw = (w: number) => (solid ? w : thin)
  const paint = () => (solid ? ctx.fill() : ctx.stroke())
  const line = (pts: number[], w: number) => {
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
    ctx.lineWidth = lw(w)
    ctx.stroke()
  }
  const limb = (
    x: number,
    y: number,
    a1: number,
    l1: number,
    a2: number,
    l2: number,
    w: number,
  ) => {
    const jx = x + l1 * Math.sin(a1)
    const jy = y + l1 * Math.cos(a1)
    line([x, y, jx, jy, jx + l2 * Math.sin(a2), jy + l2 * Math.cos(a2)], w)
  }

  if (kind === 0) {
    // paper plane
    ctx.rotate(ang)
    const sc = 0.55 + 0.45 * Math.abs(Math.cos(anim * 1.7))
    ctx.lineWidth = lw(0.06)
    ctx.beginPath()
    ctx.moveTo(1.3, 0)
    ctx.lineTo(-0.9, -0.85 * sc)
    ctx.lineTo(-0.4, 0)
    ctx.closePath()
    paint()
    ctx.save()
    if (solid) ctx.globalAlpha *= 0.62
    ctx.beginPath()
    ctx.moveTo(1.3, 0)
    ctx.lineTo(-0.4, 0)
    ctx.lineTo(-0.9, 0.85 * sc)
    ctx.closePath()
    paint()
    ctx.restore()
    if (solid) {
      ctx.strokeStyle = detail
      line([1.3, 0, -0.4, 0], 0.05)
    }
  } else if (kind === 1) {
    // bird
    ctx.scale(dir, 1)
    ctx.rotate(tilt)
    const flap = Math.sin(anim * 9)
    const wing = (f: number, a: number) => {
      ctx.save()
      if (solid) ctx.globalAlpha *= a
      ctx.beginPath()
      ctx.moveTo(0.4, -0.1)
      ctx.quadraticCurveTo(0.0, -0.3 - 0.7 * f, -0.7, -0.2 - 0.95 * f)
      ctx.quadraticCurveTo(-0.2, -0.25 - 0.15 * f, -0.3, 0.02)
      ctx.closePath()
      ctx.lineWidth = lw(0.05)
      paint()
      ctx.restore()
    }
    wing(Math.sin(anim * 9 - 0.6), 0.6)
    ctx.lineWidth = lw(0.05)
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.75, 0.3, -0.12, 0, TAU)
    paint()
    ctx.beginPath()
    ctx.arc(0.68, -0.16, 0.22, 0, TAU)
    paint()
    ctx.beginPath()
    ctx.moveTo(0.86, -0.2)
    ctx.lineTo(1.22, -0.1)
    ctx.lineTo(0.86, -0.07)
    ctx.closePath()
    paint()
    ctx.beginPath()
    ctx.moveTo(-0.65, -0.02)
    ctx.lineTo(-1.25, -0.2)
    ctx.lineTo(-1.2, 0.12)
    ctx.lineTo(-0.6, 0.12)
    ctx.closePath()
    paint()
    wing(flap, 1)
    if (solid) {
      ctx.fillStyle = detail
      ctx.beginPath()
      ctx.arc(0.75, -0.2, 0.05, 0, TAU)
      ctx.fill()
    }
  } else if (kind === 2) {
    // cyclist
    ctx.scale(dir, 1)
    if (solid) {
      ctx.save()
      ctx.globalAlpha *= 0.14
      ctx.beginPath()
      ctx.ellipse(0, 1.05, 1.45, 0.12, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    const spin = anim * 7
    for (const wx of [-0.8, 0.8]) {
      ctx.beginPath()
      ctx.arc(wx, 0.55, 0.46, 0, TAU)
      ctx.lineWidth = lw(0.09)
      ctx.stroke()
      line(
        [
          wx + 0.46 * Math.cos(spin),
          0.55 + 0.46 * Math.sin(spin),
          wx - 0.46 * Math.cos(spin),
          0.55 - 0.46 * Math.sin(spin),
        ],
        0.04,
      )
      line(
        [
          wx + 0.46 * Math.cos(spin + 1.57),
          0.55 + 0.46 * Math.sin(spin + 1.57),
          wx - 0.46 * Math.cos(spin + 1.57),
          0.55 - 0.46 * Math.sin(spin + 1.57),
        ],
        0.04,
      )
    }
    line([-0.8, 0.55, -0.05, 0.55, -0.3, -0.12, -0.8, 0.55], 0.1)
    line([-0.3, -0.12, 0.55, -0.1, -0.05, 0.55], 0.1)
    line([0.55, -0.1, 0.8, 0.55], 0.1)
    line([0.5, -0.3, 0.62, -0.32], 0.09)
    const hipx = -0.3
    const hipy = -0.2
    line([hipx, hipy, 0.18, -0.88], 0.3)
    ctx.beginPath()
    ctx.arc(0.3, -1.15, 0.2, 0, TAU)
    paint()
    line([0.18, -0.85, 0.52, -0.34], 0.12)
    const cr = spin * 0.6
    for (let i = 0; i < 2; i++) {
      const px = -0.05 + 0.26 * Math.cos(cr + i * Math.PI)
      const py = 0.55 + 0.26 * Math.sin(cr + i * Math.PI)
      ctx.save()
      if (solid && i) ctx.globalAlpha *= 0.7
      line([hipx, hipy, (hipx + px) / 2 + 0.24, (hipy + py) / 2 - 0.04, px, py], 0.14)
      ctx.restore()
    }
  } else {
    // runner
    ctx.scale(dir, 1)
    if (solid) {
      ctx.save()
      ctx.globalAlpha *= 0.14
      ctx.beginPath()
      ctx.ellipse(0, 1.28, 0.9, 0.1, 0, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
    ctx.rotate(0.1)
    const ph = anim * 8
    line([-0.05, 0.05, 0.28, -0.85], 0.34)
    ctx.beginPath()
    ctx.arc(0.4, -1.17, 0.22, 0, TAU)
    paint()
    for (let i = 0; i < 2; i++) {
      const sw = Math.sin(ph + i * Math.PI)
      ctx.save()
      if (solid && i) ctx.globalAlpha *= 0.7
      limb(0.28, -0.82, -sw * 0.9 + 0.15, 0.42, -sw * 0.9 + 1.25, 0.42, 0.14)
      limb(
        -0.05,
        0.05,
        sw * 0.95,
        0.62,
        sw * 0.95 - (0.55 + 0.6 * Math.max(0, Math.sin(ph + i * Math.PI - 1.2))),
        0.62,
        0.2,
      )
      ctx.restore()
    }
  }
  ctx.restore()
}

/** Blur without ctx.filter (Safari): ghost copies + soft glow. */
function drawBlurred(
  ctx: CanvasRenderingContext2D,
  th: Theme,
  look: Look,
  x: number,
  y: number,
  s: number,
  peak: boolean,
) {
  const b = look.blur
  const n = b < 0.04 ? 1 : 2 + Math.round(b * 7)
  const R = b * s * 0.7
  if (b > 0.05) glow(ctx, x, y, s * (1.4 + b * 1.2), th.accent, 0.3 * b)
  for (let i = n - 1; i >= 0; i--) {
    const a = i * 2.399963
    const r = i === 0 ? 0 : R * Math.sqrt(i / Math.max(1, n - 1))
    ctx.save()
    ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r)
    ctx.globalAlpha = i === 0 ? 1 - 0.55 * b : 0.12 + 0.08 * b
    drawSubject(ctx, look, true, th.fg.css, th.bg.css, s)
    ctx.restore()
  }
  if (peak) {
    ctx.save()
    ctx.translate(x, y)
    ctx.setLineDash([2, 3])
    drawSubject(ctx, look, false, th.accent.css, th.bg.css, s)
    ctx.restore()
  }
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  th: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  blur: number,
) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, th.bg.mix(th.accent2, 0.22))
  sky.addColorStop(0.62, th.bg.mix(th.accent, 0.17))
  sky.addColorStop(1, th.bg.mix(th.fg, 0.06))
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)
  const m = Math.min(w, h)
  const sx = x + w * (0.2 + 0.6 * hash01(seed * 3 + 1))
  const sy = y + h * (0.2 + 0.18 * hash01(seed * 5 + 2))
  glow(ctx, sx, sy, m * 0.3, th.accent, 0.32)
  circle(ctx, sx, sy, m * 0.085, th.accent.a(0.9))
  for (let L = 0; L < 3; L++) {
    const base = y + h * (0.6 + L * 0.1)
    const amp = h * (0.05 + 0.02 * L)
    ctx.beginPath()
    ctx.moveTo(x, y + h)
    for (let i = 0; i <= 24; i++) {
      const py =
        base -
        amp * (Math.sin(i * 0.5 + seed * 1.7 + L * 2) * 0.6 + Math.sin(i * 0.23 + seed + L) * 0.4)
      ctx.lineTo(x + (w * i) / 24, py)
    }
    ctx.lineTo(x + w, y + h)
    ctx.closePath()
    ctx.fillStyle = th.bg.mix(th.fg, 0.05 + 0.06 * L)
    ctx.fill()
  }
  const cols = [th.accent, th.accent2, th.fg]
  for (let i = 0; i < 12; i++) {
    const bx = x + w * hash01(seed * 17 + i * 3)
    const by = y + h * (0.08 + 0.62 * hash01(seed * 19 + i * 5 + 1))
    const r0 = m * (0.008 + 0.018 * hash01(seed * 23 + i))
    const r = r0 * (1 + blur * 2.6)
    ctx.globalAlpha = lerp(0.34, 0.11, blur) * (0.55 + 0.45 * hash01(i + seed))
    circle(ctx, bx, by, r, cols[i % 3].css)
  }
  ctx.globalAlpha = 1
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  th: Theme,
  x: number,
  y: number,
  w: number,
  h: number,
  look: Look,
  big: boolean,
  peak = false,
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  drawBackdrop(ctx, th, x, y, w, h, look.seed, look.blur)
  if (look.nx > -0.4 && look.nx < 1.4)
    drawBlurred(
      ctx,
      th,
      look,
      x + look.nx * w,
      y + look.ny * h,
      Math.min(w, h) * 0.1 * look.size,
      peak,
    )
  if (big) {
    const vg = ctx.createRadialGradient(
      x + w / 2,
      y + h / 2,
      Math.min(w, h) * 0.35,
      x + w / 2,
      y + h / 2,
      Math.max(w, h) * 0.75,
    )
    vg.addColorStop(0, th.bg.a(0))
    vg.addColorStop(1, th.bg.a(0.55))
    ctx.fillStyle = vg
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

/* ---------- path + scoring ---------- */
function posAt(p: Path, u: number, fw: number, fh: number) {
  const raw = (uu: number) => {
    const uw = uu + p.warp * 0.16 * Math.sin(Math.PI * clamp(uu, 0, 1))
    const x0 = lerp(-0.15, 1.15, uw)
    const nx = p.dir > 0 ? x0 : 1 - x0
    const f = p.ground ? p.freq * 7 : p.freq
    const ny = clamp(p.y0 + p.amp * Math.sin(uw * Math.PI * f + p.ph), 0.1, 0.9)
    return [nx, ny]
  }
  const [nx, ny] = raw(u)
  const [ax, ay] = raw(u - 0.01)
  const [bx, by] = raw(u + 0.01)
  const dx = (bx - ax) * fw
  const dy = (by - ay) * fh
  const ang = Math.atan2(dy, dx)
  const tilt = p.ground ? 0 : Math.atan2(dy, Math.abs(dx)) * 0.7
  return { nx, ny, ang, tilt }
}

function thirdsScore(nx: number, ny: number, fw: number, fh: number) {
  const m = Math.min(fw, fh)
  let dp = Infinity
  for (const px of [1 / 3, 2 / 3])
    for (const py of [1 / 3, 2 / 3])
      dp = Math.min(dp, Math.hypot((nx - px) * fw, (ny - py) * fh) / m)
  const point = Math.pow(1 - clamp(dp / 0.3, 0, 1), 1.3)
  const dl =
    Math.min(
      Math.abs(nx - 1 / 3) * fw,
      Math.abs(nx - 2 / 3) * fw,
      Math.abs(ny - 1 / 3) * fh,
      Math.abs(ny - 2 / 3) * fh,
    ) / m
  return Math.max(point, 0.55 * (1 - clamp(dl / 0.14, 0, 1)))
}

const focusCurve = (h: number) => {
  const hunt = clamp((h - 1.35) / 1.5, 0, 1)
  const wobble = clamp((h - 1.35) / 0.5, 0, 1)
  return clamp(
    easeOutCubic(Math.min(1, h / 0.55)) * (1 - 0.65 * hunt) - 0.1 * Math.sin(h * 16) * wobble,
    0,
    1,
  )
}

const create: GameFactory = (env: Env) => {
  let shotIdx = 0
  let total = 0
  let kinds: number[] = [0, 1, 2, 3]
  let path: Path | null = null
  let t = 0
  let holding = false
  let holdSrc: 'ptr' | 'key' | null = null
  let holdT = 0
  let focus = 0
  let locked = false
  let afx = 0.5
  let afy = 0.5
  let phase: 'aim' | 'freeze' | 'print' = 'aim'
  let phaseT = 0
  let flash = 0
  let snaps: Snap[] = []
  let overT = 0
  let tipT = 0
  let cur = { nx: -0.2, ny: 0.5, ang: 0, tilt: 0 }

  const frame = () => {
    const small = env.h < 360
    const top = small ? 44 : 60
    const bot = small ? 28 : 52
    const side = Math.max(8, Math.min(20, env.w * 0.04))
    return {
      x: side,
      y: top,
      w: Math.max(40, env.w - side * 2),
      h: Math.max(40, env.h - top - bot),
    }
  }

  function newShot() {
    const i = shotIdx % ROLL
    const d = i / (ROLL - 1)
    const kind = kinds[i % kinds.length]
    const ground = kind >= 2
    path = {
      kind,
      dir: Math.random() < 0.5 ? 1 : -1,
      T: lerp(4.8, 2.3, d) * rand(0.92, 1.08),
      y0: ground ? rand(0.64, 0.7) : rand(0.28, 0.58),
      amp: ground ? rand(0.004, 0.012) : rand(0.08, 0.22) * (1 + d * 0.5),
      freq: rand(1, 2.2) + d,
      ph: rand(0, TAU),
      size: rand(0.9, 1.15),
      warp: rand(-1, 1) * (0.35 + 0.65 * d),
      ground,
      seed: randInt(1, 9999),
    }
    t = -0.5
    holding = false
    holdSrc = null
    holdT = 0
    focus = 0
    locked = false
    phase = 'aim'
    phaseT = 0
    flash = 0
    afx = 0.5
    afy = 0.5
    cur = { nx: -0.2, ny: path.y0, ang: 0, tilt: 0 }
  }

  const liveLook = (): Look => ({
    seed: path!.seed,
    kind: path!.kind,
    nx: cur.nx,
    ny: cur.ny,
    ang: cur.ang,
    tilt: cur.tilt,
    size: path!.size,
    dir: path!.dir,
    anim: t,
    blur: 1 - clamp(focus, 0, 1),
  })

  function conclude(missed: boolean) {
    if (!path || phase !== 'aim') return
    const F = frame()
    const inFrame = !missed && cur.nx > 0.03 && cur.nx < 0.97 && cur.ny > 0.03 && cur.ny < 0.97
    const sharp = inFrame ? clamp(focus, 0, 1) : 0
    const thirds = inFrame ? thirdsScore(cur.nx, cur.ny, F.w, F.h) : 0
    const perfect = sharp > 0.93 && thirds > 0.82
    const pts = Math.round(sharp * 60 + thirds * 40 + (perfect ? 20 : 0))
    const word = missed
      ? 'Missed'
      : !inFrame
        ? 'Empty frame'
        : pts >= 105
          ? 'Frameworthy'
          : pts >= 85
            ? 'Sharp eye'
            : pts >= 60
              ? 'Keeper'
              : pts >= 35
                ? 'Soft'
                : 'Missed'
    snaps.push({
      ...liveLook(),
      blur: 1 - clamp(focus, 0, 1),
      sharp,
      thirds,
      pts,
      perfect,
      missed,
      inFrame,
      word,
    })
    total += pts
    env.score(total)
    holding = false
    holdSrc = null
    if (missed) {
      phase = 'print'
      phaseT = 0
      env.sfx('bad')
      env.shake(4)
    } else {
      phase = 'freeze'
      phaseT = 0
      flash = 1
      env.shake(9)
      env.sfx('shutter')
      if (perfect) env.sfx('win')
    }
  }

  function next() {
    if (shotIdx >= ROLL - 1) {
      env.gameOver(total)
      return
    }
    shotIdx++
    newShot()
    env.sfx('click')
  }

  function startHold(src: 'ptr' | 'key') {
    if (phase !== 'aim' || holding) return
    holding = true
    holdSrc = src
    holdT = 0
    locked = false
    env.sfx('click')
  }
  const release = () => {
    if (!holding) return
    holding = false
    holdSrc = null
    conclude(false)
  }

  /* ---------- drawing ---------- */
  function drawFinder(
    F: { x: number; y: number; w: number; h: number },
    look: Look,
    demo: boolean,
  ) {
    const { ctx, w, h, theme: th } = env
    // dim everything outside the frame
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    ctx.rect(F.x, F.y, F.w, F.h)
    ctx.fillStyle = th.bg.a(0.9)
    ctx.fill('evenodd')
    strokeRR(ctx, F.x - 0.5, F.y - 0.5, F.w + 1, F.h + 1, 4, th.fg.a(0.22), 1)

    // thirds + power points
    ctx.strokeStyle = th.fg.a(0.15)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const k of [1 / 3, 2 / 3]) {
      ctx.moveTo(F.x + F.w * k, F.y)
      ctx.lineTo(F.x + F.w * k, F.y + F.h)
      ctx.moveTo(F.x, F.y + F.h * k)
      ctx.lineTo(F.x + F.w, F.y + F.h * k)
    }
    ctx.stroke()
    const m = Math.min(F.w, F.h)
    for (const px of [1 / 3, 2 / 3]) {
      for (const py of [1 / 3, 2 / 3]) {
        const d = Math.hypot((look.nx - px) * F.w, (look.ny - py) * F.h) / m
        const near = clamp(1 - d / 0.25, 0, 1)
        const cx = F.x + F.w * px
        const cy = F.y + F.h * py
        ctx.strokeStyle = near > 0.55 ? th.accent.a(0.5 + near * 0.5) : th.fg.a(0.28)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, 5 + near * 6, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx - 3, cy)
        ctx.lineTo(cx + 3, cy)
        ctx.moveTo(cx, cy - 3)
        ctx.lineTo(cx, cy + 3)
        ctx.stroke()
      }
    }

    // corner brackets
    const bl = Math.min(26, F.w * 0.12)
    const bi = 9
    ctx.strokeStyle = th.fg.a(0.9)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (const [sx, sy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const cx = F.x + bi + sx * (F.w - bi * 2)
      const cy = F.y + bi + sy * (F.h - bi * 2)
      const dx = sx ? -1 : 1
      const dy = sy ? -1 : 1
      ctx.moveTo(cx + dx * bl, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + dy * bl)
    }
    ctx.stroke()

    // AF box
    const sz = Math.min(F.w, F.h) * 0.1 * (path?.size ?? 1)
    const bx = F.x + afx * F.w
    const by = F.y + afy * F.h
    const af = holding || demo ? 1.5 + 1.4 * (1 - focus) : 2.3
    const half = sz * af
    const hunting = holding && holdT > 1.35
    const col =
      focus > 0.95
        ? th.accent.css
        : hunting
          ? th.accent2.css
          : holding || demo
            ? th.fg.css
            : th.fg.a(0.4)
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    const cl = Math.min(10, half * 0.45)
    ctx.beginPath()
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      ctx.moveTo(bx + sx * half, by + sy * (half - cl))
      ctx.lineTo(bx + sx * half, by + sy * half)
      ctx.lineTo(bx + sx * (half - cl), by + sy * half)
    }
    ctx.stroke()
    if (!holding && !demo) {
      ctx.beginPath()
      ctx.moveTo(bx - 7, by)
      ctx.lineTo(bx + 7, by)
      ctx.moveTo(bx, by - 7)
      ctx.lineTo(bx, by + 7)
      ctx.stroke()
    }

    // focus meter
    if (F.h > 150) {
      const mh = Math.min(120, F.h * 0.35)
      const mx = F.x + F.w - 18
      const my = F.y + F.h / 2 - mh / 2
      fillRR(ctx, mx, my, 5, mh, 2.5, th.fg.a(0.16))
      fillRR(
        ctx,
        mx,
        my + mh * (1 - focus),
        5,
        Math.max(2, mh * focus),
        2.5,
        hunting ? th.accent2.css : focus > 0.95 ? th.accent.css : th.fg.css,
      )
      ctx.font = env.font(9, 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = th.fg.a(0.6)
      ctx.fillText('AF', mx + 2.5, my - 6)
    }

    // hint / status line inside frame
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = env.font(11, 800)
    if (phase !== 'aim') {
      // status text only while aiming
    } else if (hunting && !demo) {
      ctx.fillStyle = th.accent2.css
      ctx.fillText('FOCUS HUNTING — RELEASE', F.x + F.w / 2, F.y + F.h - 18)
    } else if (focus > 0.95 && !demo) {
      ctx.fillStyle = th.accent.css
      ctx.fillText('LOCKED — RELEASE TO SHOOT', F.x + F.w / 2, F.y + F.h - 18)
    } else if (!holding && !demo && shotIdx === 0) {
      ctx.fillStyle = th.fg.a(0.5 + 0.4 * Math.sin(tipT * 5))
      ctx.fillText('HOLD TO FOCUS', F.x + F.w / 2, F.y + F.h - 18)
    }

    // exposure readout + film roll
    const by2 = F.y + F.h + 20
    ctx.textBaseline = 'middle'
    ctx.font = env.font(10.5, 600)
    ctx.fillStyle = th.fg.a(0.55)
    ctx.textAlign = 'left'
    ctx.fillText(
      w < 420
        ? 'f/2.8 · ISO 400'
        : `1/${[250, 500, 1000, 2000][shotIdx % 4]}s  ·  f/2.8  ·  ISO 400`,
      F.x,
      by2,
    )
    ctx.textAlign = 'right'
    const dotsW = ROLL * 12
    for (let i = 0; i < ROLL; i++) {
      const used = i < snaps.length
      const dx = F.x + F.w - dotsW + i * 12 + 4
      fillRR(
        ctx,
        dx,
        by2 - 5,
        8,
        10,
        2,
        used ? th.accent.css : i === shotIdx ? th.fg.a(0.7) : th.fg.a(0.18),
      )
    }
    // frame counter (top centre)
    ctx.textAlign = 'center'
    ctx.font = env.font(11, 800)
    ctx.fillStyle = th.fg.a(0.8)
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`FRAME ${Math.min(ROLL, shotIdx + 1)} / ${ROLL}`, w / 2, F.y - 20)
  }

  function drawPrint(F: { x: number; y: number; w: number; h: number }) {
    const { ctx, w, h, theme: th } = env
    const snap = snaps[snaps.length - 1]
    if (!snap) return
    const ar = clamp(F.w / F.h, 0.8, 1.4)
    const pw = Math.max(110, Math.min(360, w * 0.82, (h - 92) / (0.34 + 0.86 / ar)))
    const pw2 = pw * 0.86
    const ph2 = pw2 / ar
    const ph = pw * 0.34 + ph2
    const k = easeOutBack(clamp(phaseT / 0.45, 0, 1))
    const paper = lighter(th.fg, th.bg)
    const ink = darker(th.fg, th.bg)
    ctx.fillStyle = th.bg.a(0.62 * clamp(phaseT / 0.25, 0, 1))
    ctx.fillRect(0, 0, w, h)
    ctx.save()
    ctx.translate(w / 2, h / 2 - 8 + (1 - k) * 60)
    ctx.rotate(lerp(0.14, -0.025, k))
    ctx.globalAlpha = clamp(phaseT / 0.2, 0, 1)
    fillRR(ctx, -pw / 2 + 4, -ph / 2 + 8, pw, ph, pw * 0.02, 'rgba(0,0,0,0.38)')
    fillRR(ctx, -pw / 2, -ph / 2, pw, ph, pw * 0.02, paper.css)
    const m = pw * 0.07
    const px = -pw / 2 + m
    const py = -ph / 2 + m
    drawScene(ctx, th, px, py, pw2, ph2, snap, false)
    ctx.strokeStyle = th.fg.a(0.2)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const kk of [1 / 3, 2 / 3]) {
      ctx.moveTo(px + pw2 * kk, py)
      ctx.lineTo(px + pw2 * kk, py + ph2)
      ctx.moveTo(px, py + ph2 * kk)
      ctx.lineTo(px + pw2, py + ph2 * kk)
    }
    ctx.stroke()
    const d = clamp((phaseT - 0.25) / 1.1, 0, 1)
    const cover = 1 - easeOutCubic(d)
    ctx.fillStyle = ink.mix(th.accent2, 0.18)
    ctx.globalAlpha = clamp(phaseT / 0.2, 0, 1) * cover * 0.96
    ctx.fillRect(px, py, pw2, ph2)
    ctx.globalAlpha = clamp(phaseT / 0.2, 0, 1)
    if (snap.perfect && d > 0.7) {
      ctx.save()
      ctx.translate(px + pw2 / 2, py + ph2 * 0.18)
      ctx.rotate(-0.16)
      const a = easeOutBack(clamp((d - 0.7) / 0.3, 0, 1))
      ctx.scale(a, a)
      ctx.font = env.font(pw * 0.07, 800)
      const tw = ctx.measureText('PERFECT').width
      strokeRR(ctx, -tw / 2 - 10, -pw * 0.05, tw + 20, pw * 0.1, 6, th.accent.css, 2.5)
      ctx.fillStyle = th.accent.css
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PERFECT', 0, 1)
      ctx.restore()
    }
    const ta = clamp((d - 0.45) / 0.45, 0, 1)
    const ty = py + ph2
    ctx.globalAlpha *= ta
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ink.css
    ctx.font = env.font(pw * 0.082, 800)
    ctx.fillText(snap.word, px, ty + pw * 0.1)
    ctx.font = env.font(pw * 0.036, 700)
    ctx.fillStyle = ink.a(0.62)
    ctx.fillText(
      snap.missed
        ? 'SUBJECT LEFT THE FRAME'
        : `SHARP ${Math.round(snap.sharp * 100)}%  ·  THIRDS ${Math.round(snap.thirds * 100)}%`,
      px,
      ty + pw * 0.195,
    )
    const bw = pw * 0.2
    const bh = pw * 0.095
    fillRR(ctx, px + pw2 - bw, ty + pw * 0.1 - bh / 2, bw, bh, bh / 2, th.accent.css)
    ctx.fillStyle = th.accent.lum > 0.4 ? ink.css : paper.css
    ctx.textAlign = 'center'
    ctx.font = env.font(pw * 0.06, 800)
    ctx.fillText(`+${snap.pts}`, px + pw2 - bw / 2, ty + pw * 0.1 + 1)
    ctx.restore()
    ctx.globalAlpha = 1
    if (phaseT > 0.7) {
      ctx.font = env.font(11, 800)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = th.fg.a(0.5 + 0.4 * Math.sin(phaseT * 5))
      const y = Math.min(h - 14, h / 2 - 8 + ph / 2 + 30)
      ctx.fillText(
        `${w < 420 ? 'TAP' : 'CLICK · SPACE'} — ${shotIdx >= ROLL - 1 ? 'DEVELOP THE ROLL' : 'NEXT FRAME'}`,
        w / 2,
        y,
      )
    }
  }

  function drawSheet() {
    const { ctx, w, h, theme: th } = env
    const cols = w >= h ? 4 : 2
    const rows = ROLL / cols
    const pad = 14
    const top = 54
    const gap = 10
    const cw = (w - pad * 2 - (cols - 1) * gap) / cols
    const ch = (h - top - pad - (rows - 1) * gap) / rows
    const picW = Math.max(30, Math.min(cw, (ch - 16) * 1.25))
    const picH = picW / 1.25
    const paper = lighter(th.fg, th.bg)
    const ink = darker(th.fg, th.bg)
    for (let i = 0; i < snaps.length; i++) {
      const a = easeOutCubic(clamp((overT - 0.05 * i) / 0.35, 0, 1))
      if (a <= 0) continue
      const x0 = pad + (i % cols) * (cw + gap) + (cw - picW) / 2
      const y0 = top + Math.floor(i / cols) * (ch + gap) + (ch - picH - 16) / 2
      ctx.save()
      ctx.globalAlpha = a * 0.92
      ctx.translate(x0 + picW / 2, y0 + picH / 2)
      ctx.scale(0.9 + 0.1 * a, 0.9 + 0.1 * a)
      ctx.translate(-picW / 2, -picH / 2)
      fillRR(ctx, -3, -3, picW + 6, picH + 22, 3, paper.css)
      drawScene(ctx, th, 0, 0, picW, picH, snaps[i], false)
      ctx.font = env.font(10.5, 800)
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = ink.css
      ctx.fillText(`+${snaps[i].pts}`, picW, picH + 10)
      ctx.textAlign = 'left'
      ctx.fillStyle = ink.a(0.55)
      ctx.fillText(String(i + 1).padStart(2, '0'), 0, picH + 10)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  return {
    reset() {
      shotIdx = 0
      total = 0
      snaps = []
      kinds = shuffle([0, 1, 2, 3, 0, 1, 2, 3])
      overT = 0
      tipT = 0
      newShot()
    },
    update(dt) {
      if (env.state === 'over') {
        overT += dt
        return
      }
      if (!path) return
      const demo = env.state === 'ready'
      tipT += dt
      flash = Math.max(0, flash - dt * 3.5)
      if (phase === 'freeze') {
        phaseT += dt
        if (phaseT > 0.55) {
          phase = 'print'
          phaseT = 0
        }
        return
      }
      if (phase === 'print') {
        phaseT += dt
        return
      }
      const F = frame()
      t += dt
      const u = t / path.T
      const pos = posAt(path, u, F.w, F.h)
      cur = pos
      if (demo) {
        const cyc = (t + 0.5) % 2.6
        holdT = cyc > 0.5 && cyc < 2.0 ? cyc - 0.5 : 0
        holding = holdT > 0
        if (u > 1.16) {
          shotIdx = (shotIdx + 1) % ROLL
          newShot()
          return
        }
      } else {
        if (holding) holdT += dt
        if (u > 1.16) {
          conclude(true)
          return
        }
      }
      focus = damp(focus, holding ? focusCurve(holdT) : 0, holding ? 18 : 7, dt)
      afx = damp(afx, holding || demo ? pos.nx : 0.5, holding ? 9 : 3, dt)
      afy = damp(afy, holding || demo ? pos.ny : 0.5, holding ? 9 : 3, dt)
      if (focus > 0.97 && !locked) {
        locked = true
        if (!demo) {
          env.sfx('tick')
          env.fx.ring(F.x + afx * F.w, F.y + afy * F.h, env.theme.accent.css, { r1: 40, life: 0.4 })
        }
      } else if (focus < 0.88) locked = false
    },
    render() {
      const { ctx, w, h, theme: th } = env
      if (env.state === 'over') {
        drawSheet()
        ctx.font = env.font(11, 800)
        ctx.textAlign = 'center'
        ctx.fillStyle = th.fg.a(0.7)
        ctx.fillText('CONTACT SHEET', w / 2, 30)
        return
      }
      if (!path) return
      const F = frame()
      const demo = env.state === 'ready'
      const last = snaps[snaps.length - 1]
      const look: Look =
        phase === 'aim' || !last ? { ...liveLook(), blur: 1 - clamp(focus, 0, 1) } : last
      drawScene(ctx, th, F.x, F.y, F.w, F.h, look, true, phase === 'aim' && focus > 0.9)
      drawFinder(F, look, demo)
      if (flash > 0) {
        ctx.globalAlpha = flash
        ctx.fillStyle = lighter(th.fg, th.bg).css
        ctx.fillRect(F.x, F.y, F.w, F.h)
        ctx.globalAlpha = 1
      }
      if (phase === 'freeze') {
        const p = phaseT < 0.18 ? phaseT / 0.18 : 1 - (phaseT - 0.18) / 0.37
        const bh = clamp(p, 0, 1) * (F.h / 2)
        ctx.fillStyle = darker(th.fg, th.bg).css
        ctx.fillRect(F.x, F.y, F.w, bh)
        ctx.fillRect(F.x, F.y + F.h - bh, F.w, bh)
      }
      if (phase === 'print') drawPrint(F)
    },
    pointerDown() {
      if (phase === 'print') {
        if (phaseT > 0.55) next()
        return
      }
      startHold('ptr')
    },
    pointerUp(p) {
      if (holdSrc !== 'ptr') return
      if (p.cancel) {
        holding = false
        holdSrc = null
        return
      }
      release()
    },
    key(e, down) {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (down) {
        if (e.repeat) return true
        if (phase === 'print') {
          if (phaseT > 0.55) next()
        } else startHold('key')
      } else if (holdSrc === 'key') release()
      return true
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
