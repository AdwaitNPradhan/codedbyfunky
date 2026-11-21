'use client'

import { useEffect, useRef, useState } from 'react'
import type { Settings } from '@/lib/types'
import { useContactForm } from '@/components/contact/useContactForm'
import { addCoins, award } from '../lib/store'
import { sfx } from '../lib/sound'
import { fireConfetti } from '../lib/confetti'
import { cx, track } from '../lib/misc'
import { Icon } from './art'
import { Slab, SlabHead } from './Slab'

export function Contact({ s }: { s: Settings }) {
  const { state, formAction, pending, hiddenFields } = useContactForm('arcade')
  const [vals, setVals] = useState({ name: '', email: '', message: '' })
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastState = useRef(state)
  const email = s.publicEmail

  // Success: confetti + clear the fields. Failure keeps what was typed.
  useEffect(() => {
    if (!state || state === lastState.current) return
    lastState.current = state
    if (!state.ok && state.fieldErrors) {
      document.querySelector<HTMLElement>('.ar-form [aria-invalid="true"]')?.focus()
    }
    if (state.ok) {
      setVals({ name: '', email: '', message: '' })
      const root = document.querySelector<HTMLElement>('[data-variant="arcade"]')
      const box = rootRef.current?.getBoundingClientRect()
      if (root) fireConfetti(root, box ? { x: box.left + box.width / 2, y: box.top + box.height * 0.4 } : undefined)
      sfx.jingle()
      addCoins(5)
      track('cta_contact_submit')
    }
  }, [state])

  const copy = async () => {
    if (!email) return
    setCopied(true) // instant feedback, well inside 150 ms
    setTimeout(() => setCopied(false), 1800)
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = email
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {}
      ta.remove()
    }
    track('cta_email_copy')
    award('copy-cat')
    addCoins(1)
    sfx.coin()
  }

  const err = state && !state.ok ? state.fieldErrors : undefined
  const field = (k: 'name' | 'email' | 'message') => ({
    value: vals[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVals((v) => ({ ...v, [k]: e.target.value })),
    'aria-invalid': err?.[k] ? true : undefined,
    'aria-describedby': err?.[k] ? `c-${k}-err` : undefined,
  })
  const socials = s.socials.filter((x) => x.url)

  return (
    <Slab id="contact" tone="orange" labelledBy="contact-h">
      <SlabHead id="contact-h" title="Contact" />
      <div className="ar-contact">
        <div className="ar-contact__info">
          <p className="ar-lede ar-lede--big">
            {s.availability.status === 'closed' ? 'Not looking right now, but my inbox is open.' : s.availability.note || 'Got a role, a project or a weird idea? Say hi.'}
          </p>
          {email && (
            <div className="ar-email">
              <a className="ar-email__text" href={`mailto:${email}`} onClick={() => track('cta_email_click')}>
                {email}
              </a>
              <button type="button" className="ar-btn ar-btn--sm ar-btn--ink" onClick={copy} aria-describedby="copy-live">
                <Icon name={copied ? 'check' : 'copy'} size={18} /> {copied ? 'Copied' : 'Copy'}
              </button>
              <span id="copy-live" className="sr-only" aria-live="polite">{copied ? 'Email copied to clipboard' : ''}</span>
            </div>
          )}
          <div className="ar-contact__links">
            {s.resumeUrl && (
              <a className="ar-btn ar-btn--yellow" href={s.resumeUrl} download onClick={() => track('cta_resume', { where: 'contact' })}>
                <Icon name="download" size={18} /> Download save file (PDF)
              </a>
            )}
            {socials.map((l) => (
              <a key={l.url} className="ar-pill" href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => l.platform === 'instagram' && track('cta_instagram', { where: 'contact' })}>
                {l.label || l.platform} <Icon name="external" size={14} />
              </a>
            ))}
          </div>
        </div>

        <div className="ar-contact__formwrap" ref={rootRef}>
          {state?.ok ? (
            <div className="ar-sent" role="status">
              <span className="ar-stamp-sent" aria-hidden="true">SENT</span>
              <p className="ar-lede ar-lede--big">{state.message}</p>
            </div>
          ) : (
            <form action={formAction} noValidate className="ar-form" aria-busy={pending}>
              {hiddenFields}
              <div className="ar-field">
                <label htmlFor="c-name">Name</label>
                <input id="c-name" name="name" required autoComplete="name" maxLength={80} {...field('name')} />
                {err?.name && <p id="c-name-err" className="ar-err" role="alert">{err.name}</p>}
              </div>
              <div className="ar-field">
                <label htmlFor="c-email">Email</label>
                <input id="c-email" name="email" type="email" required autoComplete="email" inputMode="email" maxLength={160} {...field('email')} />
                {err?.email && <p id="c-email-err" className="ar-err" role="alert">{err.email}</p>}
              </div>
              <div className="ar-field">
                <label htmlFor="c-message">Message</label>
                <textarea id="c-message" name="message" required minLength={10} rows={5} maxLength={4000} {...field('message')} />
                {err?.message && <p id="c-message-err" className="ar-err" role="alert">{err.message}</p>}
              </div>
              <button type="submit" className="ar-btn ar-btn--giant ar-btn--ink" disabled={pending}>
                {pending ? 'SENDING…' : 'SEND'}
              </button>
              <p className={cx('ar-form__msg', state && !state.ok && 'is-bad')} aria-live="polite">
                {state && !state.ok ? (
                  <>
                    {state.message} {email && <>Or email <a href={`mailto:${email}`}>{email}</a>.</>}
                  </>
                ) : (
                  'No spam, no newsletter. A real person reads this.'
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </Slab>
  )
}
