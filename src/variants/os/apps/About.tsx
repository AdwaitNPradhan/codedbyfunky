'use client'

import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { range, resumeFileName, social } from '../util'
import { CopyButton, Ext } from './common'
import ui from './apps.module.css'

export default function About(_: AppProps) {
  const os = useOS()
  const { data } = os
  const s = data.settings
  const gh = social(data, 'github')
  const li = social(data, 'linkedin')
  const ig = s.instagram.url || social(data, 'instagram')
  const avail = s.availability.status !== 'closed'
  const place = [s.location, s.timezone].filter(Boolean).join(' · ')

  return (
    <div className={`${ui.scroll} ${ui.about}`}>
      <header className={ui.aboutHead}>
        {s.avatar && (
          <div className={ui.avatar}>
            <Pic img={s.avatar} size="thumb" sizes="96px" alt="" priority />
          </div>
        )}
        <div className={ui.aboutIntro}>
          {avail && (
            <p className={ui.avail}>
              <span className={ui.pulse} aria-hidden="true" />
              <strong>
                {s.availability.status === 'open' ? 'Open to work' : 'Selective availability'}
              </strong>
              {s.availability.note ? (
                <span className={ui.availNote}>: {s.availability.note}</span>
              ) : null}
            </p>
          )}
          <h2 className={ui.hello}>
            <span className={ui.line}>Hi, I’m {s.name}.</span>{' '}
            <span className={ui.line}>I build software.</span>
          </h2>
          {s.roles.length > 0 && (
            <ul className={ui.roles} aria-label="Roles">
              {s.roles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <p className={ui.lede}>{s.tagline || s.shortBio}</p>
      <p className={ui.hint}>
        This desktop is the portfolio. Open an app from the dock, or type <code>help</code> in the
        Terminal.
      </p>

      <div className={ui.ctaRow}>
        <button
          type="button"
          className={`${ui.btn} ${ui.btnPrimary}`}
          onClick={() => os.open('files', { path: 'projects' })}
        >
          Open projects
        </button>
        {s.resumeUrl && (
          <a className={ui.btn} href={s.resumeUrl} download={resumeFileName(s.resumeUrl, s.name)}>
            Resume
          </a>
        )}
        <button type="button" className={ui.btn} onClick={() => os.open('mail')}>
          Hire me
        </button>
      </div>

      <ul className={ui.linkRow} aria-label="Links">
        {s.publicEmail && (
          <li className={ui.emailLine}>
            <a href={`mailto:${s.publicEmail}`}>{s.publicEmail}</a>
            <CopyButton text={s.publicEmail} label="Copy" className={ui.btnSm} />
          </li>
        )}
        {gh && (
          <li>
            <Ext href={gh}>GitHub</Ext>
          </li>
        )}
        {li && (
          <li>
            <Ext href={li}>LinkedIn</Ext>
          </li>
        )}
        {ig && (
          <li>
            <Ext href={ig}>Instagram {s.instagram.handle}</Ext>
          </li>
        )}
      </ul>

      {(place || s.stats.length > 0) && (
        <dl className={ui.facts}>
          {place && (
            <div>
              <dt>Based in</dt>
              <dd>{place}</dd>
            </div>
          )}
          {s.stats
            .filter((x) => x.value && x.label)
            .map((x) => (
              <div key={x.label}>
                <dt>{x.label}</dt>
                <dd>{x.value}</dd>
              </div>
            ))}
        </dl>
      )}

      {data.experience.length > 0 && (
        <section aria-labelledby="exp-h" className={ui.expBlock}>
          <h3 id="exp-h" className={ui.h3}>
            Experience
          </h3>
          <div className={ui.accordion}>
            {data.experience.map((e, i) => (
              <details key={e.id} name="os-exp" open={i === 0}>
                <summary>
                  <span className={ui.expRole}>
                    {e.role}
                    <span className={ui.expOrg}> · {e.org}</span>
                  </span>
                  <span className={ui.expYears}>{range(e.start, e.end)}</span>
                </summary>
                <div className={ui.expBody}>
                  {e.summary && <p>{e.summary}</p>}
                  {e.highlights.length > 0 && (
                    <ul>
                      {e.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <p className={ui.plainLink}>
        <button type="button" className={ui.linkBtn} onClick={os.plain}>
          Prefer plain text? See everything as a normal page →
        </button>
      </p>
    </div>
  )
}
