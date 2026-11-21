'use client'

import Image from 'next/image'
import { createContext, useContext, useSyncExternalStore, type CSSProperties } from 'react'
import type { Img, Photo, Project } from '@/lib/types'

/* ---------- media queries without hydration mismatch ---------- */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')

export const MQ_PIN = '(min-width: 900px) and (prefers-reduced-motion: no-preference)'
export const MQ_FINE = '(hover: hover) and (pointer: fine)'

/** Network-aware: Save-Data or a connection below 4g skips the develop tween, loupe and glow. */
export function isLite() {
  if (typeof navigator === 'undefined') return false
  const c = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection
  return Boolean(c && (c.saveData || (c.effectiveType && c.effectiveType !== '4g')))
}

/* ---------- context: overlay openers + scroll control ---------- */
export type Ctx = {
  scrollTo: (target: string | number, immediate?: boolean) => void
  openPhoto: (id: string, trigger: HTMLElement | null) => void
  openProject: (slug: string, x: number, y: number, trigger?: HTMLElement | null) => void
  reduced: boolean
}
export const DarkroomCtx = createContext<Ctx>(null as unknown as Ctx)
export const useDarkroom = () => useContext(DarkroomCtx)

/* ---------- data helpers ---------- */
/** CMS gives absolute URLs; next/image only optimises same-origin paths from localPatterns. */
export const localSrc = (u: string) =>
  u.match(/^https?:\/\/[^/]+(\/api\/media\/file\/.*)$/)?.[1] ?? u

export const pad2 = (n: number) => String(n).padStart(2, '0')
export const aspect = (i: Img | null | undefined) =>
  i && i.width && i.height ? i.width / i.height : 3 / 2

export function Pic({
  img,
  sizes,
  rendition = 'card',
  priority,
  loading,
  className,
  style,
}: {
  img: Img
  sizes: string
  rendition?: 'thumb' | 'card' | 'hero' | 'url'
  priority?: boolean
  loading?: 'lazy' | 'eager'
  className?: string
  style?: CSSProperties
}) {
  const raw = rendition === 'url' ? img.url : (img[rendition] ?? img.card ?? img.url)
  if (process.env.NODE_ENV === 'development' && !img.alt)
    console.warn('[darkroom] image without alt text:', img.url)
  return (
    <Image
      src={localSrc(raw)}
      alt={img.alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
      placeholder={img.blur ? 'blur' : 'empty'}
      blurDataURL={img.blur}
      className={className}
      style={{
        objectFit: 'cover',
        objectPosition: `${img.focalX ?? 50}% ${img.focalY ?? 50}%`,
        ...style,
      }}
      draggable={false}
    />
  )
}

/** "f/1.8 · 1/250 · ISO 200" -> three cells. Anything unparsable falls back to the raw string. */
export function parseExposure(s: string) {
  const aperture = s.match(/f\/?\s?\d+(\.\d+)?/i)?.[0].replace(/\s/g, '')
  const shutter = s.match(/\b1\/\d+\b|\b\d+(\.\d+)?\s?s\b/i)?.[0]
  const iso = s.match(/ISO\s?(\d+)/i)?.[1]
  if (aperture || shutter || iso) return { aperture, shutter, iso }
  return s.trim() ? { raw: s } : null
}

export function fmtDate(
  iso: string | null,
  opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' },
) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

export const featuredFirst = <T extends { featured: boolean }>(a: T[]) => [
  ...a.filter((x) => x.featured),
  ...a.filter((x) => !x.featured),
]

export type Overlay =
  | { kind: 'photo'; id: string; trigger: HTMLElement | null }
  | { kind: 'project'; slug: string; x: number; y: number }
  | null

export type PhotoList = Photo[]
export type ProjectList = Project[]

export function Arrow({ dir = 'ne', size = 14 }: { dir?: 'ne' | 'right' | 'down'; size?: number }) {
  const d =
    dir === 'ne'
      ? 'M3 11 11 3M5 3h6v6'
      : dir === 'down'
        ? 'M7 2v10M3 8l4 4 4-4'
        : 'M2 7h10M8 3l4 4-4 4'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
