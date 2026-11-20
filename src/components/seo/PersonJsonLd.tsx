import type { Settings } from '@/lib/types'

export function PersonJsonLd({ settings }: { settings: Settings }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: settings.name,
    alternateName: settings.handle,
    url: site,
    jobTitle: settings.roles[0],
    description: settings.shortBio,
    address: settings.location || undefined,
    sameAs: settings.socials.map((s) => s.url).filter((u) => u.startsWith('http')),
  }
  // JSON.stringify + escaping "<" prevents breaking out of the script tag.
  const html = JSON.stringify(json).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />
}
