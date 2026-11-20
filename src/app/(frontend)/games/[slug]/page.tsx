import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteData } from '@/lib/content'
import { GameEmbed } from '@/components/games/GameEmbed'

export const dynamicParams = true
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const game = (await getSiteData()).games.find((g) => g.slug === slug)
  return game ? { title: game.title, description: game.tagline || game.description } : {}
}

export default async function GamePage({ params }: Params) {
  const { slug } = await params
  const { games } = await getSiteData()
  const game = games.find((g) => g.slug === slug)
  if (!game) notFound()
  const accent = game.accent || '#c6ff3d'
  return (
    <main
      style={
        {
          '--game-bg': '#0b0b0f',
          '--game-fg': '#f4f4f5',
          '--game-accent': accent,
          '--game-accent-2': '#7c5cff',
          '--game-muted': '#3f3f46',
          minHeight: '100dvh',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          background: '#0b0b0f',
          color: '#f4f4f5',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        } as React.CSSProperties
      }
    >
      <header style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap', padding: '16px 20px' }}>
        <Link href="/" style={{ color: accent }}>← back</Link>
        <h1 style={{ margin: 0, fontSize: 20 }}>{game.title}</h1>
        <span style={{ opacity: 0.6, fontSize: 13 }}>{game.controls}</span>
      </header>
      <GameEmbed game={game.component} title={game.title} style={{ width: '100%', height: '100%', minHeight: 420 }} />
    </main>
  )
}
