'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import type { Game } from '@/lib/types'
import { GameEmbed } from '@/components/games/GameEmbed'
import { addCoins, award, getState, setHired, useArcade } from '../lib/store'
import { sfx } from '../lib/sound'
import { cx, toneAt, track, type Tone } from '../lib/misc'
import { HireBadge, Icon } from './art'
import { Modal } from './Modal'
import { Pic, Slab, SlabHead } from './Slab'

/** Score that "beats" each game (unlocks the HIRE ME sticker). Default 20. */
const TARGET: Record<string, number> = { 'server-stack': 10, 'bug-squash': 20 }
const BIG_PREF = ['bug-squash', 'server-stack']

const gameTheme = {
  '--game-bg': 'var(--ink)',
  '--game-fg': 'var(--cream)',
  '--game-accent': 'var(--yellow)',
  '--game-accent-2': 'var(--pink)',
  '--game-muted': 'var(--lilac)',
} as CSSProperties

const bestKey = (slug: string) => `funky:${slug}:best`
const readBest = (slug: string) => {
  try {
    return Number(localStorage.getItem(bestKey(slug))) || 0
  } catch {
    return 0
  }
}

type Ctl = {
  active: string | null
  nonce: Record<string, number>
  onStart: (g: Game) => void
  onReset: (g: Game) => void
}

