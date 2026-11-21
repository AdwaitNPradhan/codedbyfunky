'use client'

import { useId, type CSSProperties } from 'react'
import type { Tone } from '../lib/misc'

/* ---------- Stickers: authored SVG geometry, flat fills, ink outline ---------- */

export type StickerKind = 'star' | 'burst' | 'smile' | 'bolt' | 'arrow'
export const STICKER_KINDS: StickerKind[] = ['star', 'burst', 'smile', 'bolt']

const spikes = (n: number, outer: number, inner: number, c = 50) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI * i) / n - Math.PI / 2
    const r = i % 2 ? inner : outer
    return `${(c + Math.cos(a) * r).toFixed(1)},${(c + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')

const BURST = spikes(12, 46, 34)
const STAR = spikes(5, 46, 20)

export function StickerArt({
  kind,
  tone = 'yellow',
  className,
}: {
  kind: StickerKind
  tone?: Tone
  className?: string
}) {
  const style = { '--fill': `var(--${tone})` } as CSSProperties
  return (
    <svg
      viewBox="0 0 100 100"
      className={`ar-art ${className ?? ''}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'star' && <polygon points={STAR} />}
      {kind === 'burst' && <polygon points={BURST} />}
      {kind === 'bolt' && <polygon points="58,6 20,56 46,56 36,94 80,40 54,40" />}
      {kind === 'arrow' && <path d="M8 38 H58 V16 L94 50 L58 84 V62 H8 Z" />}
      {kind === 'smile' && (
        <>
          <circle cx="50" cy="50" r="42" />
          <ellipse cx="36" cy="42" rx="5" ry="8" className="ar-art__ink" />
          <ellipse cx="64" cy="42" rx="5" ry="8" className="ar-art__ink" />
          <path d="M28 60 Q50 84 72 60" fill="none" />
        </>
      )}
    </svg>
  )
}

/** Round "HIRE ME" badge. Text is real SVG text; the parent supplies the link. */
export function HireBadge({ tone = 'pink', label = 'HIRE ME' }: { tone?: Tone; label?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="ar-art ar-art--badge"
      style={{ '--fill': `var(--${tone})` } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={spikes(14, 56, 47, 60)} />
      <text x="60" y="56" textAnchor="middle" className="ar-art__text">
        {label.split(' ')[0]}
      </text>
      <text x="60" y="76" textAnchor="middle" className="ar-art__text">
        {label.split(' ').slice(1).join(' ')}
      </text>
    </svg>
  )
}

/** Circular text stamp that spins (Instagram slab). */
export function SpinStamp({ text = 'FOLLOW', className }: { text?: string; className?: string }) {
  const id = `ar-stamp-${useId().replace(/:/g, '')}`
  const run = `${text} • ${text} • ${text} • ${text} • `
  return (
    <svg
      viewBox="0 0 160 160"
      className={`ar-stamp ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={id} d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" />
      </defs>
      <circle cx="80" cy="80" r="76" className="ar-stamp__disc" />
      <text className="ar-stamp__text">
        <textPath href={`#${id}`} startOffset="0" textLength="360">
          {run}
        </textPath>
      </text>
      <polygon
        points="80,52 90,76 114,80 90,86 80,110 70,86 46,80 70,76"
        className="ar-stamp__star"
      />
    </svg>
  )
}

/* ---------- Icons: one stroke weight (3), round caps ---------- */

export type IconName =
  | 'arrow'
  | 'download'
  | 'copy'
  | 'check'
  | 'close'
  | 'external'
  | 'die'
  | 'menu'
  | 'coin'
  | 'play'
  | 'flip'
  | 'instagram'
  | 'up'
  | 'shuffle'
  | 'grid'

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="ar-icon"
    >
      {name === 'arrow' && <path d="M4 12h15M13 6l6 6-6 6" />}
      {name === 'up' && <path d="M12 20V5M6 11l6-6 6 6" />}
      {name === 'download' && <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />}
      {name === 'copy' && (
        <>
          <rect x="8" y="8" width="12" height="12" rx="1" />
          <path d="M16 8V4H4v12h4" />
        </>
      )}
      {name === 'check' && <path d="M4 13l5 5L20 6" />}
      {name === 'close' && <path d="M5 5l14 14M19 5L5 19" />}
      {name === 'external' && <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />}
      {name === 'menu' && <path d="M4 7h16M4 12h16M4 17h16" />}
      {name === 'play' && <path d="M7 4l13 8-13 8z" fill="currentColor" />}
      {name === 'flip' && (
        <path
          d="M4 12a8 8 0 0 1 14-5l2-2v6h-6l2.2-2.2A5 5 0 0 0 7 12M20 12a8 8 0 0 1-14 5l-2 2v-6h6l-2.2 2.2A5 5 0 0 0 17 12"
          strokeWidth="2.4"
        />
      )}
      {name === 'shuffle' && (
        <path
          d="M3 7h4c6 0 6 10 12 10h2M3 17h4c2 0 3.5-1.3 4.8-3M14 8c1.3-1.2 2.7-1 5-1h2M18 4l3 3-3 3M18 14l3 3-3 3"
          strokeWidth="2.4"
        />
      )}
      {name === 'grid' && <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />}
      {name === 'coin' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path
            d="M12 7.5v9M9.6 10.2c0-1.1 1-1.7 2.4-1.7s2.4.6 2.4 1.6c0 2.3-4.8 1.1-4.8 3.6 0 1 1 1.7 2.4 1.7s2.4-.6 2.4-1.7"
            strokeWidth="2"
          />
        </>
      )}
      {name === 'instagram' && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="0.6" fill="currentColor" />
        </>
      )}
      {name === 'die' && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
          <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
          <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
          <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
        </>
      )}
    </svg>
  )
}

/** Hero card pictograms (geometry only). */
export function CardGlyph({ kind }: { kind: 'about' | 'work' | 'play' | 'photos' }) {
  return (
    <svg viewBox="0 0 80 80" className="ar-glyph" aria-hidden="true" focusable="false">
      {kind === 'about' && (
        <>
          <circle cx="40" cy="30" r="14" />
          <path d="M14 70c2-18 14-24 26-24s24 6 26 24z" />
        </>
      )}
      {kind === 'work' && (
        <>
          <rect x="10" y="16" width="60" height="46" />
          <path d="M10 28h60M20 22h.1M28 22h.1M36 22h.1" />
          <path d="M22 44l8 6-8 6M38 56h14" />
        </>
      )}
      {kind === 'play' && (
        <>
          <rect x="10" y="22" width="60" height="38" rx="10" />
          <path d="M26 34v14M19 41h14" />
          <circle cx="52" cy="37" r="3.5" />
          <circle cx="61" cy="45" r="3.5" />
        </>
      )}
      {kind === 'photos' && (
        <>
          <rect x="8" y="24" width="64" height="40" rx="4" />
          <circle cx="40" cy="44" r="12" />
          <path d="M28 24l4-8h16l4 8" />
        </>
      )}
    </svg>
  )
}
