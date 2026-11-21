'use client'

import Image from 'next/image'
import clsx from 'clsx'
import { CAP } from '../lib/config'
import { photosOf } from '../lib/items'
import { useOrbit } from '../lib/store'
import { imgUrl, monthYear, track } from '../lib/util'
import { ArrowUpRight, Btn, BtnLink } from '../ui/bits'
import { EmptyStation, Panel, Station, Title } from './Station'
import { Pager } from './Pager'
import s from '../orbit.module.css'

export const igHandle = (h: string) => (h.startsWith('@') ? h : `@${h}`)

export function Photography() {
  const { data, api, idx, flight } = useOrbit()
  const photos = photosOf(data)
  const ig = data.settings.instagram
  const active = idx.photo
  if (!photos.length && !ig.url) return <EmptyStation i={2} title="Photography" />

  return (
    <Station i={2}>
      <Panel station={2} label="Photography">
        <div className={clsx(s.copy, s.colR)}>
          <Title id="photo-title">Photography</Title>

          <div className={clsx(s.stack, s.stackPhoto)} data-rise>
            {photos.map((p, i) => (
              <article
                key={p.id}
                className={clsx(s.item, i >= CAP.photos && s.extra)}
                data-active={i === active || !flight ? 'true' : 'false'}
                aria-labelledby={`photo-${p.id}`}
              >
                <div className={s.itemCover}>
                  <button type="button" className={s.coverBtn} onClick={() => api.openPhoto(i)} aria-label={`View photo: ${p.title}`} tabIndex={flight ? -1 : 0}>
                    <Image
                      src={imgUrl(p.image, 'card')}
                      alt={p.image.alt || p.title}
                      width={p.image.width}
                      height={p.image.height}
                      sizes="(max-width: 767px) 90vw, 360px"
                      placeholder={p.image.blur ? 'blur' : 'empty'}
                      blurDataURL={p.image.blur}
                      loading="lazy"
                    />
                  </button>
                </div>
                <h3 className={s.itemTitle} id={`photo-${p.id}`}>
                  {p.title}
                </h3>
                <p className={s.place}>
                  {[p.location, monthYear(p.takenAt), p.series].filter(Boolean).join(' · ')}
                </p>
                {(p.camera || p.lens || p.exposure) && (
                  <dl className={s.exif}>
                    {p.camera && (
                      <div>
                        <dt>Camera</dt>
                        <dd>{p.camera}</dd>
                      </div>
                    )}
                    {p.lens && (
                      <div>
                        <dt>Lens</dt>
                        <dd>{p.lens}</dd>
                      </div>
                    )}
                    {p.exposure && (
                      <div>
                        <dt>Exposure</dt>
                        <dd>{p.exposure}</dd>
                      </div>
                    )}
                  </dl>
                )}
                <div className={s.actions}>
                  <Btn cursor="VIEW" onClick={() => api.openPhoto(i)}>
                    View photo
                  </Btn>
                </div>
              </article>
            ))}
          </div>

          <Pager kind="photo" count={Math.min(photos.length, CAP.photos)} />

          {ig.url && (
            <div className={s.ig} data-rise>
              <BtnLink href={ig.url} external variant="primary" magnetic cursor="OPEN" onClick={() => track('cta_instagram', { where: 'photography' })}>
                Follow {igHandle(ig.handle)} <ArrowUpRight />
              </BtnLink>
              {(ig.pitch || ig.followers) && (
                <p className={s.igPitch}>
                  {ig.pitch}
                  {ig.followers && <span className={s.igFollowers}> {ig.followers} followers</span>}
                </p>
              )}
            </div>
          )}
        </div>
      </Panel>
    </Station>
  )
}
