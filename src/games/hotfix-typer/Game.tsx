'use client'

import { GameShell } from '../_shared/GameShell'
import type { GameFactory, GameMeta } from '../_shared/engine'
import type { GameProps } from '../types'
import { DANGER } from '../_shared/color'
import { fillRR, strokeRR } from '../_shared/draw'
import { clamp, hash01, lerp, pick, rand } from '../_shared/math'

const META: GameMeta = {
  key: 'hotfix-typer',
  title: 'Hotfix Typer',
  how: [
    { k: 'Type', t: 'Type the falling tokens before they hit PROD.' },
    { k: 'Tap', t: 'On a phone, tap the chip of the token that is lowest.' },
    { k: '×N', t: 'Chain tokens without a typo to raise the multiplier.' },
  ],
  controls: 'Keyboard · Esc pauses · Backspace undoes a letter',
  touch: 'none',
  typing: true,
}

const SHORT = [
  'null',
  'let',
  'var',
  'if',
  'fn',
  '404',
  '=>',
  'npm i',
  'sudo',
  'git',
  'main',
  'ssh',
  'NaN',
  'void',
  'true',
  'map',
  'pop',
  'push',
  'exit',
  'cd ..',
  'ls -la',
  ':wq',
  'chmod',
  'curl',
  'grep',
  'JSON',
  '0x1F',
  'tsc',
  'vim',
  'bash',
  'yarn',
  'env',
  'fix',
  'bug',
  'ci',
  'diff',
  'tag',
  'pull',
]
const MID = [
  'useState',
  'await',
  'async',
  'Promise',
  'console.log',
  'try/catch',
  'Ctrl+Z',
  'git rebase',
  'npm run dev',
  'useEffect',
  'undefined',
  'Math.max',
  'git stash',
  'rm -rf',
  'export',
  'import',
  'return',
  'typeof',
  'finally',
  'segfault',
  'merge',
  'hotfix',
  'rollback',
  'deploy',
  'lint',
  'pnpm i',
  'localhost',
  'git log',
  'git add .',
  'docker up',
  'redis',
  'rebase',
  'revert',
  'cache',
  'webpack',
  'regex',
]
const LONG = [
  'useCallback',
  'Object.keys',
  'git cherry-pick',
  'document.title',
  'addEventListener',
  'JSON.parse',
  'setTimeout',
  'Array.from',
  'localStorage',
  'process.exit(1)',
  'git commit --amend',
  'kubectl apply',
  'requestAnimationFrame',
  'git push --force',
  'npm audit fix',
  'null pointer',
  'stack overflow',
  'race condition',
  'works on my machine',
  'git reset --hard',
]

const LIVES = 3

