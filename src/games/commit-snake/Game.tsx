'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER } from '../_shared/color'
import { glow, rr } from '../_shared/draw'
import { TAU, clamp, easeOutBack, lerp, randInt } from '../_shared/math'

const META: GameMeta = {
  key: 'commit-snake',
  title: 'Commit Snake',
  how: [
    { k: 'Steer', t: 'Arrows / WASD or swipe. Push your branch around the repo.' },
    { k: 'Commit', t: 'Eat commit dots to grow. Each one is +10.' },
    { k: 'Merge', t: 'Rare merge pickup: +50, trims your tail, ghost mode for 3s.' },
    { k: 'Avoid', t: 'Walls, red blocks and your own tail are merge conflicts.' },
  ],
  controls: 'Arrows / WASD · swipe on touch · P / Esc pauses',
  touch: 'none',
  keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'],
}

type V = { x: number; y: number }
type Food = { x: number; y: number; kind: 'commit' | 'merge'; age: number; ttl: number }
type Block = { cells: V[]; age: number }

const DIRS: V[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]
const KEYDIR: Record<string, V> = {
  ArrowUp: DIRS[3],
  ArrowDown: DIRS[2],
  ArrowLeft: DIRS[1],
  ArrowRight: DIRS[0],
  w: DIRS[3],
  s: DIRS[2],
  a: DIRS[1],
  d: DIRS[0],
}
const HUD_TOP = 56
const ARM_AFTER = 1.4

