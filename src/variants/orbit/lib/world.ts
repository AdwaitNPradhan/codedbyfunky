/**
 * Pure-number description of the world and the camera route. No three.js import here:
 * this file ships in the route bundle (scroll mapping needs the station table),
 * the 3D chunk turns the same numbers into curves.
 */
import type { Counts } from './config'

export type V3 = [number, number, number]

/** Z centre of every station. The camera flies down −Z. */
export const Z = {
  hello: 0,
  work: -58,
  photo: -170,
  games: -250,
  hw: -322,
  skills: -392,
  contact: -468,
} as const

export const slabPos = (k: number): V3 => [k % 2 ? 5.6 : -5.6, 0.8, Z.work + 2 - k * 8.5]
export const photoZ = (j: number) => Z.photo + 10 - 2.7 * j
export const cabinetX = (k: number, n: number) => (k - (n - 1) / 2) * 3.2
export const hwCenter = (mobile: boolean): V3 => [mobile ? 0 : -3.4, 0.2, Z.hw]
export const sunPos = (mobile: boolean): V3 => [mobile ? 0 : 6.5, mobile ? 1.2 : 0.8, -4]
export const contactWindow: V3 = [0, 1.6, Z.contact - 1]

export type Shot = { cam: V3; look: V3 }
export type StationRoute = { uDwell: number; uEnd: number }
export type Route = { shots: Shot[]; st: StationRoute[] }

export function buildRoute(c: Counts, mobile: boolean): Route {
  const b = mobile ? 0 : 1 // desktop pushes subjects to the right of the text column
  const k = mobile ? 1.28 : 1 // portrait screens need more distance to fit the same set piece
  const shots: Shot[] = []
  const st: StationRoute[] = []

  const away = (cam: V3, look: V3): V3 => [
    look[0] + (cam[0] - look[0]) * k,
    look[1] + (cam[1] - look[1]) * k,
    look[2] + (cam[2] - look[2]) * k,
  ]
  const shot = (cam: V3, look: V3, scale = true) =>
    shots.push({ cam: scale ? away(cam, look) : cam, look })
  const station = (build: () => void) => {
    const first = shots.length
    build()
    st.push({ uDwell: first, uEnd: shots.length - 1 })
  }

  // 0 · hello — hero shot, then a slow drift for the About panel
  const sun = sunPos(mobile)
  station(() => {
    shot([0, 0.4, 13], [sun[0] * 0.2, sun[1] * 0.6, sun[2]])
    shot([-1.4 * b, 1.0, 11.5], [sun[0] * 0.3, sun[1] * 0.3, sun[2]])
  })
  shot([-3.5, 1.2, -26], [-1, 0.3, -48], false) // approach

  // 1 · work — one shot per slab, weaving between the two rows
  station(() => {
    const n = Math.max(c.projects, 1)
    for (let i = 0; i < n; i++) {
      const [sx, sy, sz] = slabPos(i)
      const row = i % 2
      if (mobile) shot([sx * 0.5, 0.7, sz + 10], [sx, sy, sz], false)
      else shot([row ? -1.5 : 1.5, 0.4, sz + 12.5], [sx - 3.4, sy - 0.2, sz], false)
    }
  })
  shot([0.5, 0.6, -132], [1, -0.2, -150], false) // approach

  // 2 · photography — fly down the helix axis; the active photo sits right of centre
  station(() => {
    const n = Math.max(c.photos, 1)
    const zc = (j: number) => photoZ(j) + 11
    // copy sits on the right here, so the active photo lives left of centre
    shot([-0.2, -0.2, zc(0)], [-0.7 * b, -0.3, zc(0) - 11])
    shot([0.2, 0.2, zc(n - 1)], [-0.7 * b, -0.3, zc(n - 1) - 11])
  })
  shot([0.6, 0.6, -214], [0, 1, -236], false)

  // 3 · games — pan along the cabinet row
  station(() => {
    const n = Math.max(c.games, 1)
    const x0 = cabinetX(0, n)
    const x1 = cabinetX(n - 1, n)
    // copy left, game frame right → the active cabinet owns the centre slot
    shot([x0 * 0.85, 1.4, Z.games + 10], [x0, 1.6, Z.games])
    shot([x1 * 0.85, 1.4, Z.games + 10], [x1, 1.6, Z.games])
  })
  shot([-3, 3, -283], [0, 1, -318], false)

  // 4 · hardware — arc over the board
  station(() => {
    const [cx, cy, cz] = hwCenter(mobile)
    const look: V3 = [cx + 3.6 * b, cy, cz] // copy on the right → board on the left
    shot([cx + 11, cy + 6, cz + 21], look)
    shot([cx - 0.5, cy + 8, cz + 21], look)
    shot([cx - 11, cy + 5.5, cz + 21], look)
  })
  shot([6, 2.5, -354], [0, 0, -388], false)

  // 5 · skills — orbit the constellation
  station(() => {
    const look: V3 = [0, 0, Z.skills]
    shot([-5, 1.5, Z.skills + 15.5], look)
    shot([5, -1, Z.skills + 15.5], look)
  })
  shot([2.5, 0.4, -428], [0, 1, -452], false)

  // 6 · contact — slow to a stop in front of the lit window
  station(() => {
    const look: V3 = [-4.4 * b, 1.4, Z.contact] // look left of the window so it sits right of the form
    shot([0, 0.8, Z.contact + 15], look)
    shot([0.2, 0.9, Z.contact + 13.8], look)
  })

  return { shots, st }
}
