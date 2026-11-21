'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useContactForm } from '@/components/contact/useContactForm'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { CopyButton } from './common'
import ui from './apps.module.css'

export default function Mail({ props, active }: AppProps) {
  const os = useOS()
  const email = os.data.settings.publicEmail
  const { state, formAction, pending, hiddenFields } = useContactForm('os')
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const [subject, setSubject] = useState(props.subject ?? '')
  const [body, setBody] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  // The server drops forms submitted within 2.5s of mount (bot trap). Real users never notice; autofill + Enter would be dropped silently.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2600)
    return () => clearTimeout(t)
  }, [])
  const sent = Boolean(state?.ok)
  const fe = state?.fieldErrors ?? {}

  // `contact`, `sudo hire funky` and project buttons can pre-fill the subject.
  useEffect(() => {
    if (props.subject) setSubject(props.subject)
  }, [props.subject])
  useEffect(() => {
    if (active && !sent) nameRef.current?.focus({ preventScroll: true })
  }, [active, sent])

  const reset = () => {
    setName('')
    setFrom('')
    setSubject('')
    setBody('')
    // A fresh form action state needs a remount: close and reopen the window is the simplest honest reset.
    os.close('mail')
    setTimeout(() => os.open('mail'), 0)
  }

  return (
    <div className={`${ui.scroll} ${ui.mail}`}>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <m.div
            key="sent"
            className={ui.sent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="status"
          >
            <h2 className={ui.hello}>Message sent.</h2>
            <p>{state?.message || 'Thanks! I will reply soon.'}</p>
            <p className={ui.dim}>If it is urgent, you can also email me directly.</p>
            <div className={ui.ctaRow}>
              {email && <a className={`${ui.btn} ${ui.btnPrimary}`} href={`mailto:${email}`}>{email}</a>}
              <button type="button" className={ui.btn} onClick={reset}>
                Write another
              </button>
            </div>
          </m.div>
        ) : (
          <m.form
            key="compose"
            action={formAction}
            noValidate
            className={ui.compose}
            exit={{ y: -40, opacity: 0, transition: { duration: 0.4, ease: [0.55, 0.055, 0.675, 0.19] } }}
            aria-label="Compose message"
          >
            {hiddenFields}
            <div className={ui.mailTo}>
              <span className={ui.dim}>To</span>
              <strong>{email ?? 'the site owner'}</strong>
              {email && <CopyButton text={email} label="Copy email" className={ui.btnSm} />}
            </div>
            <div className={ui.fieldRow}>
              <div className={ui.field}>
                <label htmlFor="os-name">Your name</label>
                <input
                  ref={nameRef}
                  id="os-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fe.name)}
                  aria-describedby={fe.name ? 'os-name-e' : undefined}
                />
                {fe.name && (
                  <p id="os-name-e" role="alert" className={ui.err}>
                    {fe.name}
                  </p>
                )}
              </div>
              <div className={ui.field}>
                <label htmlFor="os-email">Reply-to email</label>
                <input
                  id="os-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-invalid={Boolean(fe.email)}
                  aria-describedby={fe.email ? 'os-email-e' : undefined}
                />
                {fe.email && (
                  <p id="os-email-e" role="alert" className={ui.err}>
                    {fe.email}
                  </p>
                )}
              </div>
            </div>
            <div className={ui.field}>
              <label htmlFor="os-topic">Subject</label>
              <input id="os-topic" name="topic" value={subject} onChange={(e) => setSubject(e.target.value)} autoComplete="off" />
            </div>
            <div className={`${ui.field} ${ui.grow}`}>
              <label htmlFor="os-msg">Message</label>
              <textarea
                id="os-msg"
                name="message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                aria-invalid={Boolean(fe.message)}
                aria-describedby={fe.message ? 'os-msg-e' : undefined}
              />
              {fe.message && (
                <p id="os-msg-e" role="alert" className={ui.err}>
                  {fe.message}
                </p>
              )}
            </div>
            <div className={ui.mailFoot}>
              <p aria-live="polite" className={state && !state.ok ? ui.err : ui.dim}>
                {state && !state.ok ? state.message : ''}
                {state && !state.ok && email ? ` You can also write to ${email}.` : ''}
              </p>
              <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={pending || !ready}>
                {pending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </div>
  )
}
