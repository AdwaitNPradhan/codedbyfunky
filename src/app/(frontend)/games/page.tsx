import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getSiteData } from '@/lib/content'
import css from './games.module.css'
import { localSrc } from './localSrc'

// No params here, so the page can't be pre-rendered at build time without a DB.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Games',
  description:
    'Eight small browser games, built from scratch. Squash bugs, ship builds, stack servers.',
}

const theme = {
  '--game-bg': '#0b0b0f',
  '--game-fg': '#f4f4f5',
  '--game-accent': '#c6ff3d',
  '--game-accent-2': '#7c5cff',
  '--game-muted': '#3f3f46',
} as CSSProperties

export default async function GamesIndex() {
  const { games } = await getSiteData()
  return (
    <main className={css.page} style={theme}>
      <header className={css.bar}>
        <nav className={css.nav} aria-label="Site">
          <Link href="/" className={css.link}>
            ← Home
          </Link>
        </nav>
      </header>

      <section className={css.hero}>
        <h1 className={css.display}>
          Play<em>.</em>
        </h1>
        <p className={css.lede}>
          {games.length ? `${games.length} tiny games` : 'Tiny games'}, hand-built on canvas. No
          downloads, no ads, best scores stay on your device. Works with a mouse, a keyboard or your
          thumb.
        </p>
      </section>

      {games.length === 0 ? (
        <p className={css.empty}>No games are published yet.</p>
      ) : (
        <ul className={css.grid}>
          {games.map((g, i) => {
            const src = g.cover?.card ?? g.cover?.url
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
                        sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 300px"
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
                    <h2 className={css.name}>{g.title}</h2>
                    <p className={css.blurb}>{g.tagline || g.description}</p>
                    <div className={css.foot}>
                      <span>{g.controls}</span>
                      <span className={css.go} aria-hidden="true">
                        Play →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
