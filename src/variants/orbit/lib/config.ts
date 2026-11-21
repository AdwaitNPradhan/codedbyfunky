import type { SiteData } from '@/lib/types'

export const STATIONS = [
  { id: 'hello', alias: 'intro', label: 'Hello', tint: '#FF7A3D' },
  { id: 'work', alias: 'projects', label: 'Work', tint: '#FFB347' },
  { id: 'photography', alias: 'photos', label: 'Photography', tint: '#ECE8DF' },
  { id: 'games', alias: 'play', label: 'Games', tint: '#7CFFB2' },
  { id: 'hardware', alias: 'hw', label: 'Hardware', tint: '#5FD0C5' },
  { id: 'skills', alias: 'experience', label: 'Skills', tint: '#8FB8FF' },
  { id: 'contact', alias: 'hire', label: 'Contact', tint: '#FF7A3D' },
] as const

export const N_STATIONS = STATIONS.length
export type StationId = (typeof STATIONS)[number]['id']
export const stationIndexFromHash = (hash: string) => {
  const h = hash.replace(/^#/, '').toLowerCase()
  return STATIONS.findIndex((s) => s.id === h || s.alias === h)
}

/** Items shown in flight mode per station (Plain view lists everything). */
export const CAP = { projects: 8, photos: 12, games: 8, hardware: 6 } as const

export type Counts = { projects: number; photos: number; games: number; hardware: number }

export function countsOf(data: SiteData): Counts {
  return {
    projects: Math.min(data.projects.length, CAP.projects),
    photos: Math.min(data.photos.length, CAP.photos),
    games: Math.min(data.games.length, CAP.games),
    hardware: Math.min(data.hardware.length, CAP.hardware),
  }
}

/** Dwell length per station in viewport heights (scroll distance the panel stays pinned). */
export function dwellVh(c: Counts, mobile: boolean): number[] {
  return mobile
    ? [
        0.9,
        0.6 + 0.15 * c.projects,
        0.5 + 0.06 * c.photos,
        0.4 + 0.08 * c.games,
        0.45 + 0.12 * c.hardware,
        1.2,
        0.5,
      ]
    : [
        1.05,
        0.7 + 0.2 * c.projects,
        0.5 + 0.08 * c.photos,
        0.5 + 0.1 * c.games,
        0.5 + 0.15 * c.hardware,
        1.3,
        0.55,
      ]
}

/** Overlap between stations (portion of a viewport) – shortens the travel gap. */
export const OVERLAP_VH = 0.3

export const TINTS = STATIONS.map((s) => s.tint)

export const MOBILE_QUERY = '(max-width: 767px)'

export type Caps = {
  mobile: boolean
  reduced: boolean
  webgl: boolean
  lowEnd: boolean
  coarse: boolean
  /** ?lowfx — drop post-processing and DPR (also handy for software renderers) */
  lowfx: boolean
}

export type Quality = {
  dpr: [number, number]
  post: boolean
  stars: number
  mobile: boolean
}