/** The arcade wall: two cabinets playable right here, the rest as mini cabinets that open a player. */
export function Play({ games }: { games: Game[] }) {
  const [active, setActive] = useState<string | null>(null)
  const [nonce, setNonce] = useState<Record<string, number>>({})
  const [modalGame, setModalGame] = useState<Game | null>(null)
  const started = useRef<Set<string>>(new Set())

  const pref = BIG_PREF.map((k) => games.find((g) => g.component === k)).filter(
    (g): g is Game => !!g,
  )
  const fill = games
    .filter((g) => !pref.includes(g))
    .sort((a, b) => Number(b.featured) - Number(a.featured))
  const big = [...pref, ...fill].slice(0, 2)
  const minis = games.filter((g) => !big.includes(g))

  const onStart = useCallback((g: Game) => {
    // Only one game loop alive at a time: starting one resets the others back to their poster.
    setNonce((n) => {
      const next = { ...n }
      for (const slug of started.current) if (slug !== g.slug) next[slug] = (n[slug] ?? 0) + 1
      return next
    })
    started.current = new Set([g.slug])
    setActive(g.slug)
    addCoins(1)
    award('insert-coin')
    sfx.coin()
    track('game_start', { game: g.slug })
  }, [])
  const onReset = useCallback((g: Game) => {
    started.current.delete(g.slug)
    setNonce((n) => ({ ...n, [g.slug]: (n[g.slug] ?? 0) + 1 }))
    setActive((a) => (a === g.slug ? null : a))
  }, [])

  const ctl: Ctl = { active, nonce, onStart, onReset }
  if (!games.length) return null

  return (
    <Slab id="play" tone="blue" labelledBy="play-h">
      <SlabHead id="play-h" title="Play" count={games.length}>
        <p className="ar-lede">
          The arcade wall. Press INSERT COIN on a cabinet and play right here. Every game lives in
          the browser.
        </p>
      </SlabHead>

      <div className="ar-wall">
        {big.map((g, i) => (
          <Cabinet key={g.id} g={g} tone={toneAt(i === 0 ? 0 : 1)} ctl={ctl} />
        ))}
      </div>

      {minis.length > 0 && (
        <>
          <h3 className="ar-h3 ar-wall__sub">More cabinets</h3>
          <ul className="ar-minis">
            {minis.map((g, i) => (
              <li key={g.id}>
                <MiniCabinet
                  g={g}
                  tone={toneAt(i + 2)}
                  onOpen={() => (setModalGame(g), onStart(g), track('game_open', { game: g.slug }))}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={!!modalGame}
        onClose={() => setModalGame(null)}
        label={modalGame ? `${modalGame.title}: mini game` : 'Mini game'}
        tone="blue"
        className="ar-gamemodal"
      >
        {modalGame && <ModalGame g={modalGame} />}
      </Modal>
    </Slab>
  )
}

function Cabinet({ g, tone, ctl }: { g: Game; tone: Tone; ctl: Ctl }) {
  const descId = useId()
  const startRef = useRef<(() => void) | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState('')
  const hired = useArcade((s) => s.hired)
  useEffect(() => setBest(readBest(g.slug)), [g.slug])
  const resetKey = ctl.nonce[g.slug] ?? 0
  useEffect(() => {
    setScore(0)
    setOver('')
  }, [resetKey])
  const playing = ctl.active === g.slug
  const target = TARGET[g.component] ?? 20

  const handleScore = (n: number) => {
    setScore(n)
    if (n >= target) {
      award('high-score')
      if (!getState().hired) {
        setHired()
        sfx.jingle()
      }
    }
  }
  const handleOver = (n: number) => {
    const prev = readBest(g.slug)
    if (n > prev) {
      try {
        localStorage.setItem(bestKey(g.slug), String(n))
      } catch {}
      setBest(n)
    }
    setOver(`Game over. Final score ${n}.`)
    track('game_over', { game: g.slug, score: n })
  }

  return (
    <article className={cx('ar-cab', `tone-${tone}`)} aria-labelledby={`${descId}-t`}>
      <header className="ar-cab__marquee">
        <h3 id={`${descId}-t`} className="ar-cab__title">
          {g.title}
        </h3>
        <span className="ar-cab__bulbs" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </header>
      <div className="ar-cab__bezel">
        <div
          className="ar-cab__screen"
          style={gameTheme}
          role="group"
          aria-label={`${g.title} cabinet`}
          aria-describedby={descId}
        >
          <GameEmbed
            key={`${g.slug}:${ctl.nonce[g.slug] ?? 0}`}
            game={g.component}
            title={g.title}
            className="ar-cab__embed"
            onScore={handleScore}
            onGameOver={handleOver}
            poster={(start) => {
              startRef.current = start
              return (
                <button
                  type="button"
                  className="ar-cab__poster"
                  aria-label={`Insert coin: play ${g.title}`}
                  onClick={() => {
                    setScore(0)
                    setOver('')
                    setBest(readBest(g.slug))
                    ctl.onStart(g)
                    start()
                  }}
                >
                  <Pic img={g.cover} sizes="(max-width: 700px) 92vw, 460px" alt="" />
                  <span className="ar-cab__coin">INSERT COIN</span>
                </button>
              )
            }}
          />
          <div className="ar-cab__scan" aria-hidden="true" />
        </div>
      </div>
      <div className="ar-cab__panel">
        <p className="ar-cab__hud" aria-hidden="true">
          SCORE {String(score).padStart(3, '0')} · BEST {String(best).padStart(3, '0')}
        </p>
        {playing ? (
          <button
            type="button"
            className="ar-btn ar-btn--sm"
            onClick={() => (setScore(0), setOver(''), ctl.onReset(g))}
          >
            Reset cabinet
          </button>
        ) : (
          <button
            type="button"
            className="ar-btn ar-btn--sm ar-btn--yellow"
            onClick={() =>
              startRef.current && (setScore(0), setOver(''), ctl.onStart(g), startRef.current())
            }
          >
            <Icon name="coin" size={18} /> Insert coin
          </button>
        )}
        <Link
          className="ar-btn ar-btn--sm"
          href={`/games/${g.slug}`}
          aria-label={`${g.title}: open full screen`}
        >
          Full screen <Icon name="external" size={16} />
        </Link>
      </div>
      <div id={descId} className="ar-cab__text">
        <p>{g.description || g.tagline}</p>
        {g.controls && (
          <p className="ar-cab__controls">
            <strong>Controls:</strong> {g.controls}
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {over}
      </p>
      {hired && (
        <a
          href="#contact"
          className="ar-cab__hire"
          aria-label="You unlocked a sticker: hire me, jump to contact"
        >
          <HireBadge tone="yellow" />
        </a>
      )}
    </article>
  )
}

function MiniCabinet({ g, tone, onOpen }: { g: Game; tone: Tone; onOpen: () => void }) {
  return (
    <article className={cx('ar-mini', `tone-${tone}`)}>
      <h4 className="ar-mini__title">{g.title}</h4>
      <button
        type="button"
        className="ar-mini__screen"
        onClick={onOpen}
        aria-label={`Insert coin: play ${g.title}`}
      >
        <Pic img={g.cover} sizes="(max-width: 700px) 44vw, 280px" thumb alt="" />
        <span className="ar-cab__scan" aria-hidden="true" />
        <span className="ar-cab__coin">INSERT COIN</span>
      </button>
      <p className="ar-mini__tag">{g.tagline}</p>
    </article>
  )
}

function ModalGame({ g }: { g: Game }) {
  return (
    <div className="ar-gm">
      <h2 className="ar-h2 ar-h2--md">{g.title}</h2>
      <div className="ar-gm__screen" style={gameTheme}>
        <GameEmbed
          game={g.component}
          title={g.title}
          className="ar-gm__embed"
          poster={(start) => <AutoStart start={start} />}
        />
      </div>
      <p className="ar-lede">{g.description || g.tagline}</p>
      {g.controls && (
        <p>
          <strong>Controls:</strong> {g.controls}
        </p>
      )}
      <Link className="ar-btn ar-btn--sm" href={`/games/${g.slug}`}>
        Open full screen <Icon name="external" size={16} />
      </Link>
    </div>
  )
}

function AutoStart({ start }: { start: () => void }) {
  useEffect(() => {
    start()
    // start once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <div className="ar-gm__loading">Loading…</div>
}
