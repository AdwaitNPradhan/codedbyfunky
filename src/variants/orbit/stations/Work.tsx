'use client'

import Image from 'next/image'
import clsx from 'clsx'
import { CAP } from '../lib/config'
import { projectsOf } from '../lib/items'
import { useOrbit } from '../lib/store'
import { imgUrl, pad } from '../lib/util'
import { ArrowRight, ArrowUpRight, Btn, BtnLink, Chip } from '../ui/bits'
import { EmptyStation, Panel, Station, Title } from './Station'
import { Pager } from './Pager'
import s from '../orbit.module.css'

export function Work() {
  const { data, api, idx, flight } = useOrbit()
  const items = projectsOf(data)
  const shown = flight ? Math.min(items.length, CAP.projects) : items.length
  const active = idx.project

  if (!items.length) return <EmptyStation i={1} title="Work" />
  return (
    <Station i={1}>
      <Panel station={1} label="Projects">
        <div className={clsx(s.copy, s.colL)}>
          <Title id="work-title">Work</Title>

          <ol className={s.selector} data-rise aria-label="Projects">
            {items.slice(0, shown).map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={s.selBtn}
                  aria-current={i === active ? 'true' : undefined}
                  data-cursor="VIEW"
                  onClick={() => api.toItem('project', i)}
                  onPointerEnter={() => api.hoverKey(`project:${i}`)}
                  onPointerLeave={() => api.hoverKey(null)}
                  onFocus={() => api.hoverKey(`project:${i}`)}
                  onBlur={() => api.hoverKey(null)}
                >
                  <span className={s.selNum}>{pad(i + 1)}</span>
                  <span className={s.selName}>{p.title}</span>
                  {p.year && <span className={s.selMeta}>{p.year}</span>}
                </button>
              </li>
            ))}
          </ol>
          <Pager kind="project" count={Math.min(items.length, CAP.projects)} />

          <div className={s.stack} data-rise>
            {items.map((p, i) => {
              const isActive = i === active
              return (
                <article
                  key={p.id}
                  className={clsx(s.item, i >= CAP.projects && s.extra)}
                  data-active={isActive || !flight ? 'true' : 'false'}
                  aria-labelledby={`proj-${p.slug}`}
                >
                  {p.cover && (
                    <div className={s.itemCover}>
                      <Image
                        src={imgUrl(p.cover, 'card')}
                        alt={p.cover.alt || p.title}
                        width={p.cover.width}
                        height={p.cover.height}
                        sizes="(max-width: 767px) 90vw, 360px"
                        placeholder={p.cover.blur ? 'blur' : 'empty'}
                        blurDataURL={p.cover.blur}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <h3 className={s.itemTitle} id={`proj-${p.slug}`}>
                    {p.title}
                  </h3>
                  <p className={s.summary}>{p.summary}</p>
                  <dl className={s.facts}>
                    {p.role && (
                      <div>
                        <dt>Role</dt>
                        <dd>{p.role}</dd>
                      </div>
                    )}
                    {p.year && (
                      <div>
                        <dt>Year</dt>
                        <dd>{p.year}</dd>
                      </div>
                    )}
                    {p.client && (
                      <div>
                        <dt>For</dt>
                        <dd>{p.client}</dd>
                      </div>
                    )}
                  </dl>
                  {p.stack.length > 0 && (
                    <ul className={s.chips} aria-label="Stack">
                      {p.stack.slice(0, 6).map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </ul>
                  )}
                  <div className={s.actions}>
                    <Btn variant="primary" magnetic cursor="OPEN" onClick={() => api.openProject(p.slug)} aria-label={`Case study: ${p.title}`}>
                      Case study <ArrowRight />
                    </Btn>
                    {p.links.live && (
                      <BtnLink href={p.links.live} external cursor="OPEN">
                        Live <ArrowUpRight />
                      </BtnLink>
                    )}
                    {p.links.repo && (
                      <BtnLink href={p.links.repo} external cursor="OPEN">
                        Repo <ArrowUpRight />
                      </BtnLink>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {flight && items.length > CAP.projects && (
            <p className={s.note}>
              Showing {CAP.projects} of {items.length}.{' '}
              <button type="button" className={s.linkBtn} onClick={api.showAll}>
                Plain view lists everything
              </button>
            </p>
          )}
        </div>
      </Panel>
    </Station>
  )
}
