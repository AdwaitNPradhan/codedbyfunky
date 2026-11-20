import Link from 'next/link'
import { VARIANT_KEYS, VARIANT_META } from '@/variants/keys'

// Static: no DB needed. Temporary home that lets the owner compare the 5 designs.
export const dynamic = 'force-static'

const swatches: Record<string, [string, string]> = {
  orbit: ['#05060f', '#7c5cff'],
  darkroom: ['#0d0b0a', '#ff3b1f'],
  blueprint: ['#0b3a6e', '#e8f1ff'],
  arcade: ['#fff35c', '#ff2e88'],
  os: ['#c9d6df', '#1d4ed8'],
}

export default function Picker() {
  return (
    <main style={{ minHeight: '100dvh', padding: 'clamp(20px, 5vw, 64px)', fontFamily: 'ui-sans-serif, system-ui', background: '#0a0a0a', color: '#fafafa' }}>
      <p style={{ opacity: 0.6, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 12 }}>codedbyfunky · design review</p>
      <h1 style={{ fontSize: 'clamp(36px, 7vw, 96px)', lineHeight: 0.95, margin: '12px 0 40px', fontWeight: 800, letterSpacing: '-0.03em' }}>
        Five directions.
        <br />
        Pick one.
      </h1>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {VARIANT_KEYS.map((k, i) => (
          <li key={k}>
            <Link
              href={`/${k}`}
              style={{ display: 'block', padding: 24, minHeight: 220, borderRadius: 20, background: `linear-gradient(140deg, ${swatches[k][0]}, ${swatches[k][1]})`, color: k === 'arcade' || k === 'os' ? '#111' : '#fff', textDecoration: 'none', border: '1px solid #ffffff22' }}
            >
              <span style={{ fontSize: 12, opacity: 0.7 }}>0{i + 1}</span>
              <strong style={{ display: 'block', fontSize: 32, margin: '8px 0' }}>{VARIANT_META[k].title}</strong>
              <span style={{ opacity: 0.85 }}>{VARIANT_META[k].blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 40, opacity: 0.6 }}>
        CMS: <Link href="/admin" style={{ color: '#fafafa' }}>/admin</Link>
      </p>
    </main>
  )
}
