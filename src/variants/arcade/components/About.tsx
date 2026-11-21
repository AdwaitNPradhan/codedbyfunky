'use client'

import { useRef, useState } from 'react'
import type { Settings } from '@/lib/types'
import { cx, track, type Tone } from '../lib/misc'
import { StickerArt } from './art'
import { DragCard } from './DragCard'
import { Pic, Slab, SlabHead } from './Slab'

const FACT_TONES: Tone[] = ['mint', 'pink', 'blue']
const FACT_ROT = [-3, 2, -1.5]

/** ID card: portrait, key facts, short bio. Fact cards are draggable (and keyboard nudgeable). */
export function About({ s }: { s: Settings }) {
  const [more, setMore] = useState(false)
  const board = useRef<HTMLDivElement>(null)
  const facts = s.stats.filter((x) => x.value && x.label).slice(0, 3)
  const extra = s.longBio
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter(Boolean)
  const statusText =
    s.availability.status === 'open'
      ? 'Open to work'
      : s.availability.status === 'selective'
        ? 'Selectively open'
        : 'Not looking right now'

  return (
    <Slab id="about" tone="cream" labelledBy="about-h">
      <SlabHead id="about-h" title="About me" />
      <div className="ar-id" ref={board}>
        <div className="ar-id__card">
          <div className="ar-id__strip">
            <span>ID CARD</span>
            <span>{s.handle}</span>
          </div>
          <div className="ar-id__grid">
            <div className="ar-id__photo">
              <Pic
                img={s.avatar}
                sizes="(max-width: 900px) 60vw, 320px"
                priority={false}
                alt={s.avatar?.alt || `Portrait of ${s.name}`}
              />
              <StickerArt kind="star" tone="yellow" className="ar-id__sticker ar-id__sticker--1" />
              <StickerArt kind="smile" tone="pink" className="ar-id__sticker ar-id__sticker--2" />
            </div>
            <dl className="ar-id__fields">
              <div>
                <dt>NAME</dt>
                <dd className="ar-id__name">{s.name}</dd>
              </div>
              {s.roles.length > 0 && (
                <div>
                  <dt>ROLE</dt>
                  <dd>{s.roles.join(' · ')}</dd>
                </div>
              )}
              {s.location && (
                <div>
                  <dt>BASED IN</dt>
                  <dd>
                    {s.location}
                    {s.timezone ? ` · ${s.timezone}` : ''}
                  </dd>
                </div>
              )}
              <div>
                <dt>STATUS</dt>
                <dd>
                  <span
                    className={cx(
                      'ar-chip',
                      s.availability.status === 'open' ? 'ar-chip--mint' : 'ar-chip--cream',
                    )}
                  >
                    {s.availability.status !== 'closed' && (
                      <span className="ar-dot" aria-hidden="true" />
                    )}{' '}
                    {statusText}
                  </span>
                  {s.availability.note && (
                    <span className="ar-id__note">{s.availability.note}</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="ar-id__bio">
          <p className="ar-lede ar-lede--big">{s.shortBio}</p>
          {extra.length > 0 && (
            <>
              <div id="about-more" hidden={!more} className="ar-id__more">
                {extra.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <button
                type="button"
                className="ar-btn ar-btn--sm"
                aria-expanded={more}
                aria-controls="about-more"
                onClick={() => (setMore((v) => !v), track('about_more'))}
              >
                {more ? 'Less about me' : 'More about me'}
              </button>
            </>
          )}
        </div>

        {facts.length > 0 && (
          <ul className="ar-facts" aria-label="Facts">
            {facts.map((f, i) => (
              <DragCard
                as="li"
                key={f.label}
                id={`fact-${i}`}
                rest={FACT_ROT[i]}
                constraints={board}
                touchDrag
                className={cx('ar-fact', `tone-${FACT_TONES[i]}`)}
              >
                <strong>{f.value}</strong>
                <span>{f.label}</span>
              </DragCard>
            ))}
          </ul>
        )}
      </div>
    </Slab>
  )
}
