import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteData } from '@/lib/content'
import { GameEmbed } from '@/components/games/GameEmbed'
import css from '../games.module.css'
import { localSrc } from '../localSrc'

export const dynamicParams = true
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const game = (await getSiteData()).games.find((g) => g.slug === slug)
  if (!game) return {}
  const description = game.tagline || game.description
  const img = game.cover?.hero ?? game.cover?.url
  return {
    title: game.title,
    description,
    openGraph: { title: game.title, description, ...(img ? { images: [{ url: img }] } : {}) },
  }
}

export default async function GamePage({ params }: Params) {
  const { slug } = await params
  const { games } = await getSiteData()
  const game = games.find((g) => g.slug === slug)
  if (!game) notFound()
  const accent = game.accent || '#c6ff3d'
  const others = games.filter((g) => g.slug !== game.slug)
  const vars = {
    '--game-bg': '#0b0b0f',
    '--game-fg': '#f4f4f5',
    '--game-accent': accent,
    '--game-accent-2': '#7c5cff',
    '--game-muted': '#3f3f46',
  } as CSSProperties

  return (
    <main className={css.page} style={vars}>
      <header className={css.bar}>
        <nav className={css.nav} aria-label="Site">
          <Link href="/" className={css.link}>
            ← Home
          </Link>
          <Link href="/games" className={css.link}>
            All games
          </Link>
        </nav>
        <div className={css.heading}>
          <h1 className={css.h1}>{game.title}</h1>
          {game.tagline && <p className={css.tagline}>{game.tagline}</p>}
        </div>
        {game.controls && <span className={css.chip}>{game.controls}</span>}
      </header>

      <div className={css.stage}>
        <GameEmbed game={game.component} title={game.title} autoStart className={css.frame} />
      </div>

      <section className={css.more} aria-label="About and more games">
        {game.description && (
          <>
            <h2 className={css.eyebrow}>About</h2>
            <p className={css.about}>{game.description}</p>
          </>
        )}
        {others.length > 0 && (
          <>
            <h2 className={css.eyebrow}>More games</h2>
            <ul className={`${css.grid} ${css.small}`}>
              {others.map((g, i) => {
                const src = g.cover?.thumb ?? g.cover?.card ?? g.cover?.url
                return (
                  <li key={g.id}>
                    <Link
                      href={`/games/${g.slug}`}
                      className={css.card}
                      style={{ '--c': g.accent || '#c6ff3d' } as CSSProperties}
                    >
                      <div className={css.thumb}>
                        <span className={css.num}>{String(i + 1).padStart(2, '0')}</span>
                        {src ? (
                          <Image
                            src={localSrc(src)}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 50vw, 220px"
                            placeholder={g.cover?.blur ? 'blur' : 'empty'}
                            blurDataURL={g.cover?.blur}
                          />
                        ) : (
                          <span className={css.glyph} aria-hidden="true">
                            {g.title.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className={css.body}>
                        <h3 className={css.name}>{g.title}</h3>
                        <div className={css.foot}>
                          <span>{g.controls}</span>
                          <span className={css.go} aria-hidden="true">
                            →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
