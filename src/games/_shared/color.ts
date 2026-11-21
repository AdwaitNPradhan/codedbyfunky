/** Resolved CSS colour with cheap alpha / mix helpers for canvas drawing. */
export type Col = {
  css: string
  r: number
  g: number
  b: number
  /** Relative luminance 0..1 */
  lum: number
  /** rgba() string with the given alpha */
  a: (alpha: number) => string
  /** Mix toward `o` by t (0..1) → rgb() string */
  mix: (o: Col, t: number) => string
}

export type Theme = {
  bg: Col
  fg: Col
  accent: Col
  accent2: Col
  muted: Col
  /** Computed font-family of the container (inherit). */
  font: string
  dark: boolean
}

/** Semantic colours that work on both light and dark game backgrounds. */
export const DANGER = '#ff4d6d'
export const OK = '#3ddc84'

let probe: CanvasRenderingContext2D | null = null

/** Resolve ANY css colour (hex, rgb, hsl, oklch, color-mix…) to rgb via a 1px canvas. */
export function parseColor(css: string, fallback: string): Col {
  if (!probe) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    probe = c.getContext('2d', { willReadFrequently: true })
  }
  let r = 0
  let g = 0
  let b = 0
  if (probe) {
    probe.clearRect(0, 0, 1, 1)
    probe.fillStyle = fallback
    probe.fillStyle = css // invalid values are ignored, leaving the fallback
    probe.fillRect(0, 0, 1, 1)
    const d = probe.getImageData(0, 0, 1, 1).data
    r = d[0]
    g = d[1]
    b = d[2]
  }
  return makeCol(r, g, b)
}

export function makeCol(r: number, g: number, b: number): Col {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const col: Col = {
    css: `rgb(${r},${g},${b})`,
    r,
    g,
    b,
    lum: 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b),
    a: (alpha) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`,
    mix: (o, t) =>
      `rgb(${Math.round(r + (o.r - r) * t)},${Math.round(g + (o.g - g) * t)},${Math.round(b + (o.b - b) * t)})`,
  }
  return col
}

export function readTheme(el: HTMLElement): Theme {
  const cs = getComputedStyle(el)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  const bg = parseColor(v('--game-bg', '#0b0b0f'), '#0b0b0f')
  return {
    bg,
    fg: parseColor(v('--game-fg', '#f4f4f5'), '#f4f4f5'),
    accent: parseColor(v('--game-accent', '#c6ff3d'), '#c6ff3d'),
    accent2: parseColor(v('--game-accent-2', '#7c5cff'), '#7c5cff'),
    muted: parseColor(v('--game-muted', '#3f3f46'), '#3f3f46'),
    font: cs.fontFamily || 'ui-monospace, SFMono-Regular, Menlo, monospace',
    dark: bg.lum < 0.4,
  }
}
