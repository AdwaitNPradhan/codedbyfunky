'use client'

import { useEffect, useRef, useState } from 'react'
import type { SiteData } from '@/lib/types'
import { useContactForm } from '@/components/contact/useContactForm'
import { track } from './engine'
import { gsap } from './gsap'
import { Arrow, useDarkroom } from './lib'
import c from './contact.module.css'
import r from './root.module.css'

export function Contact({ data }: { data: SiteData }) {
  const { settings } = data
  const { reduced } = useDarkroom()
  const { state, formAction, pending, hiddenFields } = useContactForm('darkroom')
  const [vals, setVals] = useState({ name: '', email: '', message: '' })
  const [copied, setCopied] = useState(false)
  const sec = useRef<HTMLElement>(null)
  const cover = useRef<HTMLDivElement>(null)
  const ig = settings.instagram
  const email = settings.publicEmail

  /* Section inversion: ink -> paper wipes up from the bottom, scrubbed to scroll. Instant when motion is reduced. */
  useEffect(() => {
    const el = sec.current
    const cv = cover.current
    if (!el || !cv || reduced) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cv,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 100% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true } },
      )
    }, el)
    return () => ctx.revert()
  }, [reduced])

  useEffect(() => {
    if (state?.ok) setVals({ name: '', email: '', message: '' })
  }, [state])

  const copy = async () => {
    if (!email) return
    setCopied(true) // confirm instantly; the clipboard write follows
    track('cta_email_copy')
    window.setTimeout(() => setCopied(false), 1800)
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      const t = document.createElement('textarea')
      t.value = email
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
  }

  const fe = state?.fieldErrors
  const set = (k: keyof typeof vals) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVals((v) => ({ ...v, [k]: e.target.value }))
  const socials = settings.socials.filter((s) => s.platform !== 'instagram')

  return (
    <section ref={sec} id="contact" className={`${r.section} ${c.contact} ${r.paperMode}`} data-section="contact" aria-labelledby="contact-h">
      <div ref={cover} className={c.cover} aria-hidden="true" />
      <div className={r.inner}>
        <h2 id="contact-h" className={`${r.display} ${c.giant}`}>Say hello.</h2>

        <div className={c.grid}>
          <div className={c.side}>
            {settings.availability.status !== 'closed' && <p className={c.avail}>{settings.availability.note}</p>}
            {email && (
              <div className={c.emailRow}>
                <a href={`mailto:${email}`} className={`${c.email} ${c.under}`}>{email}</a>
                <button type="button" className={c.copy} onClick={copy} aria-label={`Copy email address ${email}`}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <span className="sr-only" role="status">{copied ? 'Email address copied' : ''}</span>
              </div>
            )}
            {settings.resumeUrl && (
              <a href={settings.resumeUrl} download className={`${c.resume}`} onClick={() => track('cta_resume', { where: 'contact' })}>
                <span>Download resume (PDF)</span>
                <Arrow dir="down" size={18} />
              </a>
            )}
            <ul className={c.links}>
              {socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className={c.under}>{s.label} <Arrow /></a>
                </li>
              ))}
              {ig?.url && (
                <li>
                  <a href={ig.url} target="_blank" rel="noopener noreferrer" className={c.under} onClick={() => track('cta_instagram', { where: 'contact' })}>
                    Instagram {ig.handle} <Arrow />
                  </a>
                </li>
              )}
            </ul>
          </div>

          <form
            className={c.form}
            action={formAction}
            onSubmit={() => track('cta_contact_submit')}
            aria-describedby="contact-status"
          >
            {hiddenFields}
            <div className={c.field}>
              <label htmlFor="c-name">Name</label>
              <input id="c-name" name="name" required minLength={2} maxLength={80} autoComplete="name" value={vals.name} onChange={set('name')} aria-invalid={Boolean(fe?.name)} aria-describedby={fe?.name ? 'c-name-e' : undefined} />
              {fe?.name && <p id="c-name-e" role="alert" className={c.err}>{fe.name}</p>}
            </div>
            <div className={c.field}>
              <label htmlFor="c-email">Email</label>
              <input id="c-email" name="email" type="email" required autoComplete="email" value={vals.email} onChange={set('email')} aria-invalid={Boolean(fe?.email)} aria-describedby={fe?.email ? 'c-email-e' : undefined} />
              {fe?.email && <p id="c-email-e" role="alert" className={c.err}>{fe.email}</p>}
            </div>
            <div className={c.field}>
              <label htmlFor="c-msg">Message</label>
              <textarea id="c-msg" name="message" required minLength={10} maxLength={4000} rows={5} value={vals.message} onChange={set('message')} aria-invalid={Boolean(fe?.message)} aria-describedby={fe?.message ? 'c-msg-e' : undefined} />
              {fe?.message && <p id="c-msg-e" role="alert" className={c.err}>{fe.message}</p>}
            </div>
            <div className={c.submitRow}>
              <button type="submit" className={`${r.btn} ${c.send}`} disabled={pending}>
                {pending ? 'Sending…' : 'Send message'}
              </button>
              <p id="contact-status" aria-live="polite" className={c.status} data-ok={state?.ok ? 'true' : state ? 'false' : undefined}>
                {state?.message}
                {state && !state.ok && email && (
                  <>
                    {' '}Or write to <a className={c.under} href={`mailto:${email}`}>{email}</a>.
                  </>
                )}
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export function Footer({ data }: { data: SiteData }) {
  const { settings } = data
  const { scrollTo } = useDarkroom()
  const ig = settings.instagram
  return (
    <footer className={`${c.footer} ${r.paperMode}`}>
      <div className={r.inner}>
        {ig?.url && (
          <a href={ig.url} target="_blank" rel="noopener noreferrer" className={c.footIg} onClick={() => track('cta_instagram', { where: 'footer' })}>
            <span className={r.display}>Follow {ig.handle}</span>
            <span className={c.footArrow}><Arrow size={32} /></span>
          </a>
        )}
        <div className={`${r.mono} ${c.footRow}`}>
          <span>{settings.name}{settings.location ? ` · ${settings.location}` : ''}</span>
          <a href="#top" className={c.under} onClick={(e) => { e.preventDefault(); scrollTo(0) }}>back to top</a>
        </div>
      </div>
    </footer>
  )
}
