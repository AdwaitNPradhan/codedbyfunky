'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import nodemailer from 'nodemailer'
import { getPayload } from 'payload'
import { z } from 'zod'
import config from '@payload-config'

export type ContactField = 'name' | 'email' | 'topic' | 'message'
export type ContactState = {
  ok: boolean
  message: string
  fieldErrors?: Partial<Record<ContactField, string>>
} | null

const schema = z.object({
  name: z.string().trim().min(2, 'Tell me your name').max(80),
  email: z.email('That email looks off').trim().max(160),
  topic: z.string().trim().max(80).default(''),
  message: z.string().trim().min(10, 'A little more detail, please (10+ chars)').max(4000),
  source: z.string().trim().max(24).default(''),
})

// shortcut: in-memory rate limit, fine for one container; move to Mongo/Redis if scaled out.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 3
const g = globalThis as unknown as { __contactHits?: Map<string, number[]> }
const hits: Map<string, number[]> = (g.__contactHits ??= new Map())

function rateLimited(key: string) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const quietOk: ContactState = { ok: true, message: 'Thanks! I will reply soon.' }

  // Bot traps: hidden honeypot filled, or form submitted inhumanly fast. Pretend success.
  if (String(form.get('company') ?? '') !== '') return quietOk
  const startedAt = Number(form.get('t') ?? 0)
  if (!startedAt || Date.now() - startedAt < 2500) return quietOk

  const parsed = schema.safeParse({
    name: form.get('name') ?? '',
    email: form.get('email') ?? '',
    topic: form.get('topic') ?? '',
    message: form.get('message') ?? '',
    source: form.get('source') ?? '',
  })
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {}
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as ContactField
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message
    }
    return { ok: false, message: 'Please fix the highlighted fields.', fieldErrors }
  }
  const data = parsed.data

  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'unknown').trim()
  const ipHash = crypto.createHash('sha256').update(ip + (process.env.PAYLOAD_SECRET ?? '')).digest('hex').slice(0, 16)
  if (rateLimited(ipHash)) {
    return { ok: false, message: 'Too many messages from you in a short time. Try again in a few minutes.' }
  }

  const payload = await getPayload({ config })
  const saved = await payload.create({
    collection: 'messages',
    overrideAccess: true,
    data: { ...data, status: 'new', emailed: false, ipHash },
  })

  try {
    const port = Number(process.env.SMTP_PORT || 465)
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.CONTACT_TO,
      replyTo: { name: data.name, address: data.email },
      subject: `Portfolio: ${data.topic || 'New message'} — from ${data.name}`,
      text: `${data.name} <${data.email}>\nTopic: ${data.topic || '-'}\nVia: ${data.source || '-'}\n\n${data.message}`,
      html: `<p><b>${esc(data.name)}</b> &lt;${esc(data.email)}&gt;<br/>Topic: ${esc(data.topic || '-')}<br/>Via: ${esc(data.source || '-')}</p><p style="white-space:pre-wrap">${esc(data.message)}</p>`,
    })
    await payload.update({ collection: 'messages', id: saved.id, overrideAccess: true, data: { emailed: true } })
  } catch (err) {
    // Message is saved in the CMS inbox even if mail fails.
    payload.logger.error({ err }, 'contact email failed')
  }

  return { ok: true, message: `Thanks ${data.name.split(' ')[0]}! Your message landed. I usually reply within a day.` }
}
