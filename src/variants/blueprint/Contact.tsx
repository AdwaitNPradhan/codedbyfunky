'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useContactForm } from '@/components/contact/useContactForm'
import { gsap } from './gsap'
import { useBP, useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { track } from './util'
import type { Settings } from '@/lib/types'
import s from './sections.module.css'
import b from './base.module.css'

const SOCIAL_ORDER = ['github', 'linkedin', 'instagram']

/** Sheet 09: a vellum work-order slip. On success the master trace energises into it. */
export function Contact({ settings }: { settings: Settings }) {
  const sh = useSheet('sheet-order')
  const { reduced, setContactOk } = useBP()
  const { state, formAction, pending, hiddenFields } = useContactForm('blueprint')
  const [v, setV] = useState({ name: '', email: '', message: '' })
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('')
  const stamp = useRef<HTMLDivElement>(null)
  const uid = useId()
  const ok = state?.ok === true
  const err = state?.fieldErrors ?? {}
  const email = settings.publicEmail

  useEffect(() => {
    setContactOk(ok)
    if (ok) track('cta_contact_submit')
  }, [ok, setContactOk])

  useEffect(() => {
    const el = stamp.current
    if (!ok || !el || reduced !== false) return
    const t = gsap.fromTo(el, { scale: 1.7, opacity: 0, rotate: -12 }, { scale: 1, opacity: 1, rotate: -5, duration: 0.4, ease: 'back.out(3)', delay: 1.2 })
    return () => void t.kill()
  }, [ok, reduced])

  const copy = async () => {
    if (!email) return
    setCopied('ok') // optimistic: the confirmation must land inside 150ms
    track('cta_email_copy')
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      setCopied('fail')
    }
    window.setTimeout(() => setCopied(''), 2200)
  }

  const socials = [...settings.socials].sort((a, c) => {
    const ia = SOCIAL_ORDER.indexOf(a.platform)
    const ic = SOCIAL_ORDER.indexOf(c.platform)
    return (ia < 0 ? 99 : ia) - (ic < 0 ? 99 : ic)
  })

  const field = (name: 'name' | 'email' | 'message', tp: string, label: string) => {
    const id = `${uid}-${name}`
    const e = err[name]
    const common = {
      id,
      name,
      value: v[name],
      onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [name]: ev.target.value })),
      'aria-invalid': e ? true : undefined,
      'aria-describedby': e ? `${id}-e` : undefined,
      className: s.slipInput,
    }
    return (
      <div className={s.slipField} data-error={e ? '1' : undefined}>
        <label htmlFor={id}>
          <span className={s.tp}>{tp}</span>
          {label}
        </label>
        {name === 'message' ? (
          <textarea {...common} rows={5} required minLength={10} autoComplete="off" />
        ) : (
          <input {...common} type={name === 'email' ? 'email' : 'text'} required autoComplete={name === 'email' ? 'email' : 'name'} />
        )}
        {e && (
          <p id={`${id}-e`} className={s.slipError} role="alert">
            {e}
          </p>
        )}
      </div>
    )
  }

  return (
    <section id="sheet-order" data-sheet className={`${s.sheet} ${s.orderSheet}`} aria-labelledby="h-order">
      <div className={s.wrap}>
        <SheetHead id="h-order" part={sh.part} tag="WORK ORDER" title="Contact" note="Hiring, a project, or a question about a build. This goes straight to the owner's inbox." />
        <div className={s.order}>
          <div className={s.slip} data-ok={ok ? '1' : undefined} data-reveal>
            <span data-trace-pad="slip" className={s.slipPad} aria-hidden="true" />
            <div className={s.slipTop}>
              <span className={b.mono}>WORK ORDER</span>
              <span className={b.mono}>TO: {settings.handle.toUpperCase()}</span>
            </div>
            {ok ? (
              <div className={s.slipDone} role="status">
                <div ref={stamp} className={s.contStamp}>
                  CONTINUITY OK
                </div>
                <p className={s.slipThanks}>{state?.message}</p>
                {email && (
                  <p>
                    Need to add something? <a href={`mailto:${email}`}>{email}</a>
                  </p>
                )}
              </div>
            ) : (
              <form
                action={(fd) => {
                  setV({ name: String(fd.get('name') ?? ''), email: String(fd.get('email') ?? ''), message: String(fd.get('message') ?? '') })
                  formAction(fd)
                }}
                noValidate
                aria-busy={pending}
              >
                {hiddenFields}
                {field('name', 'TP1', 'Name')}
                {field('email', 'TP2', 'Email')}
                {field('message', 'TP3', 'Message')}
                <div className={s.slipFoot}>
                  <button type="submit" className={`${b.btn} ${b.btnPrimary} ${s.slipBtn}`} disabled={pending}>
                    {pending ? 'Sending…' : 'Send'}
                  </button>
                  <p className={s.slipMsg} aria-live="polite">
                    {state && !state.ok ? (
                      <span className={s.slipError} role="alert">
                        {state.message}
                        {email && (
                          <>
                            {' '}
                            Email me instead: <a href={`mailto:${email}`}>{email}</a>
                          </>
                        )}
                      </span>
                    ) : null}
                  </p>
                </div>
              </form>
            )}
          </div>

          <div className={s.contactSide} data-reveal>
            {email && (
              <div className={s.mailBox}>
                <span className={b.mono}>EMAIL</span>
                <a href={`mailto:${email}`} className={s.mail}>
                  {email}
                </a>
                <button type="button" className={`${b.btn} ${b.btnGhost} ${b.btnSm}`} onClick={copy} data-copied={copied || undefined}>
                  {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Press Ctrl+C' : 'Copy'}
                </button>
                <span className={b.vh} aria-live="polite">
                  {copied === 'ok' ? 'Email address copied' : ''}
                </span>
              </div>
            )}
            {settings.resumeUrl && (
              <a className={`${b.btn} ${b.btnGhost} ${s.resumeBtn}`} href={settings.resumeUrl} download onClick={() => track('cta_resume', { at: 'contact' })}>
                Download full drawing set <span className={b.mono}>PDF</span>
              </a>
            )}
            <ul className={s.links}>
              {socials.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => l.platform === 'instagram' && track('cta_instagram', { at: 'contact' })}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Footer({ settings }: { settings: Settings }) {
  const ig = settings.instagram
  return (
    <footer className={s.footer}>
      <div className={s.wrap}>
        <div className={s.footRow}>
          <p className={b.mono}>
            DRAWN BY {settings.name.toUpperCase()} · ALL DIMENSIONS IN MM
          </p>
          {ig.url && (
            <a className={`${b.btn} ${b.btnGhost} ${b.btnSm}`} href={ig.url} target="_blank" rel="noopener noreferrer" onClick={() => track('cta_instagram', { at: 'footer' })}>
              REF: {ig.handle} · SEE FULL SET
            </a>
          )}
          <a className={b.textLink} href="#sheet-cover">
            Back to sheet 01
          </a>
        </div>
      </div>
    </footer>
  )
}
