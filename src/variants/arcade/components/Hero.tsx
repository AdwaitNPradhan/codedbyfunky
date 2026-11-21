'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { animate, m, useMotionValue } from 'motion/react'
import type { Settings } from '@/lib/types'
import { loadGsap } from '../lib/gsap'
import { cx, rng, track, useReduced, whenIntroDone, type Tone } from '../lib/misc'
import { CardGlyph, HireBadge, Icon, StickerArt, type StickerKind } from './art'
import { DragCard } from './DragCard'

type CardDef = {
  key: 'about' | 'work' | 'play' | 'photos'
  label: string
  sub: string
  href: string
  tone: Tone
  rest: number
}

// Two fixed lines: the H1 height must not depend on font metrics (no layout shift when the font swaps in).
const LINES: Array<Array<{ t: string; mark?: 'pink' | 'ink' }>> = [
  [{ t: 'I' }, { t: 'make' }, { t: 'software,' }],
  [{ t: 'games', mark: 'pink' }, { t: '&' }, { t: 'gadgets.', mark: 'ink' }],
]
const SPRING = { type: 'spring', stiffness: 260, damping: 18, mass: 0.9 } as const
const ROTS = [-6, -2, 3, 5]

type StickerDef = { kind: StickerKind | 'hire'; tone: Tone; rest: number; pos: string }
const STICKERS: StickerDef[] = [
  { kind: 'star', tone: 'blue', rest: -12, pos: 'ar-st-1' },
  { kind: 'burst', tone: 'pink', rest: 8, pos: 'ar-st-2' },
  { kind: 'smile', tone: 'mint', rest: -6, pos: 'ar-st-3' },
  { kind: 'arrow', tone: 'lilac', rest: 14, pos: 'ar-st-4' },
  { kind: 'hire', tone: 'pink', rest: -10, pos: 'ar-st-5' },
]

function availabilityLabel(a: Settings['availability']) {
  if (a.status === 'open') return 'Open to work'
  if (a.status === 'selective') return 'Selectively open'
  return null
}

export function Hero({
  s,
  gameCount,
  photoCount,
}: {
  s: Settings
  gameCount: number
  photoCount: number
}) {
  const reduced = useReduced()
  const heroRef = useRef<HTMLElement>(null)
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const [shuffleKey, setShuffleKey] = useState(0)
  const avail = availabilityLabel(s.availability)
  const role = s.roles[0]

  const cards: CardDef[] = [
    {
      key: 'about',
      label: 'About',
      sub: 'Meet the human',
      href: '#about',
      tone: 'lilac',
      rest: ROTS[0],
    },
    {
      key: 'work',
      label: 'Work',
      sub: 'Projects and case studies',
      href: '#work',
      tone: 'pink',
      rest: ROTS[2],
    },
    {
      key: 'play',
      label: 'Play',
      sub: gameCount ? `${gameCount} games, playable here` : 'Arcade corner',
      href: '#play',
      tone: 'mint',
      rest: ROTS[1],
    },
    {
      key: 'photos',
      label: 'Photos',
      sub: photoCount ? `${photoCount} frames on the wall` : 'Polaroid wall',
      href: '#photos',
      tone: 'blue',
      rest: ROTS[3],
    },
  ]

  // H1 words slam in once the intro veil lifts (visible and readable without JS).
  useEffect(() => {
    if (reduced) return
    const words = h1Ref.current?.querySelectorAll<HTMLElement>('.ar-word')
    if (!words?.length) return
    let cancelled = false
    let tween: { kill: () => void } | null = null
    let off = () => {}
    loadGsap().then(({ gsap }) => {
      if (cancelled) return
      gsap.set(words, { y: 60, rotate: 2, transformOrigin: '0% 100%' })
      off = whenIntroDone(() => {
        tween = gsap.to(words, {
          y: 0,
          rotate: 0,
          duration: 0.5,
          ease: 'back.out(1.7)',
          stagger: 0.06,
          delay: 0.1,
          clearProps: 'transform',
        })
      })
    })
    return () => {
      cancelled = true
      off()
      tween?.kill()
    }
  }, [reduced])

  return (
    <section
      id="top"
      ref={heroRef}
      className="ar-slab ar-slab--yellow ar-hero"
      aria-label="Introduction"
    >
      <div className="ar-wrap ar-hero__grid">
        <div className="ar-hero__copy">
          <h1 ref={h1Ref} className="ar-h1">
            <span className="sr-only">{s.name}: I make software, games and gadgets.</span>
            <span aria-hidden="true">
              {LINES.map((line, li) => (
                <span key={li} className="ar-line">
                  {line.map((w, i) => (
                    <Fragment key={i}>
                      <span className={cx('ar-word', w.mark && `ar-word--${w.mark}`)}>{w.t}</span>{' '}
                    </Fragment>
                  ))}
                </span>
              ))}
            </span>
          </h1>
          <p className="ar-hero__sub">
            Hi, I’m <strong>{s.name}</strong>
            {role ? <>, a {role.toLowerCase()}</> : null}. {s.tagline}
          </p>
          <ul className="ar-hero__facts" aria-label="At a glance">
            {avail && (
              <li className="ar-chip ar-chip--mint">
                <span className="ar-dot" aria-hidden="true" /> {avail}
              </li>
            )}
            {s.location && (
              <li className="ar-chip">
                {s.location}
                {s.timezone ? ` · ${s.timezone}` : ''}
              </li>
            )}
          </ul>
          <div className="ar-hero__actions">
            <a className="ar-btn ar-btn--ink" href="#work" onClick={() => track('cta_work')}>
              See my work <Icon name="arrow" size={18} />
            </a>
            <a
              className="ar-btn ar-btn--pink"
              href="#contact"
              onClick={() => track('cta_contact', { where: 'hero' })}
            >
              Hire me
            </a>
            {s.resumeUrl && (
              <a
                className="ar-btn"
                href={s.resumeUrl}
                download
                onClick={() => track('cta_resume', { where: 'hero' })}
              >
                <Icon name="download" size={18} /> Resume
              </a>
            )}
          </div>
        </div>

        {/* Desktop: a spilled stack of draggable cards. */}
        <div className="ar-pile" aria-label="Draggable cards">
          {cards.map((c, i) => (
            <HeroCard key={c.key} c={c} i={i} constraints={heroRef} shuffleKey={shuffleKey} />
          ))}
          {STICKERS.map((st, i) => (
            <DragCard
              key={i}
              id={`hero-sticker-${i}`}
              rest={st.rest}
              constraints={heroRef}
              throwIn={cards.length + i}
              className={cx('ar-sticker', st.pos)}
            >
              {st.kind === 'hire' ? (
                <a
                  href="#contact"
                  className="ar-sticker__link"
                  aria-label="Hire me, jump to contact"
                >
                  <HireBadge tone={st.tone} />
                </a>
              ) : (
                <StickerArt kind={st.kind} tone={st.tone} />
              )}
            </DragCard>
          ))}
          <button
            type="button"
            className="ar-btn ar-btn--sm ar-pile__shuffle"
            onClick={() => setShuffleKey((k) => k + 1)}
          >
            <Icon name="shuffle" size={18} /> Shuffle
          </button>
        </div>

        {/* Mobile: a swipeable deck. */}
        <HeroDeck cards={cards} />
      </div>
    </section>
  )
}

