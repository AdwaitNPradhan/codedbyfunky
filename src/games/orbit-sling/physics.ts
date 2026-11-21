/**
 * Orbit Sling physics + level data. Pure (no imports) so a node script can brute-force
 * check that every level is solvable. Virtual play space is 1000 x 625.
 */
export type Orbit = { cx: number; cy: number; R: number; w: number; ph: number }
export type Well = { x: number; y: number; r: number; k: number; orbit?: Orbit }
export type Wall = { x: number; y: number; w: number; h: number }
export type Level = {
  name: string
  pad: { x: number; y: number }
  beacon: { x: number; y: number }
  wells: Well[]
  walls: Wall[]
}
export type Probe = { x: number; y: number; vx: number; vy: number }
export type Outcome = 'fly' | 'win' | 'well' | 'wall' | 'lost'

export const W = 1000
export const HGT = 625
/** fixed physics step (the preview uses the very same integrator) */
export const H = 1 / 120
export const PROBE_R = 5
export const CAPTURE_R = 30
export const SOFT = 24
export const BOUNDS = 140
export const MAX_FLIGHT = 14
export const MAX_PULL = 170
export const MIN_PULL = 16
export const POWER = 3.2

export function wellAt(w: Well, t: number): { x: number; y: number } {
  const o = w.orbit
  if (!o) return w
  const a = o.ph + o.w * t
  return { x: o.cx + o.R * Math.cos(a), y: o.cy + o.R * Math.sin(a) }
}

/** One semi-implicit Euler step. Mutates p. `t` = world time at the start of the step. */
export function step(level: Level, p: Probe, t: number): Outcome {
  let ax = 0
  let ay = 0
  for (const w of level.wells) {
    const q = wellAt(w, t)
    const dx = q.x - p.x
    const dy = q.y - p.y
    const d2 = dx * dx + dy * dy + SOFT * SOFT
    const f = w.k / (d2 * Math.sqrt(d2))
    ax += dx * f
    ay += dy * f
  }
  p.vx += ax * H
  p.vy += ay * H
  p.x += p.vx * H
  p.y += p.vy * H
  const t2 = t + H
  for (const w of level.wells) {
    const q = wellAt(w, t2)
    if (Math.hypot(p.x - q.x, p.y - q.y) < w.r + PROBE_R) return 'well'
  }
  for (const wl of level.walls) {
    const cx = Math.max(wl.x, Math.min(p.x, wl.x + wl.w))
    const cy = Math.max(wl.y, Math.min(p.y, wl.y + wl.h))
    if (Math.hypot(p.x - cx, p.y - cy) < PROBE_R) return 'wall'
  }
  if (Math.hypot(p.x - level.beacon.x, p.y - level.beacon.y) < CAPTURE_R) return 'win'
  if (p.x < -BOUNDS || p.x > W + BOUNDS || p.y < -BOUNDS || p.y > HGT + BOUNDS) return 'lost'
  return 'fly'
}

export type Trace = { pts: number[]; outcome: Outcome; steps: number }

/** Simulate a launch from the pad. Records a point every `every` steps (flat x,y list). */
export function simulate(
  level: Level,
  vx: number,
  vy: number,
  t0: number,
  maxT: number,
  every = 0,
): Trace {
  const p: Probe = { x: level.pad.x, y: level.pad.y, vx, vy }
  const pts: number[] = []
  const max = Math.floor(maxT / H)
  let outcome: Outcome = 'fly'
  let n = 0
  if (every) pts.push(p.x, p.y)
  for (; n < max; n++) {
    outcome = step(level, p, t0 + n * H)
    if (every && n % every === 0) pts.push(p.x, p.y)
    if (outcome !== 'fly') break
  }
  if (every) pts.push(p.x, p.y)
  return { pts, outcome, steps: n }
}

/** Brute force: sample launches, return successful ones (fastest first). */
export function solve(
  level: Level,
  t0 = 0,
  maxT = 6,
  limit = Infinity,
): { vx: number; vy: number; t: number }[] {
  const hits: { vx: number; vy: number; t: number }[] = []
  for (let deg = 0; deg < 360; deg += 1.5) {
    const a = (deg * Math.PI) / 180
    for (let sp = 110; sp <= MAX_PULL * POWER; sp += 40) {
      const vx = Math.cos(a) * sp
      const vy = Math.sin(a) * sp
      const tr = simulate(level, vx, vy, t0, maxT)
      if (tr.outcome === 'win') {
        hits.push({ vx, vy, t: tr.steps * H })
        if (hits.length >= limit) return hits
      }
    }
  }
  return hits.sort((a, b) => a.t - b.t)
}

const mk = (x: number, y: number, r: number, k: number, orbit?: Orbit): Well => ({
  x,
  y,
  r,
  k,
  orbit,
})
const orb = (cx: number, cy: number, R: number, w: number, ph: number): Orbit => ({
  cx,
  cy,
  R,
  w,
  ph,
})

