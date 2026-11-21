'use client'

import { useEffect, useState } from 'react'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { Empty, Ext, StatusChip } from './common'
import ui from './apps.module.css'

type Tab = 'overview' | 'specs' | 'log'
const STEPS = ['planned', 'in-progress', 'built'] as const

export default function Lab({ props }: AppProps) {
  const os = useOS()
  const items = os.data.hardware
  const [slug, setSlug] = useState(props.slug || items[0]?.slug)
  const [tab, setTab] = useState<Tab>('overview')
  useEffect(() => {
    if (props.slug) setSlug(props.slug)
  }, [props.slug])
  useEffect(() => setTab('overview'), [slug])
  const h = items.find((x) => x.slug === slug) ?? items[0]
  if (!h) return <Empty>No hardware projects in the CMS yet.</Empty>
  const planned = h.status === 'planned'
  const step = STEPS.indexOf(h.status)

  return (
    <div className={ui.lab}>
      <nav className={ui.labList} aria-label="Hardware projects">
        {items.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`${ui.labItem} ${x.status === 'planned' ? ui.dashed : ''}`}
            aria-current={x.slug === h.slug ? 'true' : undefined}
            onClick={() => setSlug(x.slug)}
          >
            <span className={ui.labName}>{x.title}</span>
            <StatusChip status={x.status} />
          </button>
        ))}
      </nav>
      <article className={`${ui.labMain} ${planned ? ui.dashedBox : ''}`}>
        <header className={ui.labHead}>
          <h2 className={ui.pvTitle}>{h.title}</h2>
          <StatusChip status={h.status} />
          {h.year ? <span className={ui.dim}>{h.year}</span> : null}
        </header>
        {planned && <p className={ui.notBuilt}>not yet built</p>}
        <ol className={ui.steps} aria-label="Build status">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined} className={i <= step ? ui.stepOn : ''}>
              {s === 'in-progress' ? 'in progress' : s}
            </li>
          ))}
        </ol>
        <div role="tablist" aria-label="Project sections" className={ui.tabs}>
          {(
            [
              ['overview', 'Overview'],
              ['specs', 'Specs'],
              ['log', 'Build log'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" id={`lab-t-${id}`} aria-selected={tab === id} aria-controls="lab-panel" tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-t-${tab}`} className={ui.tabPanel}>
          {tab === 'overview' && (
            <>
              {h.cover && (
                <div className={ui.cover}>
                  <Pic img={h.cover} size="card" sizes="(max-width: 700px) 100vw, 520px" />
                </div>
              )}
              <p>{h.summary}</p>
              <div className={ui.ctaRow}>
                {h.links.repo && (
                  <Ext href={h.links.repo} className={ui.btn}>
                    Repo ↗
                  </Ext>
                )}
                {h.links.video && (
                  <Ext href={h.links.video} className={ui.btn}>
                    Video ↗
                  </Ext>
                )}
                {h.links.writeup && (
                  <Ext href={h.links.writeup} className={ui.btn}>
                    Write-up ↗
                  </Ext>
                )}
              </div>
            </>
          )}
          {tab === 'specs' && (
            <dl className={ui.specs}>
              <div>
                <dt>Status</dt>
                <dd>{h.status === 'in-progress' ? 'in progress' : h.status}</dd>
              </div>
              {h.year ? (
                <div>
                  <dt>Year</dt>
                  <dd>{h.year}</dd>
                </div>
              ) : null}
              {h.components.length > 0 && (
                <div>
                  <dt>Components</dt>
                  <dd>
                    <ul className={ui.chips}>
                      {h.components.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              {h.tools.length > 0 && (
                <div>
                  <dt>Tools</dt>
                  <dd>
                    <ul className={ui.chips}>
                      {h.tools.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {tab === 'log' && (
            <>
              {h.details ? <p className={ui.preWrap}>{h.details}</p> : <Empty>No build log yet.</Empty>}
              {h.gallery.length > 0 && (
                <div className={ui.pvGallery}>
                  {h.gallery.slice(0, 4).map((g, i) => (
                    <div key={i} className={ui.pvShot}>
                      <Pic img={g} size="card" sizes="(max-width: 700px) 50vw, 240px" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </article>
    </div>
  )
}
