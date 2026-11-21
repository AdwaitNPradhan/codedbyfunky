'use client'

import type { SiteData } from '@/lib/types'
import { track } from './engine'
import { aspect, featuredFirst, localSrc, pad2, Pic, useDarkroom } from './lib'
import s from './story.module.css'
import r from './root.module.css'

/** Hand-drawn loop. Drawn on by DrawSVG when the row enters (see useGrease in index). */
export function GreaseCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 100" aria-hidden="true">
      <path
        data-grease
        d="M78 6C118 1 147 22 143 50 139 80 96 97 52 91 13 85 1 52 9 32 17 11 50 7 82 8 100 8 113 14 121 22"
        fill="none"
        stroke="var(--safelight)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GreaseCross({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path data-grease d="M4 5C9 9 15 15 20 19M19 4C14 9 9 15 5 20" fill="none" stroke="var(--safelight)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function About({ data }: { data: SiteData }) {
  const { settings, photos } = data
  const { openPhoto } = useDarkroom()
  const frames = featuredFirst(photos).slice(0, 6)
  const paras = settings.longBio.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const pick = Math.min(2, frames.length - 1)

  return (
    <section id="about" className={`${r.section} ${s.about}`} data-section="about" aria-labelledby="about-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="about-h" className={r.title}>About</h2>
          {settings.location && <p className={r.caption}>based in {settings.location.toLowerCase()}</p>}
        </div>

        <div className={s.aboutGrid}>
          {frames.length > 0 && (
            <ul className={s.miniSheet} aria-label="Selected frames">
              {frames.map((ph, i) => (
                <li key={ph.id} style={{ '--ar': aspect(ph.image) } as React.CSSProperties}>
                  <a
                    href={`#photo-${ph.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      openPhoto(ph.id, e.currentTarget)
                    }}
                    aria-label={`Open ${ph.title}`}
                  >
                    <span className={s.miniFrame} data-frame data-photo-id={ph.id} data-loupe="" data-src={localSrc(ph.image.card ?? ph.image.url)}>
                      <Pic img={ph.image} rendition="thumb" sizes="(max-width: 900px) 30vw, 14vw" />
                      {i === pick && <GreaseCircle className={s.circle} />}
                    </span>
                    <span className={`${r.mono} ${s.frameNo}`}>{pad2(i + 1)}A</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className={s.aboutText}>
            <p className={s.lead}>{settings.shortBio}</p>
            {paras.map((p) => (
              <p key={p} className={s.bodyP}>{p}</p>
            ))}
            <div className={s.aboutLinks}>
              {settings.resumeUrl && (
                <a href={settings.resumeUrl} download className={r.link} onClick={() => track('cta_resume', { where: 'about' })}>
                  Resume (PDF)
                </a>
              )}
              {settings.publicEmail && (
                <a href={`mailto:${settings.publicEmail}`} className={r.link}>{settings.publicEmail}</a>
              )}
            </div>
            {settings.stats.length > 0 && (
              <dl className={s.stats}>
                {settings.stats.map((st) => (
                  <div key={st.label}>
                    <dt className={r.mono}>{st.label}</dt>
                    <dd>{st.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
