'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import type { Photo, Settings } from '@/lib/types'
import { addCoins, award, bump } from '../lib/store'
import { sfx } from '../lib/sound'
import { cx, rng, track } from '../lib/misc'
import { Icon, SpinStamp, StickerArt } from './art'
import { Pic, Slab, SlabHead } from './Slab'

const INITIAL = 8

/** Polaroid wall: tilted, taped, click to flip to the caption. */
export function Photos({ photos, instagram }: { photos: Photo[]; instagram: Settings['instagram'] }) {
  const [all, setAll] = useState(false)
  const sorted = useMemo(() => [...photos].sort((a, b) => Number(b.featured) - Number(a.featured)), [photos])
  const shown = all ? sorted : sorted.slice(0, INITIAL)
  if (!photos.length) return null
  return (
    <>
      <Slab id="photos" tone="cream" labelledBy="photos-h">
        <SlabHead id="photos-h" title="Photography" count={photos.length}>
          <p className="ar-lede">When I am not shipping, I am shooting. Tap a polaroid to flip it and see the story.</p>
        </SlabHead>
        <ul className="ar-wall-photos">
          {shown.map((p, i) => (
            <Polaroid key={p.id} p={p} i={i} fallbackUrl={instagram.url} />
          ))}
        </ul>
        {sorted.length > INITIAL && (
          <p className="ar-more">
            <button type="button" className="ar-btn" aria-expanded={all} onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `More photos (${sorted.length - INITIAL})`}
            </button>
          </p>
        )}
      </Slab>
      <InstagramSlab ig={instagram} />
    </>
  )
}

function Polaroid({ p, i, fallbackUrl }: { p: Photo; i: number; fallbackUrl: string }) {
  const [flipped, setFlipped] = useState(false)
  const r = useMemo(() => {
    const g = rng(i * 53 + 5)
    return { rot: (g() - 0.5) * 8, tape: (g() - 0.5) * 24 }
  }, [i])
  const ig = p.instagramUrl || fallbackUrl
  const flip = () => {
    setFlipped((f) => !f)
    const n = bump('flips')
    if (n <= 12) addCoins(1)
    if (n >= 3) award('photo-flip')
    sfx.pop()
  }
  const meta = [p.camera, p.lens, p.exposure].filter(Boolean)
  return (
    <li className="ar-polaroid" style={{ '--r': `${r.rot}deg`, '--tape': `${r.tape}deg` } as CSSProperties}>
      <div className={cx('ar-flip', flipped && 'is-flipped')}>
        <div className="ar-flip__face ar-flip__front" inert={flipped}>
          <button type="button" className="ar-polaroid__btn" onClick={flip} aria-label={`${p.title}, ${p.location}. Flip for details`}>
            <span className="ar-polaroid__img">
              <Pic img={p.image} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 30vw, 300px" thumb alt={p.image.alt || `${p.title}, ${p.location}`} />
            </span>
            <span className="ar-polaroid__cap">{p.title}</span>
          </button>
          <span className="ar-tape" aria-hidden="true" />
        </div>
        <div className="ar-flip__face ar-flip__back" inert={!flipped}>
          <div className="ar-flip__text">
            <h3 className="ar-h3">{p.title}</h3>
            <p>{[p.location, p.series].filter(Boolean).join(' · ')}</p>
            {meta.length > 0 && <p className="ar-flip__meta">{meta.join(' · ')}</p>}
          </div>
          <div className="ar-flip__actions">
            {ig && (
              <a className="ar-btn ar-btn--sm ar-btn--pink" href={ig} target="_blank" rel="noopener noreferrer" onClick={() => track('cta_instagram', { where: 'polaroid' })}>
                <Icon name="instagram" size={16} /> Instagram
              </a>
            )}
            <button type="button" className="ar-btn ar-btn--sm" onClick={flip}>
              <Icon name="flip" size={16} /> Flip back
            </button>
          </div>
          <span className="ar-tape" aria-hidden="true" />
        </div>
      </div>
    </li>
  )
}

export function InstagramSlab({ ig, compact }: { ig: Settings['instagram']; compact?: boolean }) {
  if (!ig.url) return null
  return (
    <section className={cx('ar-slab ar-slab--pink ar-insta', compact && 'ar-insta--compact')} aria-label="Instagram">
      <div className="ar-wrap" data-slam="">
        <a className="ar-insta__link" href={ig.url} target="_blank" rel="noopener noreferrer" onClick={() => track('cta_instagram', { where: compact ? 'footer' : 'slab' })}>
          <SpinStamp className="ar-insta__stamp" />
          <StickerArt kind="arrow" tone="yellow" className="ar-insta__arrow" />
          <span className="ar-insta__big">
            Follow <span className="ar-insta__handle">{ig.handle || 'me'}</span> on Instagram
          </span>
          <span className="ar-insta__row">
            {ig.pitch && <span className="ar-insta__pitch">{ig.pitch}</span>}
            {ig.followers && <span className="ar-chip ar-chip--cream">{ig.followers} followers</span>}
            <span className="ar-btn ar-btn--yellow" aria-hidden="true">
              <Icon name="instagram" size={20} /> Open Instagram
            </span>
          </span>
        </a>
      </div>
    </section>
  )
}
