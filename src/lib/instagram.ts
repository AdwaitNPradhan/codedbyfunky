/**
 * Instagram feed, server side only. Uses the Instagram API with Instagram Login (Basic Display was shut
 * down in December 2024). The account must be a professional (creator or business) account.
 *
 * The token comes from the admin-only Site field `instagram.accessToken`, else INSTAGRAM_ACCESS_TOKEN.
 * It never goes to the browser and is never logged. This file must only be imported by server code.
 */
import { getPayload } from 'payload'
import config from '@payload-config'

export type IgPost = {
  id: string
  caption: string
  kind: 'image' | 'video' | 'album'
  /** A signed Instagram CDN URL. It expires, so show it with a plain lazy <img>. */
  image: string
  permalink: string
  timestamp: string
}

// The override exists so a test can use a local fake. Only localhost is accepted besides the real API.
const REAL_API = 'https://graph.instagram.com'
const API = (() => {
  const o = process.env.INSTAGRAM_API_BASE ?? ''
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : REAL_API
})()

const HOUR = 60 * 60 * 1000
const CACHE_OK = HOUR
const CACHE_FAIL = 5 * 60 * 1000
const REFRESH_AFTER = 7 * 24 * HOUR
const CDN = [/(^|\.)cdninstagram\.com$/i, /(^|\.)fbcdn\.net$/i]

const httpsHost = (u: unknown) => {
  try {
    const x = new URL(String(u))
    return x.protocol === 'https:' ? x.hostname : ''
  } catch {
    return ''
  }
}
/** Only Instagram's own CDN hosts may supply an image. */
export const imageOk = (u: unknown) => CDN.some((r) => r.test(httpsHost(u)))
/** Only a link to instagram.com may be shown as "View on Instagram". */
export const permalinkOk = (u: unknown) => /^(www\.)?instagram\.com$/i.test(httpsHost(u))

const clean = (v: unknown, max: number) =>
  String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)

/** Turn the API answer into safe posts. Anything with a foreign image or link host is dropped. */
export function mapMedia(json: unknown): IgPost[] {
  const rows = (json as { data?: unknown })?.data
  if (!Array.isArray(rows)) return []
  const out: IgPost[] = []
  for (const r of rows as Record<string, unknown>[]) {
    const type = String(r.media_type ?? '')
    const image = type === 'VIDEO' ? r.thumbnail_url : r.media_url
    const id = String(r.id ?? '')
    if (!/^\d{5,25}$/.test(id) || !imageOk(image) || !permalinkOk(r.permalink)) continue
    out.push({
      id,
      caption: clean(r.caption, 600),
      kind: type === 'VIDEO' ? 'video' : type === 'CAROUSEL_ALBUM' ? 'album' : 'image',
      image: String(image),
      permalink: String(r.permalink),
      timestamp: clean(r.timestamp, 40),
    })
  }
  return out
}

type TokenInfo = { token: string; refreshedAt: number }
type IgGroup = Record<string, unknown>

async function readToken(): Promise<TokenInfo | null> {
  const payload = await getPayload({ config })
  // overrideAccess: this admin-only field is invisible to anyone else.
  const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
  const ig = (site.instagram ?? {}) as IgGroup
  const token = String(ig.accessToken ?? '').trim() || (process.env.INSTAGRAM_ACCESS_TOKEN ?? '').trim()
  if (!token) return null
  const at = ig.tokenRefreshedAt ? Date.parse(String(ig.tokenRefreshedAt)) : 0
  return { token, refreshedAt: Number.isFinite(at) ? at : 0 }
}

let lastRefreshTry = 0

/** Long-lived tokens last 60 days. Renew when older than 7 days and save the new one back to the field. */
async function ensureFresh(t: TokenInfo): Promise<string> {
  const now = Date.now()
  if (t.refreshedAt && now - t.refreshedAt < REFRESH_AFTER) return t.token
  if (now - lastRefreshTry < HOUR) return t.token // Instagram refuses tokens younger than 24 h: do not retry in a loop
  lastRefreshTry = now
  try {
    const res = await fetch(
      `${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.token)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return t.token
    const j = (await res.json()) as { access_token?: unknown }
    const next = typeof j.access_token === 'string' ? j.access_token : ''
    if (next.length < 20) return t.token
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    const cur = (site.instagram ?? {}) as IgGroup
    await payload.updateGlobal({
      slug: 'site',
      overrideAccess: true,
      // The field hook sets tokenRefreshedAt. Write the whole group back so no other field is lost.
      data: { instagram: { ...cur, accessToken: next } },
    })
    return next
  } catch {
    return t.token
  }
}

async function fetchFeed(): Promise<IgPost[] | null> {
  const info = await readToken()
  if (!info) return null
  const token = await ensureFresh(info)
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
  const res = await fetch(`${API}/me/media?fields=${fields}&limit=24&access_token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    console.error(`[instagram] feed request failed with status ${res.status}`) // no URL, no token
    return null
  }
  const posts = mapMedia(await res.json())
  return posts.length ? posts : null
}

// shortcut: in-memory cache, fine for one container; every container asks Instagram once an hour.
const g = globalThis as unknown as {
  __ig?: { at: number; ttl: number; posts: IgPost[] | null; pending?: Promise<IgPost[] | null> }
}
const cache = (g.__ig ??= { at: 0, ttl: 0, posts: null })

/** The feed, cached for an hour (5 minutes after a failure). Null means "use the Photos collection". */
export function loadInstagram(): Promise<IgPost[] | null> {
  if (Date.now() - cache.at < cache.ttl) return Promise.resolve(cache.posts)
  if (cache.pending) return cache.pending
  cache.pending = fetchFeed()
    .catch(() => {
      console.error('[instagram] feed request failed') // never the error text: it could echo a URL
      return null
    })
    .then((posts) => {
      cache.posts = posts
      cache.at = Date.now()
      cache.ttl = posts ? CACHE_OK : CACHE_FAIL
      cache.pending = undefined
      return posts
    })
  return cache.pending
}