type Token = {
  text: string
  x: number
  y: number
  vy: number
  w: number
  h: number
  typed: number
  flash: number
  born: number
}
type Beam = { x1: number; y1: number; x2: number; y2: number; life: number }

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const create: GameFactory = (env) => {
  let tokens: Token[] = []
  let beams: Beam[] = []
  let t = 0
  let bgT = 0
  let spawnT = 0.6
  let botT = 1.6
  let lives = LIVES
  let combo = 0
  let score = 0
  let buffer = ''
  let locked: Token | null = null
  let errFlash = 0
  let floorFlash = 0
  let lostPulse = 0
  let keyboardSeen = false
  let chipFlash = 0

  const fs = () => clamp(Math.min(env.w, env.h) * 0.042, 14, 22)
  const mono = (px: number, wt = 600) => `${wt} ${px}px ${MONO}`
  const picker = () => env.coarse && !keyboardSeen
  const chipCols = () => (env.w >= 560 || env.h < 420 ? 4 : 2)
  const bottomH = () => {
    if (!picker()) return 64
    const rows = Math.ceil(4 / chipCols())
    return 24 + rows * 48 + (rows - 1) * 8
  }
  const floorY = () => env.h - bottomH()
  const diff = () => 1 - Math.exp(-t / 55)
  const mult = () => Math.min(6, 1 + Math.floor(combo / 5))
  const dg = (a: number) => `rgba(255,77,109,${a})`

  const measure = (text: string) => {
    env.ctx.font = mono(fs())
    return env.ctx.measureText(text).width + 22
  }

  function pickText() {
    const d = diff()
    const maxChars = Math.floor((env.w - 40) / (fs() * 0.62))
    const wShort = lerp(0.72, 0.22, d)
    const wLong = t > 25 ? lerp(0, 0.3, d) : 0
    const r = Math.random()
    const cls = r < wShort ? SHORT : r < 1 - wLong ? MID : LONG
    const pool = cls.filter((s) => s.length <= maxChars)
    const src = pool.length ? pool : SHORT
    const firsts = tokens.map((k) => k.text[0].toLowerCase())
    for (let i = 0; i < 14; i++) {
      const s = pick(src)
      if (!tokens.some((k) => k.text === s) && !firsts.includes(s[0].toLowerCase())) return s
    }
    return pick(src)
  }

  function spawn(y?: number) {
    const text = pickText()
    const w = measure(text)
    const h = fs() * 1.95
    const margin = 8
    let x = env.w / 2
    let bestOverlap = Infinity
    for (let i = 0; i < 8; i++) {
      const cx = rand(w / 2 + margin, Math.max(w / 2 + margin + 1, env.w - w / 2 - margin))
      let overlap = 0
      for (const k of tokens) {
        if (k.y < 110) overlap += Math.max(0, (k.w + w) / 2 - Math.abs(k.x - cx))
      }
      if (overlap < bestOverlap) {
        bestOverlap = overlap
        x = cx
      }
    }
    const fall = lerp(12, 4.8, diff())
    tokens.push({
      text,
      x,
      y: y ?? -h,
      vy: (floorY() / fall) * rand(0.93, 1.07),
      w,
      h,
      typed: 0,
      flash: 0,
      born: t,
    })
  }

  function zap(tk: Token) {
    beams.push({ x1: env.w / 2, y1: floorY(), x2: tk.x, y2: tk.y, life: 0.2 })
  }

  function burst(tk: Token, color: string, n = 22) {
    env.fx.burst(tk.x, tk.y, color, n, { speed: 280, size: 3, life: 0.6, g: 260 })
    env.fx.burst(tk.x, tk.y, env.theme.fg.a(0.9), 8, {
      speed: 190,
      size: 2,
      life: 0.45,
      square: true,
    })
    env.fx.ring(tk.x, tk.y, color, { r1: tk.w * 0.7, life: 0.35 })
  }

  function unlock() {
    if (locked) locked.typed = 0
    locked = null
    buffer = ''
  }

  function kill(tk: Token) {
    const th = env.theme
    const i = tokens.indexOf(tk)
    if (i >= 0) tokens.splice(i, 1)
    if (locked === tk) {
      locked = null
      buffer = ''
    }
    zap(tk)
    burst(tk, th.accent.css)
    if (env.state !== 'playing') return
    combo += 1
    const gain = tk.text.length * 10 * mult()
    score += gain
    env.score(score)
    env.shake(2)
    env.sfx('pop')
    env.fx.text(tk.x, tk.y - tk.h, `+${gain}`, mult() > 1 ? th.accent2.css : th.fg.css, {
      size: 14 + Math.min(8, mult() * 1.5),
    })
    if (combo > 0 && combo % 5 === 0) {
      env.sfx('good')
      env.fx.text(env.w / 2, 92, `COMBO ×${mult()}`, th.accent.css, { size: 22, life: 1, rise: 12 })
    }
  }

  function mistake() {
    combo = 0
    errFlash = 1
    env.shake(3.5)
    env.sfx('hit')
  }

  const lowestMatching = (prefix: string) => {
    let best: Token | null = null
    for (const k of tokens) {
      if (k.y < -k.h * 0.4) continue
      if (k.text.toLowerCase().startsWith(prefix) && (!best || k.y > best.y)) best = k
    }
    return best
  }

  function typeChar(ch: string) {
    const lc = ch.toLowerCase()
    const next = buffer + lc
    const cand =
      locked && locked.text.toLowerCase().startsWith(next) ? locked : lowestMatching(next)
    if (cand) {
      if (locked && locked !== cand) locked.typed = 0
      buffer = next
      locked = cand
      cand.typed = buffer.length
      cand.flash = 1
      if (buffer.length >= cand.text.length) kill(cand)
      else env.sfx('tick')
      return
    }
    const hadBuffer = buffer.length > 0
    unlock()
    mistake()
    if (hadBuffer) {
      const fresh = lowestMatching(lc)
      if (fresh) {
        locked = fresh
        buffer = lc
        fresh.typed = 1
        fresh.flash = 1
      }
    }
  }

  function chipRects() {
    const cols = chipCols()
    const rows = Math.ceil(4 / cols)
    const gap = 8
    const padX = 12
    const cw = (env.w - padX * 2 - gap * (cols - 1)) / cols
    const top = floorY() + 12
    const out: { x: number; y: number; w: number; h: number }[] = []
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols
      const r = Math.floor(i / cols)
      out.push({ x: padX + c * (cw + gap), y: top + r * (48 + gap), w: cw, h: 48 })
    }
    return out
  }
  const chipTokens = () =>
    [...tokens]
      .filter((k) => k.y > -k.h * 0.2)
      .sort((a, b) => b.y - a.y)
      .slice(0, 4)

  function breach(tk: Token) {
    lives -= 1
    combo = 0
    floorFlash = 1
    lostPulse = 1
    burst(tk, DANGER, 26)
    env.shake(13)
    env.sfx('bad')
    env.fx.text(env.w / 2, floorY() - 34, 'PROD IS DOWN', DANGER, { size: 18, life: 1.2, rise: 16 })
    if (locked === tk) unlock()
    if (lives <= 0) {
      env.sfx('lose')
      env.gameOver(score)
    }
  }

  /* ---------- drawing ---------- */
  function drawBg() {
    const { ctx, w, h, theme: th } = env
    ctx.fillStyle = th.fg.a(0.07)
    const cols = Math.ceil(w / 52)
    for (let c = 0; c < cols; c++) {
      const x = c * 52 + 26 + (hash01(c * 5 + 1) - 0.5) * 22
      const sp = 14 + hash01(c * 3 + 2) * 36
      for (let k = 0; k < 4; k++) {
        const len = 6 + hash01(c * 11 + k) * 14
        const y = ((bgT * sp + hash01(c * 9 + k * 3) * h * 2 + k * (h / 3.4)) % (h + 60)) - 30
        ctx.fillRect(x, y, 2, len)
      }
    }
  }

  function drawFloor() {
    const { ctx, w, h, theme: th } = env
    const fy = floorY()
    const g = ctx.createLinearGradient(0, fy - 110, 0, fy)
    g.addColorStop(0, dg(0))
    g.addColorStop(1, dg(0.16 + floorFlash * 0.3))
    ctx.fillStyle = g
    ctx.fillRect(0, fy - 110, w, 110)
    ctx.fillStyle = th.bg.a(0.78)
    ctx.fillRect(0, fy, w, h - fy)
    // rack silhouettes
    const n = Math.ceil(w / 34)
    const dmg = (LIVES - lives) / LIVES
    for (let i = 0; i < n; i++) {
      const rh = 20 + hash01(i * 7 + 3) * 24
      const rx = i * 34 + 4
      fillRR(ctx, rx, fy + 8, 26, Math.min(rh, h - fy - 8), 3, th.fg.a(0.06))
      for (let k = 0; k < 3; k++) {
        const down = hash01(i * 13 + k) < dmg * 0.7
        const blink = Math.sin(bgT * 3 + i * 1.7 + k * 2.3) > -0.2
        ctx.fillStyle = down ? dg(0.9) : blink ? th.accent.a(0.75) : th.accent.a(0.2)
        ctx.fillRect(rx + 5, fy + 14 + k * 8, 4, 2)
        ctx.fillStyle = th.fg.a(0.12)
        ctx.fillRect(rx + 12, fy + 14 + k * 8, 9, 2)
      }
    }
    ctx.fillStyle = dg(0.85 + floorFlash * 0.15)
    ctx.fillRect(0, fy - 1.5, w, 3)
    ctx.fillStyle = dg(0.35 + floorFlash * 0.3)
    ctx.fillRect(0, fy - 5, w, 3.5)
    ctx.font = env.font(10, 800)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = dg(0.9)
    ctx.fillText('P R O D', 10, fy - 10)
  }

  function drawToken(k: Token) {
    const { ctx, theme: th } = env
    const size = fs()
    const x0 = k.x - k.w / 2
    const y0 = k.y - k.h / 2
    const fy = floorY()
    const danger = clamp((k.y - fy * 0.55) / (fy * 0.45), 0, 1)
    const isLocked = k === locked
    const pulse = danger > 0.6 ? 0.5 + 0.5 * Math.sin(bgT * 12) : 0
    fillRR(ctx, x0, y0, k.w, k.h, 8, th.bg.mix(th.fg, 0.1 + k.flash * 0.1))
    strokeRR(
      ctx,
      x0 + 0.5,
      y0 + 0.5,
      k.w - 1,
      k.h - 1,
      8,
      danger > 0.01
        ? dg(0.25 + danger * 0.55 + pulse * 0.2)
        : isLocked
          ? th.accent.css
          : th.fg.a(0.2),
      isLocked ? 2 : 1.2,
    )
    if (isLocked) {
      ctx.globalAlpha = 0.18
      fillRR(ctx, x0 - 3, y0 - 3, k.w + 6, k.h + 6, 11, th.accent.css)
      ctx.globalAlpha = 1
    }
    ctx.font = mono(size)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const tx = x0 + 11
    const typed = k.text.slice(0, k.typed)
    const rest = k.text.slice(k.typed)
    ctx.fillStyle = th.accent.css
    ctx.fillText(typed, tx, k.y + 1)
    const tw = ctx.measureText(typed).width
    ctx.fillStyle = danger > 0.5 ? th.fg.mix(th.bg, 0) : th.fg.a(0.82)
    ctx.fillText(rest, tx + tw, k.y + 1)
  }

  function drawChips() {
    const { ctx, theme: th } = env
    const rects = chipRects()
    const list = chipTokens()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      const k = list[i]
      if (!k) {
        strokeRR(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 12, th.fg.a(0.08), 1)
        continue
      }
      const urgent = i === 0
      const pulse = urgent ? 0.5 + 0.5 * Math.sin(bgT * 8) : 0
      fillRR(ctx, r.x, r.y, r.w, r.h, 12, urgent ? dg(0.14 + pulse * 0.12) : th.fg.a(0.08))
      strokeRR(
        ctx,
        r.x + 0.5,
        r.y + 0.5,
        r.w - 1,
        r.h - 1,
        12,
        urgent ? dg(0.7 + pulse * 0.3) : th.fg.a(0.25),
        urgent ? 2 : 1.2,
      )
      let px = 16
      ctx.font = mono(px, 700)
      const tw = ctx.measureText(k.text).width
      const room = r.w - 18
      if (tw > room) px = Math.max(10, Math.floor((px * room) / tw))
      ctx.font = mono(px, 700)
      ctx.fillStyle = urgent ? th.fg.css : th.fg.a(0.88)
      ctx.fillText(k.text, r.x + r.w / 2, r.y + r.h / 2 + 1)
    }
    if (chipFlash > 0) chipFlash = Math.max(0, chipFlash - 0.05)
  }

  function drawBuffer() {
    const { ctx, w, theme: th } = env
    const fy = floorY()
    const label = locked ? locked.text.slice(0, locked.typed) : buffer
    const size = Math.max(15, fs())
    ctx.font = mono(size, 700)
    const tw = Math.max(ctx.measureText(label).width, 70)
    const pw = tw + 34
    const px = w / 2 - pw / 2
    const py = fy + 14
    const ph = 36
    fillRR(ctx, px, py, pw, ph, 10, th.bg.mix(th.fg, 0.1))
    strokeRR(
      ctx,
      px + 0.5,
      py + 0.5,
      pw - 1,
      ph - 1,
      10,
      errFlash > 0 ? dg(0.5 + errFlash * 0.5) : th.fg.a(0.22),
      1.5,
    )
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const tx = w / 2 - ctx.measureText(label).width / 2
    ctx.fillStyle = errFlash > 0.3 ? DANGER : th.accent.css
    ctx.fillText(label, tx, py + ph / 2 + 1)
    if (!label && t < 14) {
      ctx.textAlign = 'center'
      ctx.font = mono(12, 600)
      ctx.fillStyle = th.fg.a(0.5)
      ctx.fillText('type a token…', w / 2, py + ph / 2 + 1)
    } else if (Math.floor(bgT * 2) % 2 === 0) {
      ctx.fillStyle = th.accent.css
      ctx.fillRect(tx + ctx.measureText(label).width + 2, py + 9, 2, ph - 18)
    }
  }

  function drawHud() {
    const { ctx, w, theme: th } = env
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
      ctx.font = env.font(12, 800)
      ctx.fillStyle = th.fg.a(0.7)
      ctx.fillText(`STREAK ${combo}`, cx, 48)
      ctx.font = env.font(m > 1 ? 22 : 17, 800)
      ctx.fillStyle = m > 1 ? th.accent2.css : th.fg.css
      ctx.fillText(`×${m}`, cx, 70)
    }
  }

  return {
    reset() {
      tokens = []
      beams = []
      t = 0
      spawnT = 0.5
      botT = 1.6
      lives = LIVES
      combo = 0
      score = 0
      buffer = ''
      locked = null
      errFlash = 0
      floorFlash = 0
      lostPulse = 0
      if (env.state === 'ready' || env.state === 'over') {
        // attract-mode tokens already mid-fall so the start screen is alive
        for (let i = 0; i < 3; i++) spawn(rand(30, floorY() * 0.38))
      }
    },
    resize() {
      for (const k of tokens) {
        k.w = measure(k.text)
        k.h = fs() * 1.95
        k.x = clamp(k.x, k.w / 2 + 8, Math.max(k.w / 2 + 9, env.w - k.w / 2 - 8))
      }
    },
    update(dt) {
      const playing = env.state === 'playing'
      const ambient = env.state === 'ready'
      bgT += dt
      errFlash = Math.max(0, errFlash - dt * 4)
      floorFlash = Math.max(0, floorFlash - dt * 2.2)
      lostPulse = Math.max(0, lostPulse - dt * 2)
      for (let i = beams.length - 1; i >= 0; i--) {
        beams[i].life -= dt
        if (beams[i].life <= 0) beams.splice(i, 1)
      }
      for (const k of tokens) k.flash = Math.max(0, k.flash - dt * 5)
      if (!playing && !ambient) return
      if (playing) t += dt
      spawnT -= dt
      if (spawnT <= 0) {
        spawnT = playing ? lerp(2.2, 0.8, diff()) * rand(0.85, 1.15) : 1.5
        if (playing || tokens.length < 5) spawn()
      }
      if (ambient) {
        botT -= dt
        if (botT <= 0) {
          botT = 1.4
          const low = [...tokens].sort((a, b) => b.y - a.y)[0]
          if (low && low.y > env.h * 0.25) kill(low)
        }
      }
      const fy = floorY()
      for (let i = tokens.length - 1; i >= 0; i--) {
        const k = tokens[i]
        k.y += k.vy * dt
        if (k.y + k.h / 2 >= fy) {
          tokens.splice(i, 1)
          if (playing) breach(k)
          else burst(k, DANGER, 12)
        }
      }
    },
    render() {
      const { ctx, w, theme: th } = env
      drawBg()
      drawFloor()
      for (const b of beams) {
        const a = clamp(b.life / 0.2, 0, 1)
        ctx.lineCap = 'round'
        ctx.strokeStyle = th.accent.a(a * 0.55)
        ctx.lineWidth = 6 * a
        ctx.beginPath()
        ctx.moveTo(b.x1, b.y1)
        ctx.lineTo(b.x2, b.y2)
        ctx.stroke()
        ctx.strokeStyle = th.fg.a(a)
        ctx.lineWidth = 1.6
        ctx.stroke()
      }
      if (locked && env.state === 'playing') {
        ctx.setLineDash([3, 7])
        ctx.strokeStyle = th.accent.a(0.35)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(w / 2, floorY())
        ctx.lineTo(locked.x, locked.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
      for (const k of tokens) drawToken(k)
      if (env.state !== 'ready') {
        drawHud()
        if (picker()) drawChips()
        else drawBuffer()
      }
      if (env.state === 'playing' && picker() && t < 9) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.font = env.font(11, 600)
        ctx.fillStyle = th.fg.a(0.5)
        ctx.fillText('tap the lowest token', w / 2, floorY() - 14)
      }
    },
    pointerDown(p) {
      if (p.type !== 'mouse') keyboardSeen = false
      if (!picker()) return
      const rects = chipRects()
      const list = chipTokens()
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        if (list[i] && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y - 4 && p.y <= r.y + r.h + 4) {
          list[i].typed = list[i].text.length
          kill(list[i])
          chipFlash = 1
          return
        }
      }
    },
    key(e, down) {
      if (!down) return
      if (e.key === 'Backspace') {
        if (buffer) {
          buffer = buffer.slice(0, -1)
          if (locked) locked.typed = buffer.length
          if (!buffer) unlock()
        }
        keyboardSeen = true
        return true
      }
      if (e.key.length === 1) {
        keyboardSeen = true
        typeChar(e.key)
        return true
      }
    },
  }
}

export default function Game(props: GameProps) {
  return <GameShell {...props} meta={META} create={create} />
}