const create: GameFactory = (env) => {
  let cols = 20
  let rows = 14
  let cell = 20
  let ox = 0
  let oy = 0

  let snake: V[] = []
  let prev: V[] = []
  let dir: V = DIRS[0]
  let queue: V[] = []
  let food: Food[] = []
  let blocks: Block[] = []
  let acc = 0
  let grow = 0
  let eaten = 0
  let score = 0
  let ghost = 0
  let wave = 99
  let dead = false
  let startDelay = 0
  let hintT = 0
  let crash: { x: number; y: number } | null = null
  let swipe: { x: number; y: number } | null = null

  const interval = () => clamp(0.158 - eaten * 0.0017, 0.086, 0.158)
  const live = () => env.state === 'playing'
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < cols - 1 && y < rows - 1
  const cx = (x: number) => ox + (x + 0.5) * cell
  const cy = (y: number) => oy + (y + 0.5) * cell

  /** Pick the grid from the container: ~17 cells on the short side, centred under the HUD strip. */
  function layout(full: boolean) {
    const pad = 8
    const availW = env.w - pad * 2
    const availH = env.h - HUD_TOP - pad
    if (full) {
      const short = Math.min(availW, availH)
      const c0 = clamp(Math.floor(short / 17), 14, 40)
      cols = Math.max(12, Math.floor(availW / c0))
      rows = Math.max(12, Math.floor(availH / c0))
    }
    cell = Math.max(8, Math.floor(Math.min(availW / cols, availH / rows)))
    ox = Math.floor((env.w - cols * cell) / 2)
    oy = HUD_TOP + Math.floor((availH - rows * cell) / 2)
  }

  const cellFree = (x: number, y: number, ignoreTail = false) => {
    if (!inside(x, y)) return false
    for (let i = 0; i < snake.length - (ignoreTail ? 1 : 0); i++)
      if (snake[i].x === x && snake[i].y === y) return false
    for (const b of blocks) for (const c of b.cells) if (c.x === x && c.y === y) return false
    return true
  }
  const occupied = (x: number, y: number) =>
    !cellFree(x, y) || food.some((f) => f.x === x && f.y === y)

  function placeFood(kind: Food['kind']) {
    for (let n = 0; n < 80; n++) {
      const x = randInt(1, cols - 2)
      const y = randInt(1, rows - 2)
      if (!occupied(x, y)) {
        food.push({ x, y, kind, age: 0, ttl: kind === 'merge' ? 9 : Infinity })
        return true
      }
    }
    return false
  }

  function spawnBlock() {
    const len = [1, 1, 2, 2, 3][randInt(0, 4)]
    const horiz = Math.random() < 0.5
    const head = snake[0]
    for (let n = 0; n < 50; n++) {
      const x = randInt(2, cols - 3)
      const y = randInt(2, rows - 3)
      const cells: V[] = []
      for (let i = 0; i < len; i++) cells.push({ x: x + (horiz ? i : 0), y: y + (horiz ? 0 : i) })
      const ok = cells.every((c) => {
        if (!inside(c.x, c.y) || occupied(c.x, c.y)) return false
        if (Math.abs(c.x - head.x) + Math.abs(c.y - head.y) < 6) return false
        // keep a clear corridor straight ahead of the head
        const ahead = (c.x - head.x) * dir.x + (c.y - head.y) * dir.y
        const side = Math.abs((c.x - head.x) * dir.y) + Math.abs((c.y - head.y) * dir.x)
        return !(ahead > 0 && ahead < 9 && side < 2)
      })
      if (ok) {
        blocks.push({ cells, age: 0 })
        return
      }
    }
  }

  function reset() {
    layout(true)
    const sx = Math.floor(cols / 3)
    const sy = Math.floor(rows / 2)
    snake = [0, 1, 2, 3].map((i) => ({ x: sx - i, y: sy }))
    prev = snake.map((s) => ({ ...s }))
    dir = DIRS[0]
    queue = []
    food = []
    blocks = []
    acc = 0
    grow = 0
    eaten = 0
    score = 0
    ghost = 0
    wave = 99
    dead = false
    crash = null
    startDelay = 0.8
    hintT = 0
    swipe = null
    placeFood('commit')
  }

  function die(msg: string, x: number, y: number) {
    if (!live()) return reset()
    dead = true
    crash = { x, y }
    prev = snake.map((s) => ({ ...s }))
    acc = 0
    env.shake(14)
    env.sfx('lose')
    const half = msg.length * 5.2 + 8
    const px = clamp(cx(x), half, env.w - half)
    env.fx.text(px, clamp(cy(y) - cell, HUD_TOP + 10, env.h - 10), msg, DANGER, {
      size: 15,
      life: 1.4,
      rise: 22,
    })
    env.fx.ring(cx(clamp(x, 0, cols - 1)), cy(clamp(y, 0, rows - 1)), DANGER, {
      r1: cell * 3,
      life: 0.5,
    })
    for (let i = 0; i < snake.length; i += 1) {
      env.fx.burst(cx(snake[i].x), cy(snake[i].y), env.theme.accent.css, 3, {
        speed: 200,
        size: 2.6,
        life: 0.7,
        g: 220,
      })
    }
    env.gameOver(score)
  }

  function turn(d: V) {
    const last = queue.length ? queue[queue.length - 1] : dir
    if ((d.x === last.x && d.y === last.y) || (d.x === -last.x && d.y === -last.y)) return
    if (queue.length < 2) queue.push(d)
  }

  /** Attract-mode steering: greedy toward the commit, never into a dead end. */
  function autopilot() {
    const h = snake[0]
    const f = food.find((q) => q.kind === 'commit') ?? food[0]
    if (!f || snake.length > 16) return reset()
    const cands = [dir, { x: dir.y, y: -dir.x }, { x: -dir.y, y: dir.x }]
    let best: V | null = null
    let bs = Infinity
    for (const d of cands) {
      const nx = h.x + d.x
      const ny = h.y + d.y
      if (!cellFree(nx, ny, true)) continue
      let open = 0
      for (const e of DIRS) if (cellFree(nx + e.x, ny + e.y, true)) open++
      if (open < 2) continue
      const sc = Math.abs(f.x - nx) + Math.abs(f.y - ny) + Math.random() * 0.4
      if (sc < bs) {
        bs = sc
        best = d
      }
    }
    if (!best) return reset()
    if (best !== dir) queue = [best]
  }

  function step() {
    if (queue.length) dir = queue.shift() as V
    const h = snake[0]
    const nx = h.x + dir.x
    const ny = h.y + dir.y
    const fi = food.findIndex((f) => f.x === nx && f.y === ny)
    const f = fi >= 0 ? food[fi] : null
    const willGrow = grow > 0 || f?.kind === 'commit'
    if (!inside(nx, ny)) return die('MERGE CONFLICT', nx, ny)
    if (blocks.some((b) => b.age > ARM_AFTER && b.cells.some((c) => c.x === nx && c.y === ny)))
      return die('MERGE CONFLICT', nx, ny)
    if (ghost <= 0) {
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === nx && snake[i].y === ny && (i < snake.length - 1 || willGrow))
          return die('DETACHED HEAD', nx, ny)
      }
    }
    prev = snake.map((s) => ({ ...s }))
    snake.unshift({ x: nx, y: ny })
    if (grow > 0) grow--
    else if (f?.kind !== 'commit') snake.pop()

    if (!f) return
    food.splice(fi, 1)
    const th = env.theme
    const playing = live()
    if (f.kind === 'commit') {
      eaten++
      wave = 0
      if (playing) {
        score += 10
        env.score(score)
        env.sfx('pop')
        env.fx.text(cx(nx), cy(ny) - cell * 0.6, '+10', th.accent.css, { size: 14 })
      }
      env.fx.burst(cx(nx), cy(ny), th.accent.css, 12, { speed: 190, size: 2.8, life: 0.5 })
      env.fx.ring(cx(nx), cy(ny), th.accent.css, { r1: cell * 1.5, life: 0.35 })
      placeFood('commit')
      if (playing) {
        if (!food.some((q) => q.kind === 'merge') && eaten >= 3 && Math.random() < 0.24)
          placeFood('merge')
        if (eaten >= 4 && eaten % 4 === 0 && blocks.length < Math.min(9, eaten / 4)) spawnBlock()
      }
    } else {
      wave = 0
      ghost = 3.2
      const cut = Math.max(0, Math.min(2, snake.length - 4))
      for (let i = 0; i < cut; i++) {
        const t = snake.pop() as V
        env.fx.burst(cx(t.x), cy(t.y), th.accent2.css, 8, {
          speed: 170,
          size: 2.6,
          life: 0.5,
          g: 120,
        })
      }
      prev.length = Math.min(prev.length, snake.length)
      if (playing) {
        score += 50
        env.score(score)
        env.sfx('good')
        env.fx.text(cx(nx), cy(ny) - cell * 0.7, 'MERGED +50', th.accent2.css, {
          size: 15,
          life: 1.1,
        })
      }
      env.fx.burst(cx(nx), cy(ny), th.accent2.css, 20, { speed: 260, size: 3, life: 0.65 })
      env.fx.ring(cx(nx), cy(ny), th.accent2.css, { r1: cell * 2.6, life: 0.5, width: 3 })
    }
  }

  /* ---------- rendering ---------- */
  function strip(str: string, tx: number, ty: number, rot: number, len: number, off: number) {
    const { ctx } = env
    ctx.save()
    ctx.translate(tx, ty)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.rect(0, -cell / 2, len, cell)
    ctx.clip()
    ctx.font = env.font(Math.max(7, cell * 0.52), 800)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = `rgba(255,77,109,0.8)`
    const unit = Math.max(20, ctx.measureText(str + '   ').width)
    for (let x = -(off % unit); x < len; x += unit) ctx.fillText(str, x, 0)
    ctx.restore()
  }

  function drawBoard() {
    const { ctx, theme: th } = env
    const bw = cols * cell
    const bh = rows * cell
    // interior dot grid
    ctx.fillStyle = th.fg.a(0.1)
    const d = Math.max(1.5, cell * 0.08)
    for (let y = 1; y < rows - 1; y++)
      for (let x = 1; x < cols - 1; x++) ctx.fillRect(cx(x) - d / 2, cy(y) - d / 2, d, d)
    // conflict ring
    ctx.save()
    ctx.beginPath()
    ctx.rect(ox, oy, bw, bh)
    ctx.rect(ox + cell, oy + cell, bw - cell * 2, bh - cell * 2)
    ctx.clip('evenodd')
    ctx.fillStyle = 'rgba(255,77,109,0.13)'
    ctx.fillRect(ox, oy, bw, bh)
    ctx.strokeStyle = 'rgba(255,77,109,0.2)'
    ctx.lineWidth = Math.max(2, cell * 0.22)
    const step = cell * 0.9
    ctx.beginPath()
    for (let i = -bh; i < bw + bh; i += step) {
      ctx.moveTo(ox + i, oy + bh)
      ctx.lineTo(ox + i + bh, oy)
    }
    ctx.stroke()
    ctx.restore()
    const off = env.reduced ? 0 : env.time * cell * 1.4
    strip('<<<<<<< HEAD', ox, oy + cell / 2, 0, bw, off)
    strip('>>>>>>> feature/snake', ox, oy + bh - cell / 2, 0, bw, off)
    strip('=======', ox + cell / 2, oy + bh, -Math.PI / 2, bh, off)
    strip('=======', ox + bw - cell / 2, oy, Math.PI / 2, bh, off)
    ctx.strokeStyle = 'rgba(255,77,109,0.55)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(ox + cell, oy + cell, bw - cell * 2, bh - cell * 2)
  }

  function drawBlocks() {
    const { ctx, theme: th } = env
    for (const b of blocks) {
      const armed = b.age > ARM_AFTER
      const blink = armed ? 1 : 0.35 + 0.35 * Math.abs(Math.sin(b.age * 11))
      const pop = easeOutBack(clamp(b.age / 0.3, 0, 1))
      for (const c of b.cells) {
        const x = ox + c.x * cell + 1
        const y = oy + c.y * cell + 1
        const s = cell - 2
        const cxx = x + s / 2
        const cyy = y + s / 2
        ctx.save()
        ctx.translate(cxx, cyy)
        ctx.scale(pop, pop)
        ctx.translate(-cxx, -cyy)
        if (armed) {
          ctx.globalAlpha = 0.9
          rr(ctx, x, y, s, s, cell * 0.2)
          ctx.fillStyle = DANGER
          ctx.fill()
          ctx.save()
          rr(ctx, x, y, s, s, cell * 0.2)
          ctx.clip()
          ctx.strokeStyle = th.bg.a(0.4)
          ctx.lineWidth = Math.max(2, cell * 0.16)
          ctx.beginPath()
          for (let i = -s; i < s * 2; i += cell * 0.6) {
            ctx.moveTo(x + i, y + s)
            ctx.lineTo(x + i + s, y)
          }
          ctx.stroke()
          ctx.restore()
          ctx.globalAlpha = 1
        } else {
          ctx.globalAlpha = blink
          rr(ctx, x, y, s, s, cell * 0.2)
          ctx.setLineDash([cell * 0.22, cell * 0.16])
          ctx.strokeStyle = DANGER
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = 'rgba(255,77,109,0.18)'
          ctx.fill()
          ctx.globalAlpha = 1
        }
        ctx.restore()
      }
    }
  }

  function drawFood() {
    const { ctx, theme: th } = env
    for (const f of food) {
      const pop = easeOutBack(clamp(f.age / 0.3, 0, 1))
      const x = cx(f.x)
      const y = cy(f.y)
      const pulse = Math.sin(env.time * 5 + f.x) * 0.08
      if (f.kind === 'commit') {
        glow(ctx, x, y, cell * 1.3, th.accent, 0.3)
        ctx.strokeStyle = th.accent.a(0.45)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, cell * (0.44 + pulse) * pop, 0, TAU)
        ctx.stroke()
        ctx.fillStyle = th.accent.css
        ctx.beginPath()
        ctx.arc(x, y, cell * 0.27 * pop, 0, TAU)
        ctx.fill()
        ctx.fillStyle = th.bg.css
        ctx.beginPath()
        ctx.arc(x, y, cell * 0.09 * pop, 0, TAU)
        ctx.fill()
      } else {
        const left = f.ttl - f.age
        if (left < 2.2 && Math.floor(env.time * 8) % 2 === 0) continue
        glow(ctx, x, y, cell * 1.5, th.accent2, 0.38)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(Math.PI / 4 + Math.sin(env.time * 2) * 0.12)
        ctx.scale(pop * (1 + pulse), pop * (1 + pulse))
        rr(ctx, -cell * 0.33, -cell * 0.33, cell * 0.66, cell * 0.66, cell * 0.14)
        ctx.fillStyle = th.accent2.css
        ctx.fill()
        ctx.restore()
        // Y-shaped merge glyph
        ctx.strokeStyle = th.bg.css
        ctx.lineWidth = Math.max(1.8, cell * 0.1)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x - cell * 0.15, y - cell * 0.18)
        ctx.lineTo(x, y)
        ctx.lineTo(x + cell * 0.15, y - cell * 0.18)
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + cell * 0.2)
        ctx.stroke()
        ctx.strokeStyle = th.accent2.a(0.7)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, cell * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(left / f.ttl, 0, 1))
        ctx.stroke()
      }
    }
  }

  function drawSnake() {
    const { ctx, theme: th } = env
    const k = dead ? 1 : clamp(acc / interval(), 0, 1)
    const n = snake.length
    const pts: V[] = []
    for (let i = 0; i < n; i++) {
      const p = prev[i] ?? prev[prev.length - 1] ?? snake[i]
      pts.push({ x: lerp(cx(p.x), cx(snake[i].x), k), y: lerp(cy(p.y), cy(snake[i].y), k) })
    }
    const ghostA = ghost > 0 ? (ghost < 1 ? 0.5 + 0.3 * Math.sin(env.time * 24) : 0.55) : 1
    const body = ghost > 0 ? th.accent2 : th.accent
    const w0 = cell * 0.54
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = ghostA
    // soft trail glow
    ctx.strokeStyle = body.a(0.16)
    ctx.lineWidth = cell * 1.0
    ctx.beginPath()
    ctx.moveTo(pts[n - 1].x, pts[n - 1].y)
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
    // body: segment by segment so the colour fades toward the tail
    for (let i = n - 1; i > 0; i--) {
      const t = i / Math.max(1, n - 1)
      ctx.strokeStyle = body.mix(th.bg, t * 0.6)
      ctx.lineWidth = w0 * (1 - t * 0.3)
      ctx.beginPath()
      ctx.moveTo(pts[i].x, pts[i].y)
      ctx.lineTo(pts[i - 1].x, pts[i - 1].y)
      ctx.stroke()
    }
    // commit nodes along the branch, pulsing as the growth wave passes
    for (let i = 1; i < n; i++) {
      const pulse = Math.max(0, 1 - Math.abs(i - wave) / 2.6)
      ctx.fillStyle = th.bg.a(0.55)
      ctx.beginPath()
      ctx.arc(pts[i].x, pts[i].y, cell * (0.15 + pulse * 0.16), 0, TAU)
      ctx.fill()
      if (pulse > 0.05) {
        ctx.strokeStyle = th.fg.a(pulse * 0.8)
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
    // head
    const h = pts[0]
    const flash = dead && Math.floor(env.time * 14) % 2 === 0
    ctx.fillStyle = flash ? DANGER : body.css
    ctx.beginPath()
    ctx.arc(h.x, h.y, cell * 0.42, 0, TAU)
    ctx.fill()
    const ex = dir.x
    const ey = dir.y
    ctx.fillStyle = th.bg.css
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(
        h.x + ex * cell * 0.13 - ey * s * cell * 0.15,
        h.y + ey * cell * 0.13 + ex * s * cell * 0.15,
        cell * 0.075,
        0,
        TAU,
      )
      ctx.fill()
    }
    if (ghost > 0) {
      ctx.strokeStyle = th.accent2.a(0.9)
      ctx.lineWidth = 2
      ctx.setLineDash([cell * 0.2, cell * 0.2])
      ctx.lineDashOffset = -env.time * 30
      ctx.beginPath()
      ctx.arc(h.x, h.y, cell * 0.65, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }

  function drawHud() {
    const { ctx, theme: th } = env
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = env.font(11, 700)
    ctx.fillStyle = th.fg.a(0.55)
    ctx.fillText(`LEN ${snake.length}  ·  CONFLICTS ${blocks.length}`, env.w / 2, 24)
    if (ghost > 0) {
      ctx.fillStyle = th.fg.a(0.12)
      ctx.fillRect(env.w / 2 - 36, 33, 72, 4)
      ctx.fillStyle = th.accent2.css
      ctx.fillRect(env.w / 2 - 36, 33, 72 * clamp(ghost / 3.2, 0, 1), 4)
      ctx.font = env.font(10, 800)
      ctx.fillStyle = th.accent2.css
      ctx.fillText('GHOST', env.w / 2, 49)
    }
  }

  return {
    reset,
    resize() {
      // mid-run: only refit the cell size; otherwise rebuild the attract board for the new aspect
      if (env.state === 'playing' || env.state === 'paused') layout(false)
      else reset()
    },
    update(dt) {
      const ambient = env.state === 'ready'
      hintT += dt
      wave += dt * 26
      for (const f of food) f.age += dt
      for (let i = food.length - 1; i >= 0; i--) if (food[i].age > food[i].ttl) food.splice(i, 1)
      for (const b of blocks) b.age += dt
      if (ghost > 0) ghost = Math.max(0, ghost - dt)
      if (dead || (!ambient && !live())) return
      if (live() && startDelay > 0) {
        startDelay -= dt
        return
      }
      acc += dt
      let guard = 0
      while (acc >= interval() && !dead && guard++ < 3) {
        acc -= interval()
        if (ambient) autopilot()
        step()
      }
    },
    render() {
      drawBoard()
      drawBlocks()
      drawFood()
      drawSnake()
      if (env.state !== 'ready') drawHud()
      if (env.state === 'playing' && hintT < 3.2 && !dead) {
        const { ctx, theme: th } = env
        ctx.globalAlpha = clamp((3.2 - hintT) / 0.8, 0, 1) * 0.85
        ctx.font = env.font(clamp(cell * 0.7, 12, 18), 700)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = th.fg.css
        ctx.fillText(
          env.coarse ? 'swipe to steer' : 'arrows / WASD to steer',
          env.w / 2,
          oy + Math.floor(rows * 0.7) * cell,
        )
        ctx.globalAlpha = 1
      }
    },
    pointerDown(p) {
      swipe = { x: p.x, y: p.y }
    },
    pointerMove(p) {
      if (!swipe || !p.down) return
      const dx = p.x - swipe.x
      const dy = p.y - swipe.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS[0] : DIRS[1]) : dy > 0 ? DIRS[2] : DIRS[3])
      swipe = { x: p.x, y: p.y }
    },
    pointerUp() {
      swipe = null
    },
    key(e, down) {
      if (!down) return
      const d = KEYDIR[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!d) return
      turn(d)
      return true
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
