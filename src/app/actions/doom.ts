'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { hasRole } from '@/access'

/**
 * Terminal easter egg: `sudo rm -rf / --no-preserve-root` blanks FunkyOS for every visitor for 1 hour.
 * The state is only a time stamp. FunkyOS reads it on the client after boot, so the server HTML
 * and the ISR cache stay normal and crawlers never see the blank screen.
 */
// shortcut: in-memory, single container; resets on redeploy. Move to the DB if the app ever scales out.
const g = globalThis as unknown as { __doom?: { doomUntil: number; lastTrigger: number } }
const state = (g.__doom ??= { doomUntil: 0, lastTrigger: 0 })

const HOUR = 60 * 60 * 1000
// The env overrides exist only so a test run can see a whole cycle in seconds.
const DURATION_MS = Number(process.env.DOOM_DURATION_MS) || HOUR
// At most one trigger per 24 h, so the portfolio cannot stay "down" all day.
const COOLDOWN_MS = Number(process.env.DOOM_COOLDOWN_MS) || 24 * HOUR

// Per-IP limit, same pattern as contact.ts: check first, record only allowed requests.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 3
const MAX_GLOBAL_PER_WINDOW = 30
const GLOBAL = '__global__'
const gh = globalThis as unknown as { __doomHits?: Map<string, number[]> }
const hits: Map<string, number[]> = (gh.__doomHits ??= new Map())
const recent = (key: string, now: number) => {
  const ts = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.set(key, ts)
  return ts
}
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
function clientIp(h: Headers) {
  const hops = (h.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return hops.at(-1) || h.get('x-real-ip') || 'unknown'
}

/** CMS kill switch: Site settings > Fun > doomsday. Default on. */
async function enabled() {
  try {
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    return site.easterEggs?.doomsday !== false
  } catch {
    return false
  }
}

export type DoomState = {
  active: boolean
  /** When the system comes back (ms since epoch, server clock). */
  until: number
  /** Server time now, so the client countdown is right even if the visitor's clock is off. */
  now: number
}
export type DoomResult = DoomState & {
  ok: boolean
  reason?: 'disabled' | 'cooldown' | 'rate'
  /** When the next trigger is allowed. */
  retryAt?: number
}

export async function getDoom(): Promise<DoomState> {
  const now = Date.now()
  if (now >= state.doomUntil || !(await enabled())) return { active: false, until: 0, now }
  return { active: true, until: state.doomUntil, now }
}

export async function triggerDoom(): Promise<DoomResult> {
  const now = Date.now()
  const off = (reason: DoomResult['reason'], retryAt?: number): DoomResult => ({
    ok: false,
    active: false,
    until: 0,
    now,
    reason,
    retryAt,
  })
  if (!(await enabled())) return off('disabled')
  if (now < state.doomUntil) return { ok: true, active: true, until: state.doomUntil, now }
  if (now - state.lastTrigger < COOLDOWN_MS) return off('cooldown', state.lastTrigger + COOLDOWN_MS)
  const h = await headers()
  const ipHash = crypto
    .createHash('sha256')
    .update(clientIp(h) + (process.env.PAYLOAD_SECRET ?? ''))
    .digest('hex')
    .slice(0, 16)
  if (rateLimited(ipHash)) return off('rate')
  state.lastTrigger = now
  state.doomUntil = now + DURATION_MS
  return { ok: true, active: true, until: state.doomUntil, now }
}

/** The owner's undo: only a signed-in admin (Payload session cookie) can end the blackout early. */
export async function recoverDoom(): Promise<{ ok: boolean }> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!hasRole(user, 'admin')) return { ok: false }
  state.doomUntil = 0
  return { ok: true }
}
