import { TAU, easeOutBack, clamp } from './math'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  g: number
  drag: number
  sq: boolean
  rot: number
  vr: number
}
type FText = {
  x: number
  y: number
  str: string
  color: string
  life: number
  max: number
  size: number
  rise: number
}
type Ring = {
  x: number
  y: number
  color: string
  life: number
  max: number
  r0: number
  r1: number
  w: number
}

export type BurstOpts = {
  speed?: number
  life?: number
  size?: number
  /** gravity px/s² */
  g?: number
  /** cone width in radians (TAU = all directions) */
  spread?: number
  /** cone centre angle */
  angle?: number
  drag?: number
  square?: boolean
}

/** Particles, floating score text and expanding rings. Positions are in CSS pixels. */
export class Fx {
  parts: Particle[] = []
  texts: FText[] = []
  rings: Ring[] = []
  /** Particle-count multiplier (lowered for prefers-reduced-motion). */
  scale = 1

  burst(x: number, y: number, color: string, n = 12, o: BurstOpts = {}) {
    const count = Math.max(1, Math.round(n * this.scale))
    const {
      speed = 220,
      life = 0.6,
      size = 3,
      g = 0,
      spread = TAU,
      angle = 0,
      drag = 1.6,
      square = false,
    } = o
    for (let i = 0; i < count; i++) {
      if (this.parts.length > 600) break
      const a = angle + (Math.random() - 0.5) * spread
      const s = speed * (0.35 + Math.random() * 0.65)
      const l = life * (0.6 + Math.random() * 0.6)
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: l,
        max: l,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        g,
        drag,
        sq: square,
        rot: Math.random() * TAU,
        vr: (Math.random() - 0.5) * 10,
      })
    }
  }

  text(
    x: number,
    y: number,
    str: string,
    color: string,
    o: { size?: number; life?: number; rise?: number } = {},
  ) {
    if (this.texts.length > 40) this.texts.shift()
    const life = o.life ?? 0.9
    this.texts.push({ x, y, str, color, life, max: life, size: o.size ?? 16, rise: o.rise ?? 38 })
  }

  ring(
    x: number,
    y: number,
    color: string,
    o: { r0?: number; r1?: number; life?: number; width?: number } = {},
  ) {
    if (this.rings.length > 30) this.rings.shift()
    const life = o.life ?? 0.45
    this.rings.push({
      x,
      y,
      color,
      life,
      max: life,
      r0: o.r0 ?? 4,
      r1: o.r1 ?? 46,
      w: o.width ?? 3,
    })
  }

  clear() {
    this.parts.length = 0
    this.texts.length = 0
    this.rings.length = 0
  }

  update(dt: number) {
    const P = this.parts
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]
      p.life -= dt
      if (p.life <= 0) {
        P[i] = P[P.length - 1]
        P.pop()
        continue
      }
      const k = Math.exp(-p.drag * dt)
      p.vx *= k
      p.vy = p.vy * k + p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]
      t.life -= dt
      if (t.life <= 0) this.texts.splice(i, 1)
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]
      r.life -= dt
      if (r.life <= 0) this.rings.splice(i, 1)
    }
  }

  draw(ctx: CanvasRenderingContext2D, font: (px: number, weight?: number) => string) {
    for (const r of this.rings) {
      const t = 1 - r.life / r.max
      ctx.globalAlpha = 1 - t
      ctx.strokeStyle = r.color
      ctx.lineWidth = r.w * (1 - t * 0.7)
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - t, 3)), 0, TAU)
      ctx.stroke()
    }
    for (const p of this.parts) {
      const t = p.life / p.max
      ctx.globalAlpha = clamp(t * 1.4, 0, 1)
      ctx.fillStyle = p.color
      const s = p.size * (0.4 + 0.6 * t)
      if (p.sq) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillRect(-s, -s, s * 2, s * 2)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, s, 0, TAU)
        ctx.fill()
      }
    }
    if (this.texts.length) {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const t of this.texts) {
        const k = 1 - t.life / t.max
        const pop = k < 0.18 ? easeOutBack(k / 0.18) : 1
        ctx.globalAlpha = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1
        ctx.font = font(t.size * pop, 800)
        ctx.fillStyle = t.color
        ctx.fillText(t.str, t.x, t.y - t.rise * (1 - Math.pow(1 - k, 2)))
      }
    }
    ctx.globalAlpha = 1
  }
}
