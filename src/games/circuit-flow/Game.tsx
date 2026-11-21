'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER } from '../_shared/color'
import { circle, fillRR, glow, strokeRR } from '../_shared/draw'
import { TAU, clamp, easeOutBack, easeOutCubic, lerp, mulberry32, randInt } from '../_shared/math'

const META: GameMeta = {
  key: 'circuit-flow',
  title: 'Circuit Flow',
  how: [
    { k: 'Tap', t: 'Rotate a tile 90°. Route power from the battery to the LED.' },
    { k: 'Clock', t: 'Beat the timer. Every solved board adds 25 seconds.' },
    { k: 'Keys', t: 'Arrows move, Space rotates, Shift + Space turns back.' },
  ],
  controls: 'Click / tap rotates · right-click or Shift reverses · arrows + Space',
  touch: 'pan-y',
  cursor: 'pointer',
  keys: [' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
}

// connection bits: N=1 E=2 S=4 W=8  (dir index d → bit 1<<d)
const DX = [0, 1, 0, -1]
const DY = [-1, 0, 1, 0]
const rotCW = (m: number) => ((m << 1) | (m >> 3)) & 15
const rotN = (m: number, n: number) => {
  for (let k = 0; k < (n & 3); k++) m = rotCW(m)
  return m
}
const popcnt = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1)

type Level = {
  cols: number
  rows: number
  base: number[]
  rot: number[]
  path: number[]
  r0: number
  r1: number
  par: number
}

function genLevel(cols: number, rows: number, L: number): Level {
  const rnd = mulberry32((Math.random() * 2 ** 31) >>> 0)
  const N = cols * rows
  const base = new Array<number>(N).fill(0)
  const used = new Array<boolean>(N).fill(false)
  const r0 = Math.floor(rnd() * rows)
  const r1 = Math.floor(rnd() * rows)
  const start = r0 * cols
  const goal = r1 * cols + cols - 1
  const gx = cols - 1
  const gy = r1

  // randomized, goal-biased DFS → self-avoiding path battery → LED
  const vis = new Array<boolean>(N).fill(false)
  const stack = [start]
  vis[start] = true
  const bias = Math.min(4, 1 + L * 0.4)
  let guard = 0
  while (stack.length && stack[stack.length - 1] !== goal && guard++ < 20000) {
    const c = stack[stack.length - 1]
    const x = c % cols
    const y = (c / cols) | 0
    const nb: [number, number][] = []
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || vis[ny * cols + nx]) continue
      nb.push([ny * cols + nx, Math.abs(nx - gx) + Math.abs(ny - gy) + rnd() * bias])
    }
    if (!nb.length) {
      stack.pop()
      continue
    }
    nb.sort((a, b) => a[1] - b[1])
    vis[nb[0][0]] = true
    stack.push(nb[0][0])
  }
  const path = stack.slice()

  const connect = (a: number, b: number) => {
    const ax = a % cols
    const ay = (a / cols) | 0
    const bx = b % cols
    const by = (b / cols) | 0
    const bit = bx > ax ? 2 : bx < ax ? 8 : by > ay ? 4 : 1
    base[a] |= bit
    base[b] |= rotN(bit, 2)
  }
  for (let i = 0; i < path.length - 1; i++) connect(path[i], path[i + 1])
  base[start] |= 8
  base[goal] |= 2
  for (const c of path) used[c] = true

  const freeNb = (c: number) => {
    const x = c % cols
    const y = (c / cols) | 0
    const out: number[] = []
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !used[ny * cols + nx])
        out.push(ny * cols + nx)
    }
    return out
  }
  // branches (dead-end side traces)
  const K = Math.min(1 + L, 7)
  for (let k = 0; k < K; k++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      let cur = path[Math.floor(rnd() * path.length)]
      const first = freeNb(cur)
      if (!first.length) continue
      const len = 1 + Math.floor(rnd() * 3)
      for (let s = 0; s < len; s++) {
        const opts = freeNb(cur)
        if (!opts.length) break
        const n = opts[Math.floor(rnd() * opts.length)]
        connect(cur, n)
        used[n] = true
        cur = n
      }
      break
    }
  }
  // decoy pieces
  const decoy = new Array<boolean>(N).fill(false)
  const shapes = [1, 2, 4, 8, 5, 10, 3, 6, 12, 9]
  for (let i = 0; i < N; i++) {
    if (!used[i] && base[i] === 0 && rnd() < 0.28) {
      base[i] = shapes[Math.floor(rnd() * shapes.length)]
      decoy[i] = true
    }
  }

  const solvedNow = (rot: number[]) => {
    const cur = (i: number) => rotN(base[i], rot[i])
    if (!(cur(start) & 8)) return false
    const seen = new Array<boolean>(N).fill(false)
    const q = [start]
    seen[start] = true
    while (q.length) {
      const c = q.shift() as number
      const m = cur(c)
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue
        const nx = (c % cols) + DX[d]
        const ny = ((c / cols) | 0) + DY[d]
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const n = ny * cols + nx
        if (!seen[n] && cur(n) & (1 << ((d + 2) & 3))) {
          seen[n] = true
          q.push(n)
        }
      }
    }
    return seen[goal] && (cur(goal) & 2) !== 0
  }

  const rot = base.map((m) => (m ? randInt(0, 3) : 0))
  let tries = 0
  while (solvedNow(rot) && tries++ < 20) {
    const c = path[Math.floor(rnd() * path.length)]
    if (base[c] !== 15) rot[c] = (rot[c] + 1) & 3
  }

  // par = minimum quarter-turns to restore every non-decoy tile
  let par = 0
  for (let i = 0; i < N; i++) {
    if (!base[i] || decoy[i]) continue
    let best = 4
    for (let k = 0; k < 4; k++) {
      if (rotN(base[i], rot[i] + k) === base[i]) best = Math.min(best, k)
      if (rotN(base[i], rot[i] - k + 4) === base[i]) best = Math.min(best, k)
    }
    par += best === 4 ? 0 : best
  }
  return { cols, rows, base, rot, path, r0, r1, par }
}

