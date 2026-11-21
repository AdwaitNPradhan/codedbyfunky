export const TAU = Math.PI * 2

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a))
export const map = (v: number, a: number, b: number, c: number, d: number) =>
  lerp(c, d, clamp(invLerp(a, b, v), 0, 1))
/** Frame-rate independent smoothing: move `a` toward `b`; larger `k` = snappier. */
export const damp = (a: number, b: number, k: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-k * dt))

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInCubic = (t: number) => t * t * t
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)
export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
export const easeOutElastic = (t: number) => {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1))
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const chance = (p: number) => Math.random() < p
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)
export const sign = (v: number) => (v < 0 ? -1 : 1)

/** Small deterministic PRNG — use for procedural content that must be reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable hash of an integer → [0,1). */
export const hash01 = (n: number) => {
  let x = Math.imul(n | 0, 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

export const shuffle = <T>(arr: T[], rnd: () => number = Math.random): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
