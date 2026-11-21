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

/** Windows are singletons except preview and game (keyed by slug) and browser (keyed by version). */
export const idFor = (app: AppId, p: WinProps = {}) =>
  app === 'preview' || app === 'game'
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
  'settings',
]
export const TAB_APPS: AppId[] = ['about', 'files', 'photos', 'terminal']

export const APP_IDS = Object.keys(META) as AppId[]
export const isAppId = (s: string): s is AppId => (APP_IDS as string[]).includes(s)
