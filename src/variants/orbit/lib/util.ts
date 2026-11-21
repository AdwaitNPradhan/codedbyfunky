import type { Img } from '@/lib/types'

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** power4.inOut */
export const easeInOut4 = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * (1 - t) ** 4)
export const pad = (n: number) => String(n).padStart(2, '0')

/** Same-origin CMS media → relative path so next/image + three.js textures stay same-origin (CSP). */
export function rel(url: string): string {
  if (!/^https?:\/\//i.test(url)) return url
  try {
    const u = new URL(url)
    if (u.pathname.startsWith('/api/media/')) return u.pathname + u.search
  } catch {
    /* fall through */
  }
  return url
}

export type ImgSize = 'thumb' | 'card' | 'hero' | 'url'
export const imgUrl = (img: Img, size: ImgSize = 'card') =>
  rel((size === 'url' ? img.url : img[size]) ?? img.card ?? img.url)

/** Cheap privacy-friendly analytics hook: a DOM event any collector can listen to. */
export function track(name: string, props: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('funky:track', { detail: { name, variant: 'orbit', ...props } }),
  )
}

export const yearOf = (iso: string | null | undefined) =>
  iso ? new Date(iso).getUTCFullYear() : null
export const monthYear = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : ''

/** Deterministic PRNG (mulberry32) so procedural geometry is stable between renders. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
