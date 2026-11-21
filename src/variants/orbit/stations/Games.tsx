'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { GameEmbed } from '@/components/games/GameEmbed'
import type { Game } from '@/lib/types'
import { CAP } from '../lib/config'
import { gamesOf } from '../lib/items'
import { useOrbit } from '../lib/store'
import { imgUrl, pad } from '../lib/util'
import { ArrowUpRight, Btn, BtnLink, Close } from '../ui/bits'
import { Panel, Station, Title } from './Station'
import { Pager } from './Pager'
import s from '../orbit.module.css'

/** Poster shown before Play. Registers its start callback so a 3D cabinet click can launch the game. */
function Poster({ g, start }: { g: Game; start: () => void }) {
  const { api } = useOrbit()
  useEffect(() => {
    api.registerGameStart(g.id, start)
    if (api.consumePlay(g.id)) start()
    return () => api.registerGameStart(g.id, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.id])
  return (
    <button
      type="button"
      className={s.poster}
      data-cursor="PLAY"
      onClick={() => {
        api.gameStarted(g.id)
        start()
      }}
      aria-label={`Play ${g.title}`}
    >
      {g.cover && (
        <Image src={imgUrl(g.cover, 'card')} alt="" fill sizes="(max-width: 767px) 90vw, 560px" placeholder={g.cover.blur ? 'blur' : 'empty'} blurDataURL={g.cover.blur} className={s.posterImg} />
      )}
      <span className={s.posterScrim} aria-hidden="true" />
      <span className={s.posterPlay}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 3l8 5-8 5z" fill="currentColor" />
        </svg>
        Play {g.title}
      </span>
    </button>
  )
}

export function Games() {
  const { data, api, idx, flight, playing, gameReset } = useOrbit()
  const games = gamesOf(data)
  const active = idx.game
  if (!games.length) return null

  return (
    <Station i={3}>
      <Panel station={3} label="Games">
        <div className={clsx(s.copy, s.gamesCopy)}>
          <Title id="games-title">Games</Title>
          <ol className={clsx(s.selector, s.selectorChips)} data-rise aria-label="Games">
            {games.slice(0, flight ? CAP.games : games.length).map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  className={s.selBtn}
                  aria-current={i === active ? 'true' : undefined}
                  data-cursor="PLAY"
                  onClick={() => api.toItem('game', i)}
                  onPointerEnter={() => api.hoverKey(`game:${i}`)}
                  onPointerLeave={() => api.hoverKey(null)}
                  onFocus={() => api.hoverKey(`game:${i}`)}
                  onBlur={() => api.hoverKey(null)}
                >
                  <span className={s.selNum}>{pad(i + 1)}</span>
                  <span className={s.selName}>{g.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <Pager kind="game" count={Math.min(games.length, CAP.games)} />
        </div>

        <div className={clsx(s.colFrame, s.stack, s.stackGame)} data-rise>
          {games.map((g, i) => {
            const isActive = i === active || !flight
            const isPlaying = playing === g.id
            return (
              <article
                key={g.id}
                className={clsx(s.item, i >= CAP.games && s.extra)}
                data-active={isActive ? 'true' : 'false'}
                style={g.accent ? ({ '--game-accent': g.accent } as React.CSSProperties) : undefined}
                aria-labelledby={`game-${g.slug}`}
              >
                <div className={s.gameHead}>
                  <h3 className={s.itemTitle} id={`game-${g.slug}`}>
                    {g.title}
                  </h3>
                  {g.tagline && <p className={s.summary}>{g.tagline}</p>}
                </div>
                {/* Only the active game mounts its embed; the rest keep their text for crawlers and Plain view. */}
                {isActive ? (
                  <GameEmbed
                    key={`${g.id}-${gameReset}`}
                    game={g.component}
                    title={g.title}
                    className={s.gameFrame}
                    poster={(start) => <Poster g={g} start={start} />}
                  />
                ) : (
                  <div className={s.gameFrame} />
                )}
                <div className={s.gameFoot}>
                  {g.controls && <p className={s.controls}>{g.controls}</p>}
                  <div className={s.actions}>
                    {isPlaying && (
                      <Btn variant="primary" onClick={api.exitGame}>
                        <Close /> Exit game
                      </Btn>
                    )}
                    <BtnLink href={`/games/${g.slug}`} cursor="OPEN" variant="ghost">
                      Open full screen <ArrowUpRight />
                    </BtnLink>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </Panel>
    </Station>
  )
}
