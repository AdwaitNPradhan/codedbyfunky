'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { signGuestbook, type GuestState } from '@/app/actions/guestbook'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { fmtDate, safeParse, store } from '../util'
import ui from './apps.module.css'

const STICKERS: [string, string, string][] = [
  ['star', '⭐', 'star'],
  ['heart', '❤️', 'heart'],
  ['smile', '😄', 'smile'],
  ['fire', '🔥', 'fire'],
  ['rocket', '🚀', 'rocket'],
  ['coffee', '☕', 'coffee'],
  ['camera', '📷', 'camera'],
  ['bug', '🐛', 'bug'],
]
const EMOJI = Object.fromEntries(STICKERS.map(([k, e]) => [k, e])) as Record<string, string>
const KEY = 'funkyos.guestbook.mine.v1'
const KEEP_MS = 14 * 86_400_000
const SEND_AFTER_MS = 2600 // the server drops forms sent in under 2.5 s

type Mine = { id: string; name: string; message: string; sticker: string; createdAt: string; approved: boolean }
const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** A wall of paper notes. Everything from the visitor and the CMS is drawn as plain text. */
export default function Guestbook(_: AppProps) {
  const os = useOS()
  const wall = os.data.guestbook
  const [state, action, pending] = useActionState<GuestState, FormData>(signGuestbook, null)
  const [mine, setMine] = useState<Mine[]>([])
  const [sticker, setSticker] = useState('star')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [t0] = useState(() => Date.now())
  const [ready, setReady] = useState(false)

  // Entries this visitor signed. They show at once, marked pending, until the approved wall has them.
  useEffect(() => {
    const saved = safeParse<Mine[]>(store.get('local', KEY), [])
    const onWall = new Set(wall.map((e) => e.id))
    const keep = saved.filter(
      (e) => !onWall.has(e.id) && Date.now() - new Date(e.createdAt).getTime() < KEEP_MS,
    )
    if (keep.length !== saved.length) store.set('local', KEY, JSON.stringify(keep))
    setMine(keep)
  }, [wall])
  useEffect(() => {
    const t = setTimeout(() => setReady(true), SEND_AFTER_MS)
    return () => clearTimeout(t)
  }, [])

  const entry = state?.ok ? state.entry : undefined
  useEffect(() => {
    if (!entry) return
    setMine((m) => {
      if (m.some((x) => x.id === entry.id)) return m
      const next = [entry, ...m]
      store.set('local', KEY, JSON.stringify(next))
      return next
    })
    setName('')
    setMsg('')
  }, [entry])

  const items = useMemo(
    () => [
      ...mine.map((e) => ({ ...e, mine: true })),
      ...wall.map((e) => ({ ...e, approved: true, mine: false })),
    ],
    [mine, wall],
  )
  const fe = state && !state.ok ? state.fieldErrors : undefined

  return (
    <div className={`${ui.scroll} ${ui.guest}`}>
      <form className={ui.gbForm} action={action} aria-label="Sign the guestbook">
        <h2 className={ui.gbTitle}>Sign the guestbook</h2>
        <input type="hidden" name="t" value={t0} />
        {/* Honeypot: humans never see or fill this. */}
        <div className={ui.gbTrap} aria-hidden="true">
          <label>
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className={ui.field}>
          <span>Your name</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="name"
            aria-invalid={Boolean(fe?.name)}
            aria-describedby={fe?.name ? 'gb-name-err' : undefined}
            required
          />
          {fe?.name && (
            <p id="gb-name-err" role="alert" className={ui.err}>
              {fe.name}
            </p>
          )}
        </label>
        <label className={ui.field}>
          <span>
            Message <em className={ui.dim}>({msg.length}/280)</em>
          </span>
          <textarea
            name="message"
            rows={4}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            maxLength={280}
            aria-invalid={Boolean(fe?.message)}
            aria-describedby={fe?.message ? 'gb-msg-err' : undefined}
            required
          />
          {fe?.message && (
            <p id="gb-msg-err" role="alert" className={ui.err}>
              {fe.message}
            </p>
          )}
        </label>
        <fieldset className={ui.gbStickers}>
          <legend>Pick a sticker</legend>
          {STICKERS.map(([k, e, label]) => (
            <label key={k} className={ui.gbSticker}>
              <input
                type="radio"
                name="sticker"
                value={k}
                checked={sticker === k}
                onChange={() => setSticker(k)}
              />
              <span aria-hidden="true">{e}</span>
              <span className={ui.srOnlyApp}>{label}</span>
            </label>
          ))}
        </fieldset>
        <p className={ui.dim} style={{ fontSize: 12, margin: 0 }}>
          No links, please. New notes wait for approval before everyone sees them.
        </p>
        <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={pending || !ready}>
          {pending ? 'Signing…' : ready ? 'Sign' : 'One moment…'}
        </button>
        {state && (
          <p role={state.ok ? 'status' : 'alert'} className={state.ok ? ui.gbOk : ui.err} style={{ margin: 0 }}>
            {state.message}
          </p>
        )}
      </form>

      <section className={ui.gbWall} aria-label="Guestbook entries">
        {items.length === 0 && <p className={ui.dim}>Nobody has signed yet. Be the first.</p>}
        <ul>
          {items.map((e) => {
            const h = hash(e.id)
            return (
              <li
                key={e.id}
                className={ui.gbNote}
                data-hue={h % 5}
                style={{ '--tilt': `${((h % 7) - 3) * 0.7}deg` } as React.CSSProperties}
              >
                <span className={ui.gbEmoji} role="img" aria-label={`${e.sticker} sticker`}>
                  {EMOJI[e.sticker] ?? '⭐'}
                </span>
                <p className={ui.gbMsg}>{e.message}</p>
                <p className={ui.gbBy}>
                  {e.name} · {fmtDate(e.createdAt)}
                </p>
                {e.mine && (
                  <span className={ui.gbPending}>{e.approved ? 'just posted' : 'pending approval'}</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
