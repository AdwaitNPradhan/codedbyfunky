'use client'

import { useEffect, useRef, useState } from 'react'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty } from './common'
import ui from './apps.module.css'

/** A CMS project shown as an installed application: icon, Launch, screenshots, details. */
export default function Product({ props }: AppProps) {
  const os = useOS()
  const p = os.data.projects.find((x) => x.slug === props.slug)
  const [shot, setShot] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'launching' | 'done'>('idle')
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  if (!p) return <Empty>That app is no longer installed.</Empty>

  const icon = p.appIcon ?? p.cover
  const shots = p.gallery.length ? p.gallery : p.cover ? [p.cover] : []
  const live = p.links.live
  const primary = live ?? p.links.repo
  const facts: [string, string][] = [
    ['Role', p.role],
    ['Year', p.year ? String(p.year) : ''],
    ['Client', p.client],
    ['Built with', p.stack.length ? `${p.stack.length} technologies` : ''],
  ]

  // External sites usually refuse to be framed, so Launch opens a new tab after a short splash.
  const launch = () => {
    if (!primary || phase === 'launching') return
    setPhase('launching')
    t.current = setTimeout(
      () => {
        window.open(primary, '_blank', 'noopener,noreferrer')
        setPhase('done')
      },
      os.reduced ? 250 : 900,
    )
  }

  return (
    <article
      className={`${ui.scroll} ${ui.product}`}
      aria-label={`${p.title}, installed app`}
      style={p.accent ? ({ '--app': p.accent } as React.CSSProperties) : undefined}
    >
      <header className={ui.pHead}>
        <div className={ui.pIcon} aria-hidden="true">
          {icon ? <Pic img={icon} size="card" sizes="96px" alt="" priority /> : <span>{p.title.slice(0, 1)}</span>}
        </div>
        <div className={ui.pTitleBox}>
          <h2 className={ui.pTitle}>{p.title}</h2>
          <p className={ui.pSummary}>{p.summary}</p>
          <div className={ui.ctaRow} style={{ margin: '10px 0 0' }}>
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={!primary || phase === 'launching'}
              onClick={launch}
            >
              {!primary ? 'Not live yet' : phase === 'launching' ? 'Launching…' : live ? 'Launch ↗' : 'View source ↗'}
            </button>
            {live && p.links.repo && (
              <a className={ui.btn} href={p.links.repo} target="_blank" rel="noopener noreferrer">
                Repo ↗
              </a>
            )}
            <button type="button" className={ui.btn} onClick={() => os.open('preview', { slug: p.slug })}>
              Case study
            </button>
            <button type="button" className={ui.btn} onClick={() => os.share('product', { slug: p.slug })}>
              Share
            </button>
          </div>
          {phase === 'done' && primary && (
            <p className={ui.dim} role="status" style={{ margin: '8px 0 0', fontSize: 13 }}>
              Opened in a new tab. Nothing happened?{' '}
              <a href={primary} target="_blank" rel="noopener noreferrer">
                Open it here ↗
              </a>
            </p>
          )}
        </div>
      </header>

      <dl className={ui.pFacts}>
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      {shots.length > 0 && (
        <section aria-label="Screenshots" className={ui.pShots}>
          <div className={ui.pShot}>
            <Pic key={shot} img={shots[shot]} size="hero" sizes="(max-width: 760px) 100vw, 780px" fit="cover" />
          </div>
          {shots.length > 1 && (
            <ul className={ui.pThumbs}>
              {shots.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    aria-label={`Screenshot ${i + 1} of ${shots.length}`}
                    aria-current={i === shot ? 'true' : undefined}
                    onClick={() => setShot(i)}
                  >
                    <Pic img={s} size="thumb" sizes="96px" alt="" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {p.metrics.length > 0 && (
        <dl className={ui.metrics}>
          {p.metrics.map((x) => (
            <div key={x.label}>
              <dd>{x.value}</dd>
              <dt>{x.label}</dt>
            </div>
          ))}
        </dl>
      )}
      {(
        [
          ['What it is for', p.problem],
          ['How it works', p.approach],
          ['What changed', p.outcome],
        ] as const
      ).map(([h, text]) =>
        text ? (
          <section key={h}>
            <h3 className={ui.h3}>{h}</h3>
            <p>{text}</p>
          </section>
        ) : null,
      )}
      {p.stack.length > 0 && (
        <ul className={ui.chips} aria-label="Built with">
          {p.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}

      {phase === 'launching' && (
        <div className={ui.pSplash} role="status">
          <div className={ui.pIcon} aria-hidden="true">
            {icon ? <Pic img={icon} size="card" sizes="96px" alt="" /> : <span>{p.title.slice(0, 1)}</span>}
          </div>
          <p>Launching {p.title}…</p>
          <span className={ui.bTrack} aria-hidden="true">
            <i />
          </span>
        </div>
      )}
    </article>
  )
}
