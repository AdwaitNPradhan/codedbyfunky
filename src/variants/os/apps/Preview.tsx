'use client'

import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty, Ext } from './common'
import ui from './apps.module.css'

export default function Preview({ props }: AppProps) {
  const os = useOS()
  const p = os.data.projects.find((x) => x.slug === props.slug)
  if (!p) return <Empty>That project is no longer in the CMS.</Empty>
  const meta = [p.role, p.client, p.year ? String(p.year) : ''].filter(Boolean)
  return (
    <article className={`${ui.scroll} ${ui.preview}`} aria-label={`${p.title} case study`}>
      {p.cover && (
        <div className={ui.cover}>
          <Pic img={p.cover} size="card" sizes="(max-width: 760px) 100vw, 700px" priority />
        </div>
      )}
      <div className={ui.pvBody}>
        <h2 className={ui.pvTitle}>{p.title}</h2>
        <p className={ui.pvSummary}>{p.summary}</p>
        {meta.length > 0 && <p className={ui.pvMeta}>{meta.join(' · ')}</p>}
        {p.stack.length > 0 && (
          <ul className={ui.chips} aria-label="Stack">
            {p.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
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
        {p.problem && (
          <section>
            <h3 className={ui.h3}>Problem</h3>
            <p>{p.problem}</p>
          </section>
        )}
        {p.role && (
          <section>
            <h3 className={ui.h3}>Role</h3>
            <p>{p.role}</p>
          </section>
        )}
        {p.approach && (
          <section>
            <h3 className={ui.h3}>Approach</h3>
            <p>{p.approach}</p>
          </section>
        )}
        {p.outcome && (
          <section>
            <h3 className={ui.h3}>Outcome</h3>
            <p>{p.outcome}</p>
          </section>
        )}
        {p.gallery.length > 0 && (
          <div className={ui.pvGallery}>
            {p.gallery.slice(0, 4).map((g, i) => (
              <div key={i} className={ui.pvShot}>
                <Pic img={g} size="card" sizes="(max-width: 760px) 50vw, 320px" />
              </div>
            ))}
          </div>
        )}
        <div className={ui.ctaRow}>
          {p.links.live && (
            <Ext href={p.links.live} className={`${ui.btn} ${ui.btnPrimary}`}>
              Live ↗
            </Ext>
          )}
          {p.links.repo && (
            <Ext href={p.links.repo} className={ui.btn}>
              Repo ↗
            </Ext>
          )}
          {p.links.caseStudy && (
            <Ext href={p.links.caseStudy} className={ui.btn}>
              Full write-up ↗
            </Ext>
          )}
          <button
            type="button"
            className={ui.btn}
            onClick={() => os.open('mail', { subject: `About ${p.title}` })}
          >
            Hire me
          </button>
        </div>
      </div>
    </article>
  )
}