export const LEVELS: Level[] = [
  {
    name: 'First light',
    pad: { x: 110, y: 330 },
    beacon: { x: 890, y: 330 },
    wells: [mk(500, 240, 26, 3.2e6)],
    walls: [],
  },
  {
    name: 'Twin suns',
    pad: { x: 100, y: 520 },
    beacon: { x: 900, y: 170 },
    wells: [mk(380, 360, 28, 4e6), mk(680, 250, 22, 3e6)],
    walls: [],
  },
  {
    name: 'Slingshot',
    pad: { x: 100, y: 170 },
    beacon: { x: 910, y: 500 },
    wells: [mk(520, 330, 38, 7e6)],
    walls: [],
  },
  {
    name: 'The gate',
    pad: { x: 100, y: 330 },
    beacon: { x: 900, y: 330 },
    wells: [mk(720, 200, 24, 3.5e6), mk(720, 470, 24, 3.5e6)],
    walls: [
      { x: 470, y: 90, w: 44, h: 190 },
      { x: 470, y: 380, w: 44, h: 190 },
    ],
  },
  {
    name: 'Stairs',
    pad: { x: 100, y: 540 },
    beacon: { x: 900, y: 140 },
    wells: [mk(430, 180, 26, 4e6), mk(740, 430, 30, 5e6)],
    walls: [
      { x: 300, y: 300, w: 30, h: 260 },
      { x: 560, y: 90, w: 30, h: 260 },
    ],
  },
  {
    name: 'Binary',
    pad: { x: 100, y: 330 },
    beacon: { x: 900, y: 330 },
    wells: [
      mk(520, 330, 22, 4e6, orb(520, 330, 110, 0.9, 0)),
      mk(520, 330, 22, 4e6, orb(520, 330, 110, 0.9, Math.PI)),
    ],
    walls: [],
  },
  {
    name: 'Moonlight',
    pad: { x: 100, y: 500 },
    beacon: { x: 900, y: 160 },
    wells: [mk(480, 330, 34, 6e6), mk(480, 330, 16, 1.8e6, orb(480, 330, 170, -1.1, 1))],
    walls: [],
  },
  {
    name: 'Pinball',
    pad: { x: 90, y: 330 },
    beacon: { x: 910, y: 330 },
    wells: [mk(350, 200, 26, 4e6), mk(350, 450, 26, 4e6), mk(640, 330, 32, 5e6)],
    walls: [
      { x: 500, y: 90, w: 28, h: 130 },
      { x: 500, y: 420, w: 28, h: 130 },
    ],
  },
  {
    name: 'Carousel',
    pad: { x: 100, y: 330 },
    beacon: { x: 880, y: 330 },
    wells: [
      mk(500, 330, 22, 3.5e6, orb(500, 330, 160, 0.7, 0)),
      mk(500, 330, 22, 3.5e6, orb(500, 330, 160, 0.7, 2.094)),
      mk(500, 330, 22, 3.5e6, orb(500, 330, 160, 0.7, 4.189)),
    ],
    walls: [],
  },
  {
    name: 'Event horizon',
    pad: { x: 100, y: 150 },
    beacon: { x: 900, y: 520 },
    wells: [mk(560, 320, 46, 9e6), mk(560, 320, 14, 1.2e6, orb(560, 320, 200, 0.8, 3))],
    walls: [{ x: 300, y: 420, w: 40, h: 150 }],
  },
]

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cache = new Map<number, Level>()

/** Procedural level for index >= LEVELS.length. Validated by brute force, so always solvable. */
export function genLevel(i: number): Level {
  const hit = cache.get(i)
  if (hit) return hit
  const extra = i - LEVELS.length
  let best: Level = LEVELS[LEVELS.length - 1]
  for (let attempt = 0; attempt < 80; attempt++) {
    const r = rng(i * 7919 + attempt * 104729 + 13)
    const nWells = Math.min(5, 2 + Math.floor(extra / 2))
    const wells: Well[] = []
    const pad = { x: 80 + r() * 60, y: 110 + r() * 400 }
    const beacon = { x: 850 + r() * 80, y: 110 + r() * 400 }
    for (let n = 0; n < nWells * 4 && wells.length < nWells; n++) {
      const x = 260 + r() * 500
      const y = 100 + r() * 430
      const rad = 18 + r() * 22
      const far = wells.every((w) => Math.hypot(w.x - x, w.y - y) > 170)
      if (
        far &&
        Math.hypot(x - pad.x, y - pad.y) > 150 &&
        Math.hypot(x - beacon.x, y - beacon.y) > 130
      ) {
        const orbiting = r() < Math.min(0.6, 0.15 + extra * 0.07)
        const k = 2.4e6 + r() * 4.5e6
        wells.push(
          orbiting
            ? mk(
                x,
                y,
                rad * 0.8,
                k * 0.6,
                orb(x, y, 60 + r() * 90, (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), r() * 6.28),
              )
            : mk(x, y, rad, k),
        )
      }
    }
    const walls: Wall[] = []
    if (r() < 0.5) {
      const x = 400 + r() * 250
      walls.push({ x, y: 90 + r() * 120, w: 28, h: 120 + r() * 100 })
    }
    const lvl: Level = { name: `Sector ${i + 1}`, pad, beacon, wells, walls }
    const ok = solve(lvl, 0, 5, 4).length >= 4 && solve(lvl, 1.7, 5, 2).length >= 2
    if (ok) {
      best = lvl
      break
    }
  }
  cache.set(i, best)
  return best
}
