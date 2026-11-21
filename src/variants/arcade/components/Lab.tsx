'use client'

import { useMemo } from 'react'
import type { HardwareProject } from '@/lib/types'
import { cx, hostOf, toneAt, track } from '../lib/misc'
import { Icon } from './art'
import { Pic, Slab, SlabHead } from './Slab'

const STATUS = { built: 'BUILT', 'in-progress': 'IN PROGRESS', planned: 'COMING SOON' } as const
const RANK = { built: 0, 'in-progress': 1, planned: 2 } as const

/** Gadget drawer: hardware builds with spec stickers and a build-log accordion. */
export function Lab({ hardware }: { hardware: HardwareProject[] }) {
  const items = useMemo(() => [...hardware].sort((a, b) => RANK[a.status] - RANK[b.status]), [hardware])
  if (!hardware.length) return null
  return (
    <Slab id="lab" tone="mint" labelledBy="lab-h">
      <SlabHead id="lab-h" title="Lab" count={hardware.length}>
        <p className="ar-lede">Soldering iron, 3D printer, a drawer full of microcontrollers. Hover a card and the LED wakes up.</p>
      </SlabHead>
      <div className="ar-drawer">
        <div className="ar-drawer__front" aria-hidden="true">
          <span className="ar-drawer__plate">GADGETS</span>
          <span className="ar-drawer__handle" />
        </div>
        <ul className="ar-drawer__grid">
          {items.map((h, i) => (
            <li key={h.id} className={cx('ar-hw', `tone-${toneAt(i + 3)}`, h.status === 'planned' && 'is-planned')} style={{ '--r': `${i % 2 ? 0.8 : -0.8}deg` } as React.CSSProperties}>
              <article aria-labelledby={`hw-${h.id}`}>
                <div className="ar-hw__cover">
                  <Pic img={h.cover} sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 420px" alt={h.cover?.alt || `${h.title} build`} />
                  <span className="ar-hw__status">
                    <span className="ar-led" aria-hidden="true" />
                    {STATUS[h.status]}
                  </span>
                  {h.status === 'planned' && <span className="ar-hw__soon" aria-hidden="true">COMING SOON</span>}
                </div>
                <div className="ar-hw__body">
                  <h3 id={`hw-${h.id}`} className="ar-h3">
                    {h.title} {h.year ? <span className="ar-hw__year">{h.year}</span> : null}
                  </h3>
                  <p>{h.summary}</p>
                  {h.components.length > 0 && (
                    <ul className="ar-specs" aria-label="Parts">
                      {h.components.slice(0, 4).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                      {h.components.length > 4 && <li>+{h.components.length - 4}</li>}
                    </ul>
                  )}
                  {(h.details || h.tools.length > 0 || h.links.repo || h.links.video || h.links.writeup) && (
                    <details className="ar-log" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track('build_log_open', { slug: h.slug })}>
                      <summary>Build log</summary>
                      <div className="ar-log__body">
                        {h.details && <p>{h.details}</p>}
                        {h.tools.length > 0 && (
                          <p>
                            <strong>Tools:</strong> {h.tools.join(', ')}
                          </p>
                        )}
                        <p className="ar-log__links">
                          {h.links.repo && (
                            <a href={h.links.repo} target="_blank" rel="noopener noreferrer">
                              Repo ({hostOf(h.links.repo)}) <Icon name="external" size={14} />
                            </a>
                          )}
                          {h.links.video && (
                            <a href={h.links.video} target="_blank" rel="noopener noreferrer">
                              Video <Icon name="external" size={14} />
                            </a>
                          )}
                          {h.links.writeup && (
                            <a href={h.links.writeup} target="_blank" rel="noopener noreferrer">
                              Write-up <Icon name="external" size={14} />
                            </a>
                          )}
                        </p>
                      </div>
                    </details>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </Slab>
  )
}
