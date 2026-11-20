'use client'

import type { SiteData } from '@/lib/types'

// STUB — replaced by the blueprint builder session.
export default function Site({ data }: { data: SiteData }) {
  return (
    <main style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>blueprint — {data.settings.name}</h1>
      <p>{data.settings.tagline}</p>
      <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify({ projects: data.projects.length, photos: data.photos.length, games: data.games.length, hardware: data.hardware.length, skills: data.skills.length, experience: data.experience.length }, null, 2)}</pre>
    </main>
  )
}
