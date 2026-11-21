import { useEffect, useLayoutEffect } from 'react'

/** 1 mm at 96 dpi. The cursor readout, dimension lines and the ruler all use it. */
export const MM = 3.7795

export const toMM = (px: number) => px / MM
export const fmtMM = (px: number) => toMM(px).toFixed(1)

export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Revision letter: 0 -> A, 25 -> Z, 26 -> AA. */
export function revLetter(i: number): string {
  let n = i
  let s = ''
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/** Small deterministic hash, used to give each hardware part its own footprint. */
export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/js$/, '')

/** A skill label like "Three.js / R3F" matches a stack entry when any part is equal after normalising. */
export function skillMatches(skill: string, stack: string[]): boolean {
  const parts = skill.split(/[\/,]/).map(norm).filter(Boolean)
  if (!parts.length) return false
  const entries = stack.map(norm)
  return parts.some((p) => entries.includes(p))
}

/**
 * next/image only optimises absolute URLs listed in remotePatterns, but the CMS returns media as
 * absolute same-origin URLs (http://host/api/media/file/x.webp). Reduce those to the path so the
 * existing localPatterns apply. Relative and external URLs pass through untouched.
 */
export function imgSrc(
  img: { url: string; thumb?: string; card?: string; hero?: string },
  size: 'thumb' | 'card' | 'hero' = 'card',
): string {
  const u = (size === 'hero' ? img.hero : size === 'thumb' ? img.thumb : img.card) ?? img.url
  const m = u.match(/^https?:\/\/[^/]+(\/api\/media\/.*)$/)
  return m ? m[1] : u
}

/** YYYY-MM from an ISO date. */
export const ym = (iso: string | null | undefined) => (iso ? iso.slice(0, 7) : '')

/** Cookie-less analytics hook: pages or the owner can listen for `bp:event` on window. */
export function track(event: string, detail: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('bp:event', { detail: { event, variant: 'blueprint', ...detail } }),
  )
}

export const CATEGORY_LABEL: Record<string, string> = {
  frontend: 'FRONTEND',
  backend: 'BACKEND',
  mobile: 'MOBILE',
  devops: 'DEVOPS',
  hardware: 'HARDWARE',
  creative: 'CREATIVE',
  tools: 'TOOLS',
}
export const CATEGORY_ORDER = [
  'frontend',
  'backend',
  'mobile',
  'devops',
  'hardware',
  'creative',
  'tools',
]

export const KIND_LABEL: Record<string, string> = {
  job: 'JOB',
  freelance: 'FREELANCE',
  education: 'EDUCATION',
  award: 'AWARD',
  talk: 'TALK',
}

/** Is this key press going into a text field? Global shortcuts must not fire there. */
export function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}
