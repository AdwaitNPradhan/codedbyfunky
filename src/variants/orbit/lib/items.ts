import type { SiteData } from '@/lib/types'
import { CAP } from './config'

/** Featured first, CMS order otherwise (stable). */
export function featuredFirst<T extends { featured: boolean }>(list: T[]): T[] {
  return list
    .map((x, i) => [x, i] as const)
    .sort((p, q) => Number(q[0].featured) - Number(p[0].featured) || p[1] - q[1])
    .map((x) => x[0])
}

export const projectsOf = (d: SiteData) => featuredFirst(d.projects)
export const photosOf = (d: SiteData) => d.photos
export const gamesOf = (d: SiteData) => featuredFirst(d.games)
export const hardwareOf = (d: SiteData) => featuredFirst(d.hardware)

/** What flight mode shows (3D + stacked cards); Plain view shows everything. */
export const flightProjects = (d: SiteData) => projectsOf(d).slice(0, CAP.projects)
export const flightPhotos = (d: SiteData) => photosOf(d).slice(0, CAP.photos)
export const flightGames = (d: SiteData) => gamesOf(d).slice(0, CAP.games)
export const flightHardware = (d: SiteData) => hardwareOf(d).slice(0, CAP.hardware)

export const SKILL_ORDER = [
  'frontend',
  'backend',
  'mobile',
  'devops',
  'hardware',
  'creative',
  'tools',
] as const
export const SKILL_LABEL: Record<(typeof SKILL_ORDER)[number], string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  devops: 'DevOps',
  hardware: 'Hardware',
  creative: 'Creative',
  tools: 'Tools',
}

export const HW_STATUS_LABEL = {
  built: 'Built',
  'in-progress': 'In progress',
  planned: 'Planned',
} as const

export function firstSentence(text: string) {
  const m = text.match(/^[\s\S]*?[.!?](?=\s|$)/)
  return (m ? m[0] : text).trim()
}
