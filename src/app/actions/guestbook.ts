'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'
import config from '@payload-config'
import { GUEST_STICKERS } from '../../collections/Guestbook'

export type GuestField = 'name' | 'message'
export type GuestState = {
  ok: boolean
  message: string
  fieldErrors?: Partial<Record<GuestField, string>>
  /** The saved entry. The visitor sees it at once, "pending" until approved. */
  entry?: {
    id: string
    name: string
    message: string
    sticker: string
    createdAt: string
    approved: boolean
  }
} | null

// Links are the spam. Block URLs, "www.", bare domains and mail addresses in every text field.
const LINKISH = /(?:https?:|ftp:|mailto:|www\.|\/\/)|\b[a-z0-9-]{2,}\.(?:[a-z]{2,})\b|@[a-z0-9-]+\./i
const noLinks = (v: string) => !LINKISH.test(v)
// Control characters and zero-width characters never belong in a name or a message.
const CONTROLS = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]', 'g')
const clean = (v: string) =>
  v
    .replace(CONTROLS, '')
    .replace(/[ \t]+/g, ' ')
    .trim()

const schema = z.object({
  name: z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .min(2, 'Add your name (2+ letters)')
        .max(40, 'Keep the name under 40 letters')
        .refine(noLinks, 'No links in the name, please'),
    ),
  message: z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .min(2, 'Write a few words (2+ letters)')
        .max(280, 'Keep it under 280 letters')
        .refine(noLinks, 'No links, please. Just words.'),
    ),
  sticker: z.enum(GUEST_STICKERS).default('star'),
})

// shortcut: in-memory rate limit, fine for one container; move to Mongo/Redis if scaled out.
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 2
// Global ceiling so rotating IPs cannot flood the wall.
const MAX_GLOBAL_PER_WINDOW = 50
const GLOBAL = '__global__'
const g = globalThis as unknown as { __guestHits?: Map<string, number[]> }
const hits: Map<string, number[]> = (g.__guestHits ??= new Map())

const recent = (key: string, now: number) => {
  const ts = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.set(key, ts)
  return ts
}

/** Check first, record only allowed requests: blocked spam must not drain the global bucket. */
function rateLimited(key: string) {
  const now = Date.now()
  if (hits.size > 5000) {
    for (const [k, ts] of hits) if (!ts.some((t) => now - t < WINDOW_MS)) hits.delete(k)
  }
  const mine = recent(key, now)
  if (mine.length >= MAX_PER_WINDOW) return true
  const all = recent(GLOBAL, now)
  if (all.length >= MAX_GLOBAL_PER_WINDOW) return true
  mine.push(now)
  all.push(now)
  return false
}

/** Client IP as seen by our own reverse proxy (rightmost X-Forwarded-For hop). */
function clientIp(h: Headers) {
  const hops = (h.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return hops.at(-1) || h.get('x-real-ip') || 'unknown'
}

export async function signGuestbook(_prev: GuestState, form: FormData): Promise<GuestState> {
  const quietOk: GuestState = { ok: true, message: 'Thanks for signing!' }

  // Bot traps: hidden honeypot filled, or form sent inhumanly fast. Pretend success, save nothing.
  if (String(form.get('company') ?? '') !== '') return quietOk
  const startedAt = Number(form.get('t') ?? 0)
  if (!startedAt || Date.now() - startedAt < 2500) return quietOk

  const parsed = schema.safeParse({
    name: String(form.get('name') ?? ''),
    message: String(form.get('message') ?? ''),
    sticker: String(form.get('sticker') ?? 'star'),
  })
  if (!parsed.success) {
    const fieldErrors: Partial<Record<GuestField, string>> = {}
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as GuestField | 'sticker'
      if ((k === 'name' || k === 'message') && !fieldErrors[k]) fieldErrors[k] = issue.message
    }
    return { ok: false, message: 'Please fix the highlighted fields.', fieldErrors }
  }
  const data = parsed.data

  const h = await headers()
  const ipHash = crypto
    .createHash('sha256')
    .update(clientIp(h) + (process.env.PAYLOAD_SECRET ?? ''))
    .digest('hex')
    .slice(0, 16)
  if (rateLimited(ipHash)) {
    return { ok: false, message: 'You signed a moment ago. Try again in an hour.' }
  }

  try {
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    const approved = Boolean(site.guestbook?.autoApprove)
    const saved = await payload.create({
      collection: 'guestbook',
      overrideAccess: true,
      data: { ...data, approved, ipHash },
    })
    return {
      ok: true,
      message: approved ? 'Signed. Thank you!' : 'Signed. It shows for everyone after approval.',
      entry: {
        id: String(saved.id),
        name: data.name,
        message: data.message,
        sticker: data.sticker,
        createdAt: String(saved.createdAt),
        approved,
      },
    }
  } catch {
    return { ok: false, message: 'Could not save that. Try again later.' }
  }
}
