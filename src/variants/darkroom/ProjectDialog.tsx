'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { Project } from '@/lib/types'
import { track } from './engine'
import { gsap } from './gsap'
import d from './dialog.module.css'
import { Arrow, aspect, pad2, Pic } from './lib'
import r from './root.module.css'

type Props = {
  projects: Project[]
  slug: string
  x: number
  y: number
  trigger: HTMLElement | null
  reduced: boolean
  onNavigate: (slug: string) => void
  onContact: () => void
  /** Called after the close animation. */
  onClose: (restore: HTMLElement | null) => void
}

const Block = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className={d.block}>
    <h3 className={`${r.mono} ${d.label}`}>{label}</h3>
    <div className={d.val}>{children}</div>
  </section>
)

/** Case study, opened in-page: iris wipe from the clicked row. Problem > Role > Stack > Approach > Outcome > Links. */
export default function ProjectDialog({ projects, slug, x, y, trigger, reduced, onNavigate, onContact, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const i = Math.max(0, projects.findIndex((p) => p.slug === slug))
  const p = projects[i]
  const prev = projects[(i - 1 + projects.length) % projects.length]
  const next = projects[(i + 1) % projects.length]

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    track('project_open', { slug })
    if (reduced) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15 })
    else
      gsap.fromTo(
        el,
        { clipPath: `circle(0% at ${x}px ${y}px)` },
        { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 0.8, ease: 'expo.inOut', onComplete: () => void gsap.set(el, { clearProps: 'clipPath' }) },
      )
    return () => void gsap.killTweensOf(el)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on open
  }, [])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [slug])

  const close = useCallback(() => {
    const el = root.current
    if (closing.current) return
    closing.current = true
    if (!el) return onClose(trigger)
    gsap.killTweensOf(el)
    const done = () => onClose(trigger)
    if (reduced) gsap.to(el, { opacity: 0, duration: 0.15, onComplete: done })
    else gsap.to(el, { clipPath: `circle(0% at ${x}px ${y}px)`, duration: 0.7, ease: 'expo.inOut', onComplete: done })
  }, [onClose, reduced, trigger, x, y])

  /* Esc + focus trap */
  useEffect(() => {
    const el = root.current
    el?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'Tab' && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
        if (!f.length) return
        const a = f[0]
        const z = f[f.length - 1]
        if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [close])

  if (!p) return null
  const shots = [p.cover, ...p.gallery].filter((m): m is NonNullable<typeof m> => Boolean(m))
  const facts = [p.role && ['Role', p.role], p.client && ['For', p.client], p.year && ['Year', String(p.year)]].filter(Boolean) as string[][]

  return (
    <div ref={root} className={`${d.dialog} ${r.paperMode}`} role="dialog" aria-modal="true" aria-labelledby="pd-title">
      <div ref={scroller} className={d.scroll} data-lenis-prevent>
        <div className={d.bar}>
          <button type="button" className={d.close} data-autofocus onClick={close}>
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" fill="none" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" /></svg>
            Close
          </button>
          <span className={`${r.mono} ${d.count}`}>print {pad2(i + 1)} / {pad2(projects.length)}</span>
        </div>

        <article className={d.body}>
          <h2 id="pd-title" className={`${r.display} ${d.title}`}>{p.title}</h2>
          <p className={d.lede}>{p.summary}</p>

          {facts.length > 0 && (
            <dl className={d.facts}>
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className={r.mono}>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {shots[0] && (
            <figure className={d.hero} style={{ aspectRatio: aspect(shots[0]), '--ar': aspect(shots[0]) } as React.CSSProperties}>
              <Pic img={shots[0]} rendition="hero" sizes="(max-width: 900px) 100vw, 1200px" priority />
            </figure>
          )}

          <div className={d.story}>
            {p.problem && <Block label="problem"><p>{p.problem}</p></Block>}
            {(p.role || p.client) && (
              <Block label="role">
                <p>{[p.role, p.client && `for ${p.client}`, p.year].filter(Boolean).join(' · ')}</p>
              </Block>
            )}
            {p.stack.length > 0 && (
              <Block label="stack">
                <ul className={d.chips}>{p.stack.map((s) => <li key={s} className={r.mono}>{s}</li>)}</ul>
              </Block>
            )}
            {p.approach && <Block label="approach"><p>{p.approach}</p></Block>}
            {(p.outcome || p.metrics.length > 0) && (
              <Block label="outcome">
                {p.outcome && <p>{p.outcome}</p>}
                {p.metrics.length > 0 && (
                  <dl className={d.metrics}>
                    {p.metrics.map((m) => (
                      <div key={m.label}>
                        <dd>{m.value}</dd>
                        <dt className={r.mono}>{m.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}
              </Block>
            )}
            {(p.links.live || p.links.repo || p.links.caseStudy) && (
              <Block label="links">
                <div className={d.links}>
                  {p.links.live && <a className={r.btnLine} href={p.links.live} target="_blank" rel="noopener noreferrer">Live site <Arrow /></a>}
                  {p.links.repo && <a className={r.btnLine} href={p.links.repo} target="_blank" rel="noopener noreferrer">Source code <Arrow /></a>}
                  {p.links.caseStudy && <a className={r.btnLine} href={p.links.caseStudy} target="_blank" rel="noopener noreferrer">Full write-up <Arrow /></a>}
                </div>
              </Block>
            )}
          </div>

          {shots.length > 1 && (
            <div className={d.shots}>
              {shots.slice(1).map((m) => (
                <figure key={m.url} style={{ aspectRatio: aspect(m) }}>
                  <Pic img={m} rendition="card" sizes="(max-width: 900px) 100vw, 640px" loading="lazy" />
                </figure>
              ))}
            </div>
          )}

          <nav className={d.foot} aria-label="Case studies">
            {projects.length > 1 && (
              <>
                <button type="button" className={d.step} onClick={() => onNavigate(prev.slug)}>
                  <span className={r.mono}>previous</span>
                  <span className={d.stepName}>{prev.title}</span>
                </button>
                <button type="button" className={`${d.step} ${d.stepNext}`} onClick={() => onNavigate(next.slug)}>
                  <span className={r.mono}>next</span>
                  <span className={d.stepName}>{next.title}</span>
                </button>
              </>
            )}
            <button type="button" className={`${r.btn} ${d.contact}`} onClick={onContact}>
              Contact
            </button>
          </nav>
        </article>
      </div>
    </div>
  )
}
