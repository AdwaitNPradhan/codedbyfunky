import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Img, SiteData } from './types'
import { isGameKey } from '@/games/keys'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

export function toImg(m: unknown): Img | null {
  if (!m || typeof m !== 'object') return null
  const d = m as Doc
  if (!d.url || !d.mimeType?.startsWith('image/')) return null
  return {
    url: d.url,
    alt: str(d.alt),
    width: d.width ?? 1600,
    height: d.height ?? 1000,
    thumb: d.sizes?.thumb?.url || undefined,
    card: d.sizes?.card?.url || undefined,
    hero: d.sizes?.hero?.url || undefined,
    blur: d.blurDataURL || undefined,
    focalX: d.focalX ?? 50,
    focalY: d.focalY ?? 50,
  }
}
const imgs = (v: unknown) => arr(v).map(toImg).filter((x): x is Img => Boolean(x))

/** Everything a variant needs, in one call. Public access rules apply (published only). */
export const getSiteData = cache(async (): Promise<SiteData> => {
  const payload = await getPayload({ config })
  const q = { overrideAccess: false, depth: 1, limit: 200, sort: 'order', pagination: false } as const
  const [site, projects, photos, games, hardware, skills, experience] = await Promise.all([
    payload.findGlobal({ slug: 'site', depth: 1, overrideAccess: false }),
    payload.find({ collection: 'projects', ...q }),
    payload.find({ collection: 'photos', ...q }),
    payload.find({ collection: 'games', ...q }),
    payload.find({ collection: 'hardware', ...q }),
    payload.find({ collection: 'skills', ...q }),
    payload.find({ collection: 'experience', ...q, sort: '-start' }),
  ])
  const s = site as Doc
  const resume = s.resume as Doc | undefined

  return {
    settings: {
      name: str(s.name) || 'Your Name',
      handle: str(s.handle) || 'funky',
      tagline: str(s.tagline),
      roles: arr<string>(s.roles),
      shortBio: str(s.shortBio),
      longBio: str(s.longBio),
      location: str(s.location),
      timezone: str(s.timezone),
      avatar: toImg(s.avatar),
      resumeUrl: resume?.url ?? null,
      availability: { status: s.availability?.status ?? 'open', note: str(s.availability?.note) },
      stats: arr<Doc>(s.stats).map((x) => ({ value: str(x.value), label: str(x.label) })),
      publicEmail: strOrNull(s.publicEmail),
      socials: arr<Doc>(s.socials).map((x) => ({ label: str(x.label), url: str(x.url), platform: str(x.platform) })),
      instagram: {
        handle: str(s.instagram?.handle),
        url: str(s.instagram?.url),
        followers: str(s.instagram?.followers),
        pitch: str(s.instagram?.pitch),
      },
      seo: { title: str(s.seoTitle), description: str(s.seoDescription), ogImage: toImg(s.ogImage) },
    },
    projects: projects.docs.map((d: Doc) => ({
      id: String(d.id),
      slug: d.slug,
      title: d.title,
      summary: str(d.summary),
      role: str(d.role),
      client: str(d.client),
      year: d.year ?? null,
      stack: arr<string>(d.stack),
      tags: arr<string>(d.tags),
      cover: toImg(d.cover),
      gallery: imgs(d.gallery),
      problem: str(d.problem),
      approach: str(d.approach),
      outcome: str(d.outcome),
      metrics: arr<Doc>(d.metrics).map((m) => ({ value: str(m.value), label: str(m.label) })),
      links: { live: strOrNull(d.links?.live), repo: strOrNull(d.links?.repo), caseStudy: strOrNull(d.links?.caseStudy) },
      accent: strOrNull(d.accent),
      featured: Boolean(d.featured),
    })),
    photos: photos.docs
      .map((d: Doc) => ({
        id: String(d.id),
        title: d.title,
        image: toImg(d.image)!,
        location: str(d.location),
        takenAt: d.takenAt ?? null,
        camera: str(d.camera),
        lens: str(d.lens),
        exposure: str(d.exposure),
        instagramUrl: strOrNull(d.instagramUrl),
        series: str(d.series),
        featured: Boolean(d.featured),
      }))
      .filter((p) => p.image),
    games: games.docs
      .filter((d: Doc) => isGameKey(d.component))
      .map((d: Doc) => ({
        id: String(d.id),
        slug: d.slug,
        title: d.title,
        component: d.component,
        tagline: str(d.tagline),
        description: str(d.description),
        controls: str(d.controls),
        cover: toImg(d.cover),
        accent: strOrNull(d.accent),
        featured: Boolean(d.featured),
      })),
    hardware: hardware.docs.map((d: Doc) => ({
      id: String(d.id),
      slug: d.slug,
      title: d.title,
      status: d.status,
      summary: str(d.summary),
      details: str(d.details),
      components: arr<string>(d.components),
      tools: arr<string>(d.tools),
      year: d.year ?? null,
      cover: toImg(d.cover),
      gallery: imgs(d.gallery),
      links: { repo: strOrNull(d.links?.repo), video: strOrNull(d.links?.video), writeup: strOrNull(d.links?.writeup) },
      featured: Boolean(d.featured),
    })),
    skills: skills.docs.map((d: Doc) => ({
      id: String(d.id),
      name: d.name,
      category: d.category,
      level: d.level ?? 3,
      years: d.years ?? null,
      featured: Boolean(d.featured),
    })),
    experience: experience.docs.map((d: Doc) => ({
      id: String(d.id),
      org: d.org,
      role: d.role,
      kind: d.kind ?? 'job',
      start: d.start,
      end: d.end ?? null,
      location: str(d.location),
      url: strOrNull(d.url),
      summary: str(d.summary),
      highlights: arr<Doc>(d.highlights).map((h) => str(h.text)),
    })),
  }
})
