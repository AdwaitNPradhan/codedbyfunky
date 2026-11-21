import type { SiteData } from '@/lib/types'
import type { IconName } from './icons'
import type { AppId, WinProps } from './types'
import { versionByKey } from './versions'

type Meta = {
  /** Name under dock and desktop icons. */
  label: string
  icon: IconName
  /** Default window size on desktop. */
  w: number
  h: number
  title: (p: WinProps, d: SiteData) => string
}

const hw = (d: SiteData, slug?: string) => d.hardware.find((x) => x.slug === slug)

export const META: Record<AppId, Meta> = {
  about: { label: 'README.txt', icon: 'about', w: 640, h: 460, title: () => 'README.txt' },
  files: { label: 'Projects', icon: 'folder', w: 760, h: 480, title: () => 'Files' },
  preview: {
    label: 'Preview',
    icon: 'preview',
    w: 700,
    h: 540,
    title: (p, d) => d.projects.find((x) => x.slug === p.slug)?.title ?? 'Preview',
  },
  photos: {
    label: 'Photos',
    icon: 'photos',
    w: 820,
    h: 560,
    title: (_, d) =>
      d.settings.instagram.handle ? `Photos, ${d.settings.instagram.handle}` : 'Photos',
  },
  games: { label: 'Games', icon: 'games', w: 720, h: 480, title: () => 'Games' },
  game: {
    label: 'Game',
    icon: 'game',
    w: 720,
    h: 520,
    title: (p, d) => d.games.find((x) => x.slug === p.slug)?.title ?? 'Game',
  },
  lab: { label: 'Lab', icon: 'lab', w: 740, h: 500, title: () => 'Lab' },
  skills: { label: 'Skills', icon: 'skills', w: 660, h: 460, title: () => 'Skills' },
  terminal: { label: 'Terminal', icon: 'terminal', w: 660, h: 420, title: () => 'Terminal' },
  mail: { label: 'Mail', icon: 'mail', w: 620, h: 520, title: () => 'Mail' },
  resume: { label: 'Resume.pdf', icon: 'pdf', w: 660, h: 580, title: () => 'Resume.pdf' },
  settings: { label: 'Settings', icon: 'settings', w: 480, h: 420, title: () => 'Settings' },
  spotify: {
    label: 'Spotify',
    icon: 'spotify',
    w: 480,
    h: 560,
    title: (_, d) => d.settings.spotify?.label ?? 'Spotify',
  },
  notes: { label: 'Notes', icon: 'notes', w: 780, h: 500, title: () => 'Notes' },
  blog: { label: 'Blog', icon: 'blog', w: 800, h: 580, title: () => 'Blog' },
  product: {
    label: 'App',
    icon: 'product',
    w: 840,
    h: 600,
    title: (p, d) => d.projects.find((x) => x.slug === p.slug)?.title ?? 'App',
  },
  guestbook: { label: 'Guestbook', icon: 'guestbook', w: 700, h: 540, title: () => 'Guestbook' },
  model: {
    label: '3D Viewer',
    icon: 'model',
    w: 780,
    h: 560,
    title: (p, d) => (hw(d, p.slug) ? `${hw(d, p.slug)!.title} · 3D` : '3D Viewer'),
  },
  linux: {
    label: 'Linux.app',
    icon: 'linux',
    w: 840,
    h: 600,
    title: () => 'Real Linux (runs in your browser)',
  },
  browser: {
    label: 'Browser',
    icon: 'browser',
    w: 960,
    h: 620,
    title: (p) => versionByKey(p.v)?.file ?? 'Browser',
  },
}

/** Icon for a window. Browser windows show the icon of the version they hold. */
export const iconOf = (app: AppId, p: WinProps = {}): IconName =>
  app === 'browser' ? (versionByKey(p.v)?.icon ?? 'browser') : META[app].icon

export const MIN_W = 320
export const MIN_H = 220
export const MENU_H = 28
/** Space kept free at the bottom of the desktop for the dock. */
export const DOCK_RESERVE = 84

/** Windows are singletons except preview, game, product and model (keyed by slug) and browser (keyed by version). */
export const idFor = (app: AppId, p: WinProps = {}) =>
  app === 'preview' || app === 'game' || app === 'product' || app === 'model'
    ? `${app}:${p.slug ?? ''}`
    : app === 'browser'
      ? `browser:${p.v ?? ''}`
      : app

export const DOCK_APPS: AppId[] = ['about', 'files', 'photos', 'games', 'lab', 'terminal', 'mail']
export const DESKTOP_APPS: AppId[] = [
  'about',
  'files',
  'photos',
  'games',
  'lab',
  'skills',
  'terminal',
  'mail',
  'resume',
  'notes',
  'blog',
  'spotify',
  'guestbook',
  'linux',
]
export const HOME_APPS: AppId[] = [
  'about',
  'files',
  'photos',
  'games',
  'lab',
  'skills',
  'terminal',
  'mail',
  'resume',
  'notes',
  'blog',
  'spotify',
  'guestbook',
  'linux',
  'settings',
]
/** Apps that only exist when the CMS has the data for them. */
export const needsSpotify = (a: AppId, d: SiteData) => a !== 'spotify' || Boolean(d.settings.spotify)
export const TAB_APPS: AppId[] = ['about', 'files', 'photos', 'terminal']

export const APP_IDS = Object.keys(META) as AppId[]
export const isAppId = (s: string): s is AppId => (APP_IDS as string[]).includes(s)