function HeroCard({
  c,
  i,
  constraints,
  shuffleKey,
}: {
  c: CardDef
  i: number
  constraints: React.RefObject<HTMLElement | null>
  shuffleKey: number
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rot = useMotionValue(c.rest)
  useEffect(() => {
    if (!shuffleKey) return
    const r = rng(shuffleKey * 31 + i * 7)
    const t = { ...SPRING, delay: i * 0.07 }
    animate(x, (r() - 0.5) * 180, t)
    animate(y, (r() - 0.5) * 140, t)
    animate(rot, ROTS[Math.floor(r() * 4)] + (r() - 0.5) * 4, t)
  }, [shuffleKey, i, x, y, rot])

  return (
    <DragCard
      id={`hero-card-${c.key}`}
      x={x}
      y={y}
      restMV={rot}
      rest={c.rest}
      constraints={constraints}
      throwIn={i}
      className={cx('ar-herocard', `ar-herocard--${c.key}`)}
    >
      <a
        href={c.href}
        className={cx('ar-herocard__face', `tone-${c.tone}`)}
        onClick={() => track('hero_card', { card: c.key })}
      >
        <CardGlyph kind={c.key} />
        <span className="ar-herocard__label">{c.label}</span>
        <span className="ar-herocard__sub">{c.sub}</span>
        <Icon name="arrow" size={22} />
      </a>
    </DragCard>
  )
}

function HeroDeck({ cards }: { cards: CardDef[] }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i))
  const dragged = useRef(false)
  const advance = () => setOrder((o) => [...o.slice(1), o[0]])
  const rank = (i: number) => order.indexOf(i)

  return (
    <div
      className="ar-deck"
      role="group"
      aria-label="Card deck. Swipe the top card, or use the Next card button."
    >
      <div className="ar-deck__stack">
        {cards.map((c, i) => {
          const r = rank(i)
          const top = r === 0
          return (
            <m.div
              key={c.key}
              className="ar-deck__card"
              style={{ zIndex: 10 - r }}
              animate={{
                y: r * 12,
                rotate: top ? c.rest / 2 : ROTS[(i + 1) % 4] * 0.8,
                scale: 1 - r * 0.045,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              drag={top ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.9}
              dragSnapToOrigin
              onDragStart={() => (dragged.current = true)}
              onPointerDown={() => (dragged.current = false)}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 300) advance()
              }}
              onClickCapture={(e) => {
                if (dragged.current) {
                  e.preventDefault()
                  e.stopPropagation()
                  dragged.current = false
                }
              }}
              inert={!top}
            >
              <a
                href={c.href}
                className={cx('ar-herocard__face', `tone-${c.tone}`)}
                tabIndex={top ? 0 : -1}
                onClick={() => track('hero_card', { card: c.key })}
              >
                <CardGlyph kind={c.key} />
                <span className="ar-herocard__label">{c.label}</span>
                <span className="ar-herocard__sub">{c.sub}</span>
                <Icon name="arrow" size={22} />
              </a>
            </m.div>
          )
        })}
        {STICKERS.slice(0, 3).map((st, i) => (
          <DragCard
            key={i}
            id={`deck-sticker-${i}`}
            rest={st.rest}
            touchDrag
            className={cx('ar-sticker', `ar-dk-${i + 1}`)}
          >
            {st.kind === 'hire' ? (
              <a href="#contact" className="ar-sticker__link" aria-label="Hire me, jump to contact">
                <HireBadge tone={st.tone} />
              </a>
            ) : (
              <StickerArt kind={st.kind} tone={st.tone} />
            )}
          </DragCard>
        ))}
      </div>
      <button type="button" className="ar-btn ar-btn--sm ar-deck__next" onClick={advance}>
        Next card <Icon name="arrow" size={18} />
      </button>
    </div>
  )
}
