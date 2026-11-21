import { TAU } from './math'

/** Rounded-rect path (uses native roundRect when available). */
export function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, rad)
    return
  }
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

export function fillRR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  rr(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

export function strokeRR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string,
  lw = 1,
) {
  rr(ctx, x, y, w, h, r)
  ctx.strokeStyle = stroke
  ctx.lineWidth = lw
  ctx.stroke()
}

export function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill?: string,
  stroke?: string,
  lw = 1,
) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lw
    ctx.stroke()
  }
}

/** Soft radial glow — cheaper and more portable than shadowBlur. */
export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: { r: number; g: number; b: number },
  alpha = 0.5,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`)
  g.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

export type TextOpts = { align?: CanvasTextAlign; base?: CanvasTextBaseline; alpha?: number }
export function label(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  o: TextOpts = {},
) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'alphabetic'
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha
  ctx.fillText(str, x, y)
  if (o.alpha !== undefined) ctx.globalAlpha = 1
}
