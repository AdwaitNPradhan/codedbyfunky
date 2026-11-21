'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useContactForm } from '@/components/contact/useContactForm'
import { useOrbit } from '../lib/store'
import { track } from '../lib/util'
import { ArrowUpRight, Btn, BtnLink, Copy, Download } from '../ui/bits'
import { Panel, Station, Title } from './Station'
import s from '../orbit.module.css'

function EmailCopy({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <div className={s.email} data-rise>
      <a className={s.emailLink} href={`mailto:${email}`} data-cursor="MAIL">
        {email}
      </a>
      <Btn
        cursor="COPY"
        onClick={() => {
          setCopied(true)
          track('cta_email_copy')
          void navigator.clipboard?.writeText(email).catch(() => {})
        }}
        aria-label="Copy email address"
      >
        <Copy /> <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </Btn>
    </div>
  )
}

function Form({ email }: { email: string | null }) {
  const { state, formAction, pending, hiddenFields } = useContactForm('orbit')
  const { store } = useOrbit()
  const [v, setV] = useState({ name: '', email: '', message: '' })
  // a field's server error disappears as soon as that field is edited again
  const [edited, setEdited] = useState<Record<string, boolean>>({})
  useEffect(() => setEdited({}), [state])
  const raw = state?.fieldErrors
  const err = raw && {
    name: edited.name ? undefined : raw.name,
    email: edited.email ? undefined : raw.email,
    message: edited.message ? undefined : raw.message,
  }
  const ok = state?.ok === true

  useEffect(() => {
    if (ok) {
      store.pulse = performance.now()
      track('cta_contact_submit')
    }
  }, [ok, store])

  if (ok) {
    return (
      <div className={s.formOk} role="status" data-rise>
        <p className={s.formOkTitle}>Message sent.</p>
        <p>{state?.message}</p>
      </div>
    )
  }

  const bind = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setV((p) => ({ ...p, [k]: e.target.value }))
      setEdited((p) => (p[k] ? p : { ...p, [k]: true }))
    },
  })

  return (
    <form action={formAction} className={s.form} noValidate data-rise>
      {hiddenFields}
      <div className={s.field}>
        <label htmlFor="orbit-name">Name</label>
        <input id="orbit-name" name="name" autoComplete="name" required aria-required="true" aria-invalid={err?.name ? true : undefined} aria-describedby={err?.name ? 'orbit-name-err' : undefined} {...bind('name')} />
        {err?.name && (
          <p className={s.fieldErr} id="orbit-name-err" role="alert">
            {err.name}
          </p>
        )}
      </div>
      <div className={s.field}>
        <label htmlFor="orbit-email">Email</label>
        <input id="orbit-email" name="email" type="email" autoComplete="email" required aria-required="true" aria-invalid={err?.email ? true : undefined} aria-describedby={err?.email ? 'orbit-email-err' : undefined} {...bind('email')} />
        {err?.email && (
          <p className={s.fieldErr} id="orbit-email-err" role="alert">
            {err.email}
          </p>
        )}
      </div>
      <div className={clsx(s.field, s.fieldWide)}>
        <label htmlFor="orbit-message">Message</label>
        <textarea id="orbit-message" name="message" rows={3} required aria-required="true" aria-invalid={err?.message ? true : undefined} aria-describedby={err?.message ? 'orbit-message-err' : undefined} {...bind('message')} />
        {err?.message && (
          <p className={s.fieldErr} id="orbit-message-err" role="alert">
            {err.message}
          </p>
        )}
      </div>
      <div className={s.formFoot}>
        <Btn type="submit" variant="primary" magnetic disabled={pending} cursor="SEND">
          {pending ? 'Sending…' : 'Send message'}
        </Btn>
        <p className={clsx(s.formMsg, state && !state.ok && s.formMsgErr)} aria-live="polite">
          {state && !state.ok ? state.message : ''}
          {state && !state.ok && email ? ` Or write to ${email}.` : ''}
        </p>
      </div>
    </form>
  )
}

export function Contact() {
  const { data, mobile } = useOrbit()
  const st = data.settings
  const ig = st.instagram
  const gh = st.socials.find((l) => l.platform === 'github')
  const li = st.socials.find((l) => l.platform === 'linkedin')
  const open = st.availability.status !== 'closed'

  return (
    <Station i={6}>
      <Panel station={6} a={0} b={mobile ? 0.45 : 1} label="Contact" tall={!mobile}>
        <div className={clsx(s.copy, s.colL, s.contactCol)}>
          <Title id="contact-title">Contact</Title>
          {open && st.availability.note && (
            <p className={s.lede} data-rise>
              {st.availability.note}
            </p>
          )}
          {st.publicEmail && <EmailCopy email={st.publicEmail} />}
          {!mobile && <ContactFormSlot email={st.publicEmail} />}
          <ul className={s.links} data-rise>
            {st.resumeUrl && (
              <li>
                <BtnLink href={st.resumeUrl} download variant="ghost" magnetic cursor="PDF" onClick={() => track('cta_resume', { where: 'contact' })}>
                  Resume <Download />
                </BtnLink>
              </li>
            )}
            {gh && (
              <li>
                <BtnLink href={gh.url} external variant="text" cursor="OPEN">
                  GitHub <ArrowUpRight />
                </BtnLink>
              </li>
            )}
            {li && (
              <li>
                <BtnLink href={li.url} external variant="text" cursor="OPEN">
                  LinkedIn <ArrowUpRight />
                </BtnLink>
              </li>
            )}
            {ig.url && (
              <li>
                <BtnLink href={ig.url} external variant="text" cursor="OPEN" onClick={() => track('cta_instagram', { where: 'contact' })}>
                  Instagram <ArrowUpRight />
                </BtnLink>
              </li>
            )}
          </ul>
        </div>
      </Panel>
      {mobile && (
        <Panel station={6} a={0.55} b={1} label="Contact form" tall>
          <div className={clsx(s.copy, s.colL, s.contactCol)}>
            <ContactFormSlot email={st.publicEmail} />
          </div>
        </Panel>
      )}
      <footer className={s.footer}>
        <p>
          © {new Date().getFullYear()} {st.name}
        </p>
      </footer>
    </Station>
  )
}

function ContactFormSlot({ email }: { email: string | null }) {
  return <Form email={email} />
}
