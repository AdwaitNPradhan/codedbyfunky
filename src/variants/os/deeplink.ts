import type { SiteData } from '@/lib/types'
import { META } from './appmeta'
import type { AppId, WinProps } from './types'
import { isVersionKey } from './versions'

/** Folders in Files. The same list validates `?app=files&path=`. */
export const FILE_SECTIONS = [
  'projects',
  'applications',
  'media',
  'games',
  'hardware',
  'documents',
  'versions',
] as const
export type FileSection = (typeof FILE_SECTIONS)[number]
const SECTION_SET: ReadonlySet<string> = new Set(FILE_SECTIONS)
/** Old links used `photos` for the photo folder. */
export const normSection = (s: string | undefined): FileSection =>
  s === 'photos' ? 'media' : s && SECTION_SET.has(s) ? (s as FileSection) : 'projects'

/** The only window props that go into a share link, per app. */
const KEYS: Partial<Record<AppId, string[]>> = {
  files: ['path'],
  preview: ['slug'],
  product: ['slug'],
  game: ['slug'],
  lab: ['slug'],
  model: ['slug'],
  browser: ['v'],
  notes: ['slug'],
  blog: ['slug'],
  photos: ['photo', 'id'],
}
/** These cannot open without a valid value. The others open without it. */
const REQUIRED = new Set<AppId>(['preview', 'product', 'game', 'model', 'browser'])

export function shareQuery(app: AppId, props: WinProps = {}) {
  const q = new URLSearchParams({ app })
  for (const k of KEYS[app] ?? []) {
    const v = props[k]
    if (v) q.set(k, k === 'path' ? normSection(v) : v)
  }
  if (app === 'files' && !q.has('path')) q.set('path', 'projects')
  return q.toString()
}

/** A link to the site root that restores this window. NEXT_PUBLIC_SITE_URL wins, else the current origin. */
export function shareUrl(app: AppId, props: WinProps = {}) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '')
  return `${base}/?${shareQuery(app, props)}`
}

const ids = (xs: { slug: string }[]) => new Set(xs.map((x) => x.slug))

/** Does this value name something that exists? Sets are used, so `__proto__` or `constructor` never match. */
function valid(app: AppId, key: string, v: string, d: SiteData) {
  if (v.length > 80) return false
  switch (key) {
    case 'v':
      return isVersionKey(v)
    case 'photo':
      return d.photos.some((p) => p.id === v)
    case 'id':
      // An Instagram post id. The app looks it up in the live feed and ignores an unknown one.
      return /^\d{5,25}$/.test(v)
    case 'slug':
      if (app === 'preview' || app === 'product') return ids(d.projects).has(v)
      if (app === 'game') return ids(d.games).has(v)
      if (app === 'lab' || app === 'model') return ids(d.hardware).has(v)
      if (app === 'notes') return ids(d.posts.filter((p) => p.kind === 'note')).has(v)
      if (app === 'blog') return ids(d.posts.filter((p) => p.kind === 'blog')).has(v)
      return false
    default:
      return false
  }
}

export type Launch = { app: AppId; props: WinProps }

/** Turn the URL query into windows to open. Every param is checked against an own-key list or the CMS data. */
export function resolveLaunch(q: URLSearchParams, d: SiteData): Launch[] {
  const app = q.get('app') ?? ''
  if (!Object.hasOwn(META, app)) return []
  const a = app as AppId
  if (a === 'files') {
    const [section, item] = (q.get('path') ?? '').split('/')
    const out: Launch[] = [{ app: 'files', props: { path: normSection(section) } }]
    if (normSection(section) === 'projects' && item && valid('preview', 'slug', item, d))
      out.push({ app: 'preview', props: { slug: item } })
    return out
  }
  const props: WinProps = {}
  for (const k of KEYS[a] ?? []) {
    const v = q.get(k)
    if (v && valid(a, k, v, d)) props[k] = v
  }
  const missing = (KEYS[a] ?? []).some((k) => !props[k])
  if (REQUIRED.has(a) && missing) {
    // A bad version still lands somewhere useful. Other bad values open nothing.
    return a === 'browser' ? [{ app: 'files', props: { path: 'versions' } }] : []
  }
  return [{ app: a, props }]
}