const create: GameFactory = (env) => {
  let lv: Level = { cols: 1, rows: 1, base: [0], rot: [0], path: [0], r0: 0, r1: 0, par: 0 }
  let L = 1
  let timeLeft = 90
  let score = 0
  let moves = 0
  let levelT = 0
  let idle = 0
  let solved = false
  let solveT = 0
  let burstP = 0
  let maxD = 0
  let spawnT = 0
  let bannerT = 0
  let powered: boolean[] = []
  let dist: number[] = []
  let flash: number[] = []
  let aFrom: number[] = []
  let aTo: number[] = []
  let aT: number[] = []
  let edges: [number, number][] = []
  let ledOn = false
  let sel = { c: 0, r: 0 }
  let kbd = false
  let hover = -1
  let shiftNow = false
  let demoStep = 0
  let demoCount = 0
  let lastTickSec = 99
  let lay = { cell: 40, gx: 0, gy: 0 }
  let patKey = ''
  let pat: CanvasPattern | null = null

  const topM = () => (env.h < 360 ? 46 : 58)
  const botM = () => (env.h < 360 ? 20 : 30)
  const cur = (i: number) => rotN(lv.base[i], lv.rot[i])
  const goalIdx = () => lv.r1 * lv.cols + lv.cols - 1

  function dimsFor(level: number) {
    const availW = env.w - 16
    const availH = env.h - topM() - botM()
    const n = Math.min(9, 4 + Math.ceil(level / 2))
    const ar = clamp(availW / Math.max(1, availH), 0.45, 2.2)
    const maxC = Math.max(3, Math.floor(availW / 40 - 1.8))
    const maxR = Math.max(3, Math.floor(availH / 40))
    let cols = clamp(Math.round(n * Math.sqrt(ar)), 3, Math.min(11, maxC))
    let rows = clamp(Math.round(n / Math.sqrt(ar)), 3, Math.min(11, maxR))
    while (cols * rows < 12) {
      if (cols < maxC && cols <= rows) cols++
      else if (rows < maxR) rows++
      else if (cols < maxC) cols++
      else break
    }
    return { cols, rows }
  }

  function layout() {
    const availW = env.w - 16
    const availH = env.h - topM() - botM()
    const cell = clamp(Math.floor(Math.min(availW / (lv.cols + 1.8), availH / lv.rows)), 14, 110)
    lay = {
      cell,
      gx: Math.round((env.w - lv.cols * cell) / 2),
      gy: Math.round(topM() + (availH - lv.rows * cell) / 2),
    }
  }

  function computePower(announce: boolean) {
    const N = lv.cols * lv.rows
    const prev = powered
    powered = new Array<boolean>(N).fill(false)
    dist = new Array<number>(N).fill(-1)
    const start = lv.r0 * lv.cols
    edges = []
    ledOn = false
    maxD = 0
    if (cur(start) & 8) {
      const q = [start]
      powered[start] = true
      dist[start] = 0
      while (q.length) {
        const c = q.shift() as number
        const m = cur(c)
        for (let d = 0; d < 4; d++) {
          if (!(m & (1 << d))) continue
          const nx = (c % lv.cols) + DX[d]
          const ny = ((c / lv.cols) | 0) + DY[d]
          if (nx < 0 || ny < 0 || nx >= lv.cols || ny >= lv.rows) continue
          const n = ny * lv.cols + nx
          if (!powered[n] && cur(n) & (1 << ((d + 2) & 3))) {
            powered[n] = true
            dist[n] = dist[c] + 1
            maxD = Math.max(maxD, dist[n])
            q.push(n)
          }
        }
      }
      edges.push([-1, start])
      for (let c = 0; c < N; c++) {
        if (!powered[c]) continue
        const m = cur(c)
        for (let d = 0; d < 4; d++) {
          if (!(m & (1 << d))) continue
          const nx = (c % lv.cols) + DX[d]
          const ny = ((c / lv.cols) | 0) + DY[d]
          if (nx < 0 || ny < 0 || nx >= lv.cols || ny >= lv.rows) continue
          const n = ny * lv.cols + nx
          if (powered[n] && dist[n] === dist[c] + 1 && cur(n) & (1 << ((d + 2) & 3)))
            edges.push([c, n])
        }
      }
      const g = goalIdx()
      ledOn = powered[g] && (cur(g) & 2) !== 0
      if (ledOn) edges.push([g, -2])
    }
    if (announce) {
      let fresh = false
      for (let i = 0; i < N; i++) {
        if (powered[i] && !prev[i]) {
          flash[i] = 1
          fresh = true
        }
      }
      if (fresh && env.state === 'playing') env.sfx('tick')
    }
  }

  function newLevel(level: number) {
    const { cols, rows } = dimsFor(level)
    lv = genLevel(cols, rows, level)
    const N = cols * rows
    flash = new Array<number>(N).fill(0)
    aTo = lv.rot.map((r) => r * (Math.PI / 2))
    aFrom = aTo.slice()
    aT = new Array<number>(N).fill(1)
    moves = 0
    levelT = 0
    idle = 0
    solved = false
    solveT = 0
    spawnT = 0
    bannerT = 0
    burstP = 0
    sel = { c: 0, r: lv.r0 }
    hover = -1
    layout()
    computePower(false)
  }

  const tileCenter = (i: number) => ({
    x: lay.gx + ((i % lv.cols) + 0.5) * lay.cell,
    y: lay.gy + (((i / lv.cols) | 0) + 0.5) * lay.cell,
  })
  const batX = () => lay.gx - lay.cell * 0.62
  const ledX = () => lay.gx + lv.cols * lay.cell + lay.cell * 0.6
  const nodePos = (i: number) => {
    if (i === -1) return { x: batX() + lay.cell * 0.2, y: lay.gy + (lv.r0 + 0.5) * lay.cell }
    if (i === -2) return { x: ledX() - lay.cell * 0.1, y: lay.gy + (lv.r1 + 0.5) * lay.cell }
    return tileCenter(i)
  }

  function award() {
    const tTarget = 14 + lv.cols * lv.rows * 0.9
    const timeB = Math.round(clamp(1 - levelT / tTarget, 0, 1) * 100)
    const moveB = clamp(lv.par + 4 - moves, 0, 8) * 10
    const gain = 100 + 40 * (L - 1) + timeB + moveB
    score += gain
    env.score(score)
    timeLeft = Math.min(180, timeLeft + 25)
    const led = nodePos(-2)
    env.fx.text(
      env.w / 2,
      lay.gy + (lv.rows * lay.cell) / 2 + lay.cell * 0.1,
      `+${gain}`,
      env.theme.accent.css,
      { size: clamp(lay.cell * 0.62, 20, 52), life: 1.5, rise: 26 },
    )
    env.fx.text(led.x, led.y - lay.cell * 0.7, '+25s', env.theme.accent2.css, {
      size: 14,
      life: 1.3,
    })
  }

  function rotate(i: number, dir: 1 | -1, byPlayer: boolean) {
    if (lv.base[i] === 0 || solved) return
    lv.rot[i] = (lv.rot[i] + dir + 4) & 3
    const k = aT[i]
    aFrom[i] = k >= 1 ? aTo[i] : lerp(aFrom[i], aTo[i], easeOutBack(k))
    aTo[i] += (dir * Math.PI) / 2
    aT[i] = 0
    if (byPlayer) {
      moves++
      idle = 0
    }
    const c = tileCenter(i)
    if (byPlayer) env.sfx('click')
    env.fx.ring(c.x, c.y, env.theme.fg.a(0.5), {
      r0: lay.cell * 0.2,
      r1: lay.cell * 0.6,
      life: 0.3,
      width: 2,
    })
    computePower(true)
    if (ledOn && !solved) {
      solved = true
      solveT = 0
      burstP = 0
      if (env.state === 'playing') {
        env.sfx('win')
        env.shake(5)
        award()
      }
    }
  }

  function tap(x: number, y: number, dir: 1 | -1) {
    const c = Math.floor((x - lay.gx) / lay.cell)
    const r = Math.floor((y - lay.gy) / lay.cell)
    if (c < 0 || r < 0 || c >= lv.cols || r >= lv.rows) return
    sel = { c, r }
    kbd = false
    rotate(r * lv.cols + c, dir, true)
  }

  // Right-click isn't forwarded by the shell, so listen for it here (only on our own canvas).
  const cv = env.ctx.canvas
  const onWinDown = (e: PointerEvent) => {
    shiftNow = e.shiftKey
    if (e.button === 2 && e.target === cv && env.state === 'playing') {
      const r = cv.getBoundingClientRect()
      tap(
        (e.clientX - r.left) * (env.w / (r.width || 1)),
        (e.clientY - r.top) * (env.h / (r.height || 1)),
        -1,
      )
      e.preventDefault()
    }
  }
  window.addEventListener('pointerdown', onWinDown, true)

  /* ---------- drawing ---------- */
  function pattern() {
    const key = `${env.dpr}|${env.theme.fg.css}`
    if (key === patKey) return pat
    patKey = key
    const c = document.createElement('canvas')
    const d = env.dpr
    c.width = c.height = Math.round(24 * d)
    const g = c.getContext('2d')
    pat = null
    if (g) {
      g.fillStyle = env.theme.fg.a(0.09)
      g.beginPath()
      g.arc(12 * d, 12 * d, 1.1 * d, 0, TAU)
      g.fill()
      pat = env.ctx.createPattern(c, 'repeat')
      pat?.setTransform(new DOMMatrix().scale(1 / d))
    }
    return pat
  }

  const dispA = (i: number) => (aT[i] >= 1 ? aTo[i] : lerp(aFrom[i], aTo[i], easeOutBack(aT[i])))

  function firstWrong() {
    for (const c of lv.path) if (cur(c) !== lv.base[c]) return c
    return -1
  }

  function traces(m: number, cell: number) {
    env.ctx.beginPath()
    for (let d = 0; d < 4; d++) {
      if (!(m & (1 << d))) continue
      env.ctx.moveTo(0, 0)
      env.ctx.lineTo(DX[d] * cell * 0.5, DY[d] * cell * 0.5)
    }
  }

  function drawTile(i: number) {
    const { ctx, theme: th } = env
    const { cell } = lay
    const m = lv.base[i]
    const c = i % lv.cols
    const r = (i / lv.cols) | 0
    const sp = easeOutBack(clamp((spawnT - (c + r) * 0.04) / 0.4, 0, 1))
    if (sp <= 0) return
    const ctr = tileCenter(i)
    const pad = cell * 0.045
    const sz = cell - pad * 2
    const pw = powered[i]
    const f = flash[i]
    ctx.save()
    ctx.translate(ctr.x, ctr.y)
    ctx.scale(sp, sp)
    const rad = cell * 0.2
    if (m === 0) {
      fillRR(ctx, -sz / 2, -sz / 2, sz, sz, rad, th.fg.a(0.018))
      ctx.restore()
      return
    }
    fillRR(ctx, -sz / 2, -sz / 2, sz, sz, rad, pw ? th.accent.a(0.1 + f * 0.22) : th.fg.a(0.055))
    strokeRR(
      ctx,
      -sz / 2 + 0.5,
      -sz / 2 + 0.5,
      sz - 1,
      sz - 1,
      rad,
      pw ? th.accent.a(0.4 + f * 0.4) : th.fg.a(0.11),
      1,
    )
    if (hover === i && !env.coarse && !solved)
      fillRR(ctx, -sz / 2, -sz / 2, sz, sz, rad, th.fg.a(0.06))
    if (f > 0) glow(ctx, 0, 0, cell * 0.9, th.accent, f * 0.45)
    ctx.rotate(dispA(i))
    const lw = cell * 0.15
    const col = pw ? th.accent.css : th.fg.a(0.42)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (pw) {
      ctx.strokeStyle = th.accent.a(0.18)
      ctx.lineWidth = lw * 2.4
      traces(m, cell)
      ctx.stroke()
    }
    ctx.strokeStyle = col
    ctx.lineWidth = lw
    traces(m, cell)
    ctx.stroke()
    const deg = popcnt(m)
    if (deg === 1) {
      circle(ctx, 0, 0, lw * 1.05, col)
      circle(ctx, 0, 0, lw * 0.42, th.bg.css)
    } else if (deg >= 3) {
      circle(ctx, 0, 0, lw * 0.8, col)
      circle(ctx, 0, 0, lw * 0.3, th.bg.css)
    } else circle(ctx, 0, 0, lw * 0.5, col)
    ctx.restore()
  }

  function drawBattery() {
    const { ctx, theme: th } = env
    const { cell } = lay
    const x = batX()
    const y = lay.gy + (lv.r0 + 0.5) * cell
    const bw = cell * 0.5
    const bh = cell * 0.8
    const on = powered[lv.r0 * lv.cols] || !!(cur(lv.r0 * lv.cols) & 8)
    const pulse = 0.5 + 0.5 * Math.sin(env.time * 4)
    ctx.strokeStyle = on ? th.accent.css : th.fg.a(0.42)
    ctx.lineWidth = cell * 0.15
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + bw / 2 + cell * 0.08, y)
    ctx.lineTo(lay.gx, y)
    ctx.stroke()
    glow(ctx, x, y, cell * 0.9, th.accent, 0.12 + 0.12 * pulse)
    fillRR(ctx, x - bw / 2, y - bh / 2, bw, bh, cell * 0.12, th.accent.a(0.14))
    strokeRR(
      ctx,
      x - bw / 2 + 0.75,
      y - bh / 2 + 0.75,
      bw - 1.5,
      bh - 1.5,
      cell * 0.12,
      th.accent.css,
      1.5,
    )
    fillRR(ctx, x + bw / 2, y - cell * 0.1, cell * 0.08, cell * 0.2, 2, th.accent.css)
    const u = cell * 0.075
    ctx.fillStyle = th.accent.css
    ctx.beginPath()
    const bolt = [0.3, -1.7, -1, 0.15, -0.05, 0.15, -0.3, 1.7, 1, -0.3, 0.05, -0.3]
    ctx.moveTo(x + bolt[0] * u, y + bolt[1] * u)
    for (let k = 2; k < bolt.length; k += 2) ctx.lineTo(x + bolt[k] * u, y + bolt[k + 1] * u)
    ctx.closePath()
    ctx.fill()
  }

  function drawLed() {
    const { ctx, theme: th } = env
    const { cell } = lay
    const x = ledX()
    const y = lay.gy + (lv.r1 + 0.5) * cell
    const rr0 = cell * 0.26
    const wireOn = ledOn
    ctx.strokeStyle = wireOn ? th.accent.css : th.fg.a(0.42)
    ctx.lineWidth = cell * 0.15
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(lay.gx + lv.cols * cell, y)
    ctx.lineTo(x - rr0, y)
    ctx.stroke()
    if (ledOn) {
      const k = solved ? 1 + 0.35 * Math.sin(solveT * 10) * Math.max(0, 1 - solveT * 0.6) : 1
      glow(ctx, x, y, cell * 1.5 * k, th.accent, 0.6)
      ctx.strokeStyle = th.accent.a(0.75)
      ctx.lineWidth = 2
      for (let r = 0; r < 8; r++) {
        const a = (r / 8) * TAU + env.time * 0.6
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a) * rr0 * 1.45, y + Math.sin(a) * rr0 * 1.45)
        ctx.lineTo(
          x + Math.cos(a) * rr0 * (1.85 + 0.2 * Math.sin(env.time * 8 + r)),
          y + Math.sin(a) * rr0 * (1.85 + 0.2 * Math.sin(env.time * 8 + r)),
        )
        ctx.stroke()
      }
      circle(ctx, x, y, rr0, th.accent.css)
      circle(ctx, x - rr0 * 0.3, y - rr0 * 0.3, rr0 * 0.3, th.bg.a(0.55))
    } else {
      circle(ctx, x, y, rr0, th.fg.a(0.06), th.fg.a(0.4), 2)
      circle(ctx, x, y, rr0 * 0.4, th.fg.a(0.12))
    }
    ctx.strokeStyle = ledOn ? th.accent.css : th.fg.a(0.4)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - rr0 * 0.4, y + rr0)
    ctx.lineTo(x - rr0 * 0.4, y + rr0 * 1.6)
    ctx.moveTo(x + rr0 * 0.4, y + rr0)
    ctx.lineTo(x + rr0 * 0.4, y + rr0 * 1.6)
    ctx.stroke()
  }

  function drawFlow() {
    const { ctx, theme: th } = env
    ctx.fillStyle = th.fg.css
    for (let e = 0; e < edges.length; e++) {
      const [a, b] = edges[e]
      if ((a >= 0 && aT[a] < 1) || (b >= 0 && aT[b] < 1)) continue
      const A = nodePos(a)
      const B = nodePos(b)
      for (let k = 0; k < 2; k++) {
        const p = (env.time * 1.3 + k * 0.5 + e * 0.173) % 1
        const fade = Math.sin(p * Math.PI)
        ctx.globalAlpha = 0.25 + 0.75 * fade
        ctx.beginPath()
        ctx.arc(
          lerp(A.x, B.x, p),
          lerp(A.y, B.y, p),
          lay.cell * 0.04 + lay.cell * 0.02 * fade,
          0,
          TAU,
        )
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  function drawHud() {
    const { ctx, w, h, theme: th } = env
    const cx = w / 2
    const mm = Math.floor(timeLeft / 60)
    const ss = Math.floor(timeLeft % 60)
    const low = timeLeft < 10
    const textY = h < 360 ? 17 : 26
    const barY = h < 360 ? 25 : 36
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = env.font(12, 800)
    ctx.fillStyle = th.fg.a(0.85)
    ctx.fillText(`LEVEL ${L}`, cx - 4, textY)
    ctx.textAlign = 'left'
    ctx.font = env.font(12, 800)
    ctx.fillStyle = low ? DANGER : th.fg.a(0.55)
    ctx.fillText(`  ${mm}:${String(ss).padStart(2, '0')}`, cx + 22, textY)
    const bw = clamp(w - 270, 90, 520)
    const bx = cx - bw / 2
    fillRR(ctx, bx, barY, bw, 4, 2, th.fg.a(0.12))
    const frac = clamp(timeLeft / 120, 0, 1)
    fillRR(ctx, bx, barY, Math.max(4, bw * frac), 4, 2, low ? DANGER : th.accent.css)
    ctx.textAlign = 'left'
    ctx.font = env.font(10.5, 700)
    ctx.fillStyle = th.fg.a(0.4)
    ctx.fillText(
      `MOVES ${moves} · PAR ${lv.par}`,
      Math.max(14, lay.gx - lay.cell * 0.8),
      h - Math.max(7, (botM() - 10) / 2 + 2),
    )
  }

  return {
    reset() {
      L = 1
      timeLeft = 90
      score = 0
      lastTickSec = 99
      demoStep = 0
      newLevel(1)
    },
    resize() {
      layout()
    },
    update(dt) {
      const playing = env.state === 'playing'
      const demo = env.state === 'ready'
      spawnT += dt
      bannerT += dt
      for (let i = 0; i < flash.length; i++) {
        if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 2.2)
        if (aT[i] < 1) aT[i] = Math.min(1, aT[i] + dt / 0.26)
      }
      if (env.state === 'over') return
      if (playing && !solved) {
        timeLeft -= dt
        levelT += dt
        idle += dt
        const sec = Math.ceil(timeLeft)
        if (timeLeft < 10 && sec !== lastTickSec) {
          lastTickSec = sec
          env.sfx('tick')
        }
        if (timeLeft <= 0) {
          timeLeft = 0
          env.sfx('lose')
          env.shake(8)
          env.gameOver(score)
          return
        }
      }
      if (demo && !solved) {
        demoStep -= dt
        if (demoStep <= 0 && spawnT > 1) {
          demoStep = 0.42
          const w = firstWrong()
          if (w >= 0) rotate(w, 1, false)
        }
      }
      if (solved) {
        solveT += dt
        // pulse travels along the powered network, bursting as it goes
        burstP += dt * (Math.max(1, maxD) / 1.0)
        for (let i = 0; i < powered.length; i++) {
          if (
            powered[i] &&
            dist[i] <= burstP &&
            dist[i] > burstP - dt * (Math.max(1, maxD) / 1.0) - 0.0001
          ) {
            const c = tileCenter(i)
            flash[i] = 1
            env.fx.burst(c.x, c.y, env.theme.accent.css, 5, { speed: 150, size: 2.4, life: 0.5 })
          }
        }
        if (burstP >= maxD && solveT > 0.9 && solveT < 0.95) {
          const l = nodePos(-2)
          env.fx.burst(l.x, l.y, env.theme.accent.css, 26, {
            speed: 330,
            size: 3.2,
            life: 0.8,
            g: 160,
          })
          env.fx.ring(l.x, l.y, env.theme.accent.css, { r1: lay.cell * 2.2, life: 0.6, width: 4 })
        }
        if (solveT > (playing ? 1.7 : 1.5)) {
          if (playing) {
            L++
            newLevel(L)
          } else {
            demoCount++
            newLevel(2 + (demoCount % 4))
          }
        }
      }
    },
    render() {
      const { ctx, w, h, theme: th } = env
      const p = pattern()
      if (p) {
        ctx.fillStyle = p
        ctx.fillRect(0, 0, w, h)
      }
      if (env.state !== 'ready') drawHud()
      for (let i = 0; i < lv.base.length; i++) drawTile(i)
      drawBattery()
      drawLed()
      drawFlow()
      // keyboard cursor / hint
      const s = sel.r * lv.cols + sel.c
      if (kbd && env.state === 'playing' && !solved) {
        const c = tileCenter(s)
        const k = lay.cell - lay.cell * 0.09
        strokeRR(
          ctx,
          c.x - k / 2,
          c.y - k / 2,
          k,
          k,
          lay.cell * 0.2,
          th.fg.a(0.6 + 0.4 * Math.sin(env.time * 7)),
          2.5,
        )
      }
      if (env.state === 'playing' && !solved && idle > 12) {
        const hc = firstWrong()
        if (hc >= 0) {
          const c = tileCenter(hc)
          const k = (lay.cell - lay.cell * 0.09) * (1 + 0.05 * Math.sin(env.time * 6))
          strokeRR(
            ctx,
            c.x - k / 2,
            c.y - k / 2,
            k,
            k,
            lay.cell * 0.2,
            th.accent2.a(0.4 + 0.5 * Math.abs(Math.sin(env.time * 3))),
            3,
          )
        }
      }
      const cx = lay.gx + (lv.cols * lay.cell) / 2
      const cy = lay.gy + (lv.rows * lay.cell) / 2
      if (env.state === 'playing' && !solved && bannerT < 1.2) {
        const a = easeOutCubic(clamp(bannerT / 0.25, 0, 1)) * clamp(1 - (bannerT - 0.7) / 0.5, 0, 1)
        ctx.globalAlpha = a
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = env.font(clamp(lay.cell * 0.9, 24, 76), 800)
        ctx.fillStyle = th.fg.css
        ctx.fillText(`LEVEL ${L}`, cx, cy)
        ctx.globalAlpha = 1
      }
      if (solved && env.state === 'playing') {
        const a = easeOutCubic(clamp(solveT / 0.3, 0, 1)) * clamp(1 - (solveT - 1.3) / 0.35, 0, 1)
        ctx.globalAlpha = a
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = env.font(clamp(lay.cell * 0.34, 12, 24), 800)
        ctx.fillStyle = th.accent.css
        ctx.fillText('CIRCUIT CLOSED', cx, cy - clamp(lay.cell * 1.05, 36, 90))
        ctx.globalAlpha = 1
      }
    },
    pointerDown(p) {
      tap(p.x, p.y, shiftNow ? -1 : 1)
    },
    pointerMove(p) {
      if (p.type !== 'mouse') return
      const c = Math.floor((p.x - lay.gx) / lay.cell)
      const r = Math.floor((p.y - lay.gy) / lay.cell)
      hover = c < 0 || r < 0 || c >= lv.cols || r >= lv.rows ? -1 : r * lv.cols + c
    },
    key(e, down) {
      if (!down) return
      const k = e.key
      const mv = (dc: number, dr: number) => {
        kbd = true
        sel = { c: clamp(sel.c + dc, 0, lv.cols - 1), r: clamp(sel.r + dr, 0, lv.rows - 1) }
        env.sfx('tick')
        return true
      }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') return mv(-1, 0)
      if (k === 'ArrowRight' || k === 'd' || k === 'D') return mv(1, 0)
      if (k === 'ArrowUp' || k === 'w' || k === 'W') return mv(0, -1)
      if (k === 'ArrowDown' || k === 's' || k === 'S') return mv(0, 1)
      if (k === ' ' || k === 'Enter' || k === 'r' || k === 'R' || k === 'q' || k === 'Q') {
        kbd = true
        rotate(sel.r * lv.cols + sel.c, e.shiftKey || k === 'q' || k === 'Q' ? -1 : 1, true)
        return true
      }
    },
    destroy() {
      window.removeEventListener('pointerdown', onWinDown, true)
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
