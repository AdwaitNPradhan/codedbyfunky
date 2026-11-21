/**
 * Clean, serializable content shapes every design variant consumes.
 * Variants never talk to Payload directly — they receive `SiteData` as props.
 */
import type { GameKey } from '@/games/keys'

export type Img = {
  url: string
  alt: string
  width: number
  height: number
  /** Smaller renditions (webp). Fall back to `url`. */
  thumb?: string
  card?: string
  hero?: string
  /** Tiny base64 placeholder for blur-up. */
  blur?: string
  focalX?: number
  focalY?: number
}

export type Link = { label: string; url: string; platform: string }

/** Validated Spotify embed. Built on the server from a strict open.spotify.com link. */
export type Spotify = {
  /** The link as entered (and validated). */
  url: string
  label: string
  kind: 'playlist' | 'album' | 'track' | 'artist' | 'episode' | 'show'
  /** Official embed URL, built from the parsed kind and id. */
  src: string
  height: number
}

export type Settings = {
  name: string
  handle: string
  tagline: string
  roles: string[]
  shortBio: string
  longBio: string
  location: string
  timezone: string
  avatar: Img | null
  resumeUrl: string | null
  availability: { status: 'open' | 'selective' | 'closed'; note: string }
  stats: { value: string; label: string }[]
  publicEmail: string | null
  socials: Link[]
  instagram: { handle: string; url: string; followers: string; pitch: string }
  seo: { title: string; description: string; ogImage: Img | null }
  spotify: Spotify | null
}

export type Project = {
  id: string
  slug: string
  title: string
  summary: string
  role: string
  client: string
  year: number | null
  stack: string[]
  tags: string[]
  cover: Img | null
  /** Square app icon. Falls back to the cover. */
  appIcon: Img | null
  gallery: Img[]
  problem: string
  approach: string
  outcome: string
  metrics: { value: string; label: string }[]
  links: { live: string | null; repo: string | null; caseStudy: string | null }
  accent: string | null
  featured: boolean
}

export type Photo = {
  id: string
  title: string
  image: Img
  location: string
  takenAt: string | null
  camera: string
  lens: string
  exposure: string
  instagramUrl: string | null
  series: string
  featured: boolean
}

export type Game = {
  id: string
  slug: string
  title: string
  component: GameKey
  tagline: string
  description: string
  controls: string
  cover: Img | null
  accent: string | null
  featured: boolean
}

export type HardwareProject = {
  id: string
  slug: string
  title: string
  status: 'built' | 'in-progress' | 'planned'
  summary: string
  details: string
  components: string[]
  tools: string[]
  year: number | null
  cover: Img | null
  gallery: Img[]
  links: { repo: string | null; video: string | null; writeup: string | null }
  featured: boolean
}

export type Skill = {
  id: string
  name: string
  category: 'frontend' | 'backend' | 'mobile' | 'devops' | 'hardware' | 'creative' | 'tools'
  level: number
  years: number | null
  featured: boolean
}

export type ExperienceItem = {
  id: string
  org: string
  role: string
  kind: 'job' | 'freelance' | 'education' | 'award' | 'talk'
  start: string
  end: string | null
  location: string
  url: string | null
  summary: string
  highlights: string[]
}

export type Post = {
  id: string
  kind: 'blog' | 'note'
  slug: string
  title: string
  excerpt: string
  /** Markdown. Render with a safe renderer (no raw HTML). */
  body: string
  publishedAt: string
  tags: string[]
  cover: Img | null
  featured: boolean
}

/** Approved guestbook entries only. Render as plain text. */
export type GuestEntry = {
  id: string
  name: string
  message: string
  sticker: string
  createdAt: string
}

export type SiteData = {
  settings: Settings
  projects: Project[]
  photos: Photo[]
  games: Game[]
  hardware: HardwareProject[]
  skills: Skill[]
  experience: ExperienceItem[]
  posts: Post[]
  guestbook: GuestEntry[]
}
