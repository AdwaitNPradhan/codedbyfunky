import type { SiteData } from '@/lib/types'

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const social = (data: SiteData, platform: string) =>
  data.settings.socials.find((s) => s.platform === platform)?.url || null

export const levelWord = (level: number) =>
  level >= 5 ? 'daily' : level === 4 ? 'often' : 'learning'

export const resumeFileName = (url: string | null, name: string) => {
  if (url) {
    const last = decodeURIComponent(url.split('?')[0].split('/').pop() || '')
    if (last.toLowerCase().endsWith('.pdf')) return last
  }
  return `${name.replace(/\s+/g, '-')}-Resume.pdf`
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

/** Subsequence fuzzy score. Higher is better, -1 means no match. */
export function fuzzy(query: string, text: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const t = text.toLowerCase()
  const at = t.indexOf(q)
  if (at >= 0) return 100 - at + (at === 0 ? 20 : 0)
  let ti = 0
  let score = 0
  let last = -2
  let first = -1
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found < 0) return -1
    if (first < 0) first = found
    score += found === last + 1 ? 3 : 1
    last = found
    ti = found + 1
  }
  // Loose subsequence hits are noise: the matched letters must sit close together.
  return last - first > q.length * 2 + 1 ? -1 : score
}

export const monthYear = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

export const range = (start: string, end: string | null) =>
  `${monthYear(start)} – ${end ? monthYear(end) : 'now'}`

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const store = {
  get(kind: 'local' | 'session', key: string) {
    try {
      return (kind === 'local' ? localStorage : sessionStorage).getItem(key)
    } catch {
      return null
    }
  },
  set(kind: 'local' | 'session', key: string, value: string) {
    try {
      ;(kind === 'local' ? localStorage : sessionStorage).setItem(key, value)
    } catch {
      /* private mode: ignore */
    }
  },
}

export const isTypingTarget = (el: EventTarget | null) => {
  const n = el as HTMLElement | null
  if (!n || !n.tagName) return false
  return (
    n.tagName === 'INPUT' ||
    n.tagName === 'TEXTAREA' ||
    n.tagName === 'SELECT' ||
    n.isContentEditable
  )
}

/** Programmatic file download via a temporary anchor (works for same-origin URLs). */
export function download(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Copy text to the clipboard. Falls back to a hidden textarea where the async API is missing. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    /* ignore */
  }
  ta.remove()
  return ok
}

const DATE = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d)
}
export const readMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 200))
