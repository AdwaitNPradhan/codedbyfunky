import type { IconName } from './icons'

/** The four earlier designs of this site. Each one still lives at its own route. */
export type VersionKey = 'blueprint' | 'darkroom' | 'arcade' | 'orbit'

export type VersionFile = {
  /** File name shown on the desktop, in Files and in the terminal. */
  file: string
  key: VersionKey
  /** Short name of the design. */
  title: string
  /** One line for Files and the terminal. */
  note: string
  icon: IconName
  /** Fake "last modified" date (ISO). It is a joke, not a git date. */
  modified: string
  /** Also shown as an icon on the desktop. */
  desktop: boolean
}

export const SITE_HOST = 'codedbyfunky.com'

export const VERSION_FILES: VersionFile[] = [
  {
    file: 'prototype.html',
    key: 'blueprint',
    title: 'The blueprint',
    note: 'The prototype. Engineering drawing, grid paper, exploded views.',
    icon: 'v_blueprint',
    modified: '2025-03-09',
    desktop: true,
  },
  {
    file: 'personal_website_v1.html',
    key: 'darkroom',
    title: 'The darkroom',
    note: 'Version 1. A photographer’s darkroom. Film grain, red safelight.',
    icon: 'v_darkroom',
    modified: '2025-08-17',
    desktop: true,
  },
  {
    file: 'final.html',
    key: 'arcade',
    title: 'The arcade',
    note: 'The final one. Stickers, toys, confetti, and games.',
    icon: 'v_arcade',
    modified: '2026-02-02',
    desktop: true,
  },
  {
    file: 'final_final.html',
    key: 'orbit',
    title: 'The orbit',
    note: 'The final final one. A 3D walk through space. Wants a GPU.',
    icon: 'v_orbit',
    modified: '2026-10-30',
    desktop: true,
  },
  {
    file: 'final_final_FINAL(2).html',
    key: 'orbit',
    title: 'The orbit (copy)',
    note: 'Copy of final_final.html. Identical. Probably.',
    icon: 'v_orbit',
    modified: '2026-11-02',
    desktop: false,
  },
]

export const VERSION_KEYS = ['blueprint', 'darkroom', 'arcade', 'orbit'] as const
export const isVersionKey = (s: string | undefined): s is VersionKey =>
  (VERSION_KEYS as readonly string[]).includes(s ?? '')

/** The first file for a key is the original. The copy only adds a joke. */
export const versionByKey = (k: string | undefined): VersionFile | undefined =>
  isVersionKey(k) ? VERSION_FILES.find((v) => v.key === k) : undefined

export const versionPath = (k: VersionKey) => `/${k}`

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
/** Match "prototype", "prototype.html", "blueprint", "final_final", "v1" ... */
export function findVersion(q: string): VersionFile | undefined {
  const n = norm(q.replace(/\.html?$/i, ''))
  if (!n) return undefined
  return (
    VERSION_FILES.find((v) => norm(v.file.replace(/\.html$/, '')) === n) ??
    VERSION_FILES.find((v) => v.key === n) ??
    (n === 'v1' || n === 'personalwebsite' ? VERSION_FILES[1] : undefined)
  )
}

const FMT = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
export const modifiedLabel = (iso: string) => FMT.format(new Date(`${iso}T12:00:00Z`))
