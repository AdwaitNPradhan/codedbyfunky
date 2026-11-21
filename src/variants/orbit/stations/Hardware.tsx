'use client'

import Image from 'next/image'
import clsx from 'clsx'
import { CAP } from '../lib/config'
import { hardwareOf, HW_STATUS_LABEL } from '../lib/items'
import { useOrbit } from '../lib/store'
import { imgUrl, pad } from '../lib/util'
import { ArrowUpRight, BtnLink } from '../ui/bits'
import { Panel, Station, Title } from './Station'
import { Pager } from './Pager'
import s from '../orbit.module.css'

export function Hardware() {
  const { data, api, idx, flight } = useOrbit()
  const items = hardwareOf(data)
  const active = idx.hw
  if (!items.length) return null

  return (
    <Station i={4}>
      <Panel station={4} label="Hardware">
        <div className={clsx(s.copy, s.colR)}>
          <Title id="hw-title">Hardware</Title>
          <ol className={s.selector} data-rise aria-label="Hardware builds">
            {items.slice(0, flight ? CAP.hardware : items.length).map((h, i) => (
              <li key={h.id}>
                <button
                  type="button"
                  className={s.selBtn}
                  aria-current={i === active ? 'true' : undefined}
                  data-cursor="VIEW"
                  data-status={h.status}
                  onClick={() => api.toItem('hw', i)}
                  onPointerEnter={() => api.hoverKey(`hw:${i}`)}
                  onPointerLeave={() => api.hoverKey(null)}
                  onFocus={() => api.hoverKey(`hw:${i}`)}
                  onBlur={() => api.hoverKey(null)}
                >
                  <span className={s.selNum}>{pad(i + 1)}</span>
                  <span className={s.selName}>{h.title}</span>
                  <span className={clsx(s.status, s[`status_${h.status.replace('-', '')}`])}>{HW_STATUS_LABEL[h.status]}</span>
                </button>
              </li>
            ))}
          </ol>
          <Pager kind="hw" count={Math.min(items.length, CAP.hardware)} />

          <div className={s.stack} data-rise>
            {items.map((h, i) => (
              <article
                key={h.id}
                className={clsx(s.item, s.itemHw, h.status === 'planned' && s.planned, i >= CAP.hardware && s.extra)}
                data-active={i === active || !flight ? 'true' : 'false'}
                aria-labelledby={`hw-${h.slug}`}
              >
                {h.cover && (
                  <div className={s.itemCover}>
                    <Image
                      src={imgUrl(h.cover, 'card')}
                      alt={h.cover.alt || h.title}
                      width={h.cover.width}
                      height={h.cover.height}
                      sizes="(max-width: 767px) 90vw, 360px"
                      placeholder={h.cover.blur ? 'blur' : 'empty'}
                      blurDataURL={h.cover.blur}
                      loading="lazy"
                    />
                  </div>
                )}
                <h3 className={s.itemTitle} id={`hw-${h.slug}`}>
                  {h.title}{' '}
                  <span className={clsx(s.status, s[`status_${h.status.replace('-', '')}`])}>{HW_STATUS_LABEL[h.status]}</span>
                </h3>
                <p className={s.summary}>{h.summary}</p>
                <dl className={s.specs}>
                  {h.year && (
                    <div>
                      <dt>Year</dt>
                      <dd>{h.year}</dd>
                    </div>
                  )}
                  {h.components.length > 0 && (
                    <div>
                      <dt>Parts</dt>
                      <dd>{h.components.join(', ')}</dd>
                    </div>
                  )}
                  {h.tools.length > 0 && (
                    <div>
                      <dt>Tools</dt>
                      <dd>{h.tools.join(', ')}</dd>
                    </div>
                  )}
                </dl>
                {h.details && <p className={s.details}>{h.details}</p>}
                {(h.links.repo || h.links.video || h.links.writeup) && (
                  <div className={s.actions}>
                    {h.links.repo && (
                      <BtnLink href={h.links.repo} external cursor="OPEN">
                        Repo <ArrowUpRight />
                      </BtnLink>
                    )}
                    {h.links.writeup && (
                      <BtnLink href={h.links.writeup} external cursor="OPEN">
                        Write-up <ArrowUpRight />
                      </BtnLink>
                    )}
                    {h.links.video && (
                      <BtnLink href={h.links.video} external cursor="OPEN">
                        Video <ArrowUpRight />
                      </BtnLink>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </Panel>
    </Station>
  )
}

