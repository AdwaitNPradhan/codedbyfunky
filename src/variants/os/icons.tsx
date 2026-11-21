import type { ReactNode } from 'react'
import type { AppId } from './types'

export type IconName =
  | AppId
  | 'folder'
  | 'doc'
  | 'pdf'
  | 'instagram'
  | 'github'
  | 'linkedin'
  | 'image'
  | 'chip'
  | 'power'
  | 'back'
  | 'search'

const L = 'var(--ic-line)'
const P = 'var(--ic-paper)'
const A = 'var(--accent)'
const T = 'var(--ic-teal)'
const Y = '#FFD166'

/** Chunky 32px icons drawn on a pixel grid. Colours come from tokens on the wrapper. */
const art: Record<string, ReactNode> = {
  about: (
    <>
      <path d="M7 3h13l6 6v20H7z" fill={P} stroke={L} strokeWidth="2" />
      <path d="M20 3v6h6" fill="#D9D2BE" stroke={L} strokeWidth="2" />
      <rect x="11" y="12" width="7" height="2" fill={A} />
      <rect x="11" y="17" width="11" height="2" fill={L} />
      <rect x="11" y="21" width="11" height="2" fill={L} />
      <rect x="11" y="25" width="7" height="2" fill={L} />
    </>
  ),
  folder: (
    <>
      <path d="M3 7h10l3 3h13v17H3z" fill={Y} stroke={L} strokeWidth="2" />
      <path d="M3 13h26v14H3z" fill="#FFE29A" stroke={L} strokeWidth="2" />
      <rect x="6" y="16" width="8" height="2" fill={A} />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="5" width="26" height="22" fill="#9BD3CE" stroke={L} strokeWidth="2" />
      <rect x="21" y="9" width="4" height="4" fill={A} />
      <path
        d="M3 27V20l7-6 6 6 5-4 8 6v5z"
        fill={T}
        stroke={L}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  ),
  games: (
    <>
      <path
        d="M6 10h20l4 14h-6l-3-4H11l-3 4H2z"
        fill={T}
        stroke={L}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="8" y="13" width="2" height="6" fill={P} />
      <rect x="6" y="15" width="6" height="2" fill={P} />
      <rect x="20" y="13" width="3" height="3" fill={A} />
      <rect x="23" y="17" width="3" height="3" fill={Y} />
    </>
  ),
  game: (
    <>
      <path
        d="M6 10h20l4 14h-6l-3-4H11l-3 4H2z"
        fill={T}
        stroke={L}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="8" y="13" width="2" height="6" fill={P} />
      <rect x="6" y="15" width="6" height="2" fill={P} />
      <rect x="20" y="13" width="3" height="3" fill={A} />
      <rect x="23" y="17" width="3" height="3" fill={Y} />
    </>
  ),
  lab: (
    <>
      {[9, 14, 19].map((p) => (
        <g key={p} fill={L}>
          <rect x={p} y="3" width="2" height="5" />
          <rect x={p} y="24" width="2" height="5" />
          <rect x="3" y={p} width="5" height="2" />
          <rect x="24" y={p} width="5" height="2" />
        </g>
      ))}
      <rect x="7" y="7" width="18" height="18" fill={T} stroke={L} strokeWidth="2" />
      <rect x="12" y="12" width="8" height="8" fill={P} stroke={L} strokeWidth="2" />
      <rect x="14" y="14" width="4" height="4" fill={A} />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="18" height="18" fill={T} stroke={L} strokeWidth="2" />
      <rect x="12" y="12" width="8" height="8" fill={A} stroke={L} strokeWidth="2" />
    </>
  ),
  skills: (
    <>
      <rect x="3" y="4" width="26" height="19" fill={P} stroke={L} strokeWidth="2" />
      <rect x="7" y="15" width="3" height="4" fill={T} />
      <rect x="12" y="11" width="3" height="8" fill={A} />
      <rect x="17" y="13" width="3" height="6" fill={T} />
      <rect x="22" y="8" width="3" height="11" fill={A} />
      <rect x="12" y="23" width="8" height="3" fill={L} />
      <rect x="9" y="26" width="14" height="2" fill={L} />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="5" width="26" height="22" fill="#0B0F0C" stroke={L} strokeWidth="2" />
      <rect x="3" y="5" width="26" height="4" fill={L} />
      <path d="M8 14l4 3-4 3" fill="none" stroke="#A8FF9E" strokeWidth="2" strokeLinecap="square" />
      <rect x="15" y="21" width="7" height="2" fill="#FFD166" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="7" width="26" height="19" fill={P} stroke={L} strokeWidth="2" />
      <path d="M3 8l13 10L29 8" fill="none" stroke={L} strokeWidth="2" strokeLinejoin="round" />
      <rect x="22" y="3" width="6" height="6" fill={A} stroke={L} strokeWidth="2" />
    </>
  ),
  pdf: (
    <>
      <path d="M7 3h13l6 6v20H7z" fill={P} stroke={L} strokeWidth="2" />
      <path d="M20 3v6h6" fill="#D9D2BE" stroke={L} strokeWidth="2" />
      <rect x="7" y="16" width="19" height="7" fill={A} stroke={L} strokeWidth="2" />
      <rect x="10" y="19" width="2" height="1" fill={L} />
      <rect x="14" y="19" width="5" height="1" fill={L} />
      <rect x="11" y="26" width="9" height="2" fill={L} />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h13l6 6v20H7z" fill={P} stroke={L} strokeWidth="2" />
      <path d="M20 3v6h6" fill="#D9D2BE" stroke={L} strokeWidth="2" />
      <rect x="11" y="15" width="11" height="2" fill={L} />
      <rect x="11" y="20" width="11" height="2" fill={L} />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="26" height="22" fill="#9BD3CE" stroke={L} strokeWidth="2" />
      <path
        d="M3 27V21l7-5 6 5 5-3 8 5v4z"
        fill={T}
        stroke={L}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="24" height="24" rx="6" fill={P} stroke={L} strokeWidth="2" />
      <circle cx="16" cy="16" r="5.5" fill="none" stroke={A} strokeWidth="3" />
      <rect x="22" y="8" width="3" height="3" fill={L} />
    </>
  ),
  github: (
    <>
      <circle cx="16" cy="16" r="12" fill={L} />
      <path
        d="M11 24v-5c-3 1-4-1-5-2m5-7c0-2 1-3 2-3 1 0 2 .5 3 .5s2-.5 3-.5c1 0 2 1 2 3 2 1 3 2 3 5 0 4-3 5-6 5h-1"
        fill="none"
        stroke={P}
        strokeWidth="2"
      />
    </>
  ),
  linkedin: (
    <>
      <rect x="4" y="4" width="24" height="24" rx="3" fill={T} stroke={L} strokeWidth="2" />
      <rect x="9" y="14" width="3" height="9" fill={P} />
      <rect x="9" y="9" width="3" height="3" fill={P} />
      <path d="M15 14h3v1.5c1-1.5 5-2.5 5 2.5v5h-3v-4.5c0-2-2-2-2 0V23h-3z" fill={P} />
    </>
  ),
  settings: (
    <>
      <rect x="3" y="4" width="26" height="24" fill={P} stroke={L} strokeWidth="2" />
      <rect x="7" y="9" width="18" height="2" fill={L} />
      <rect x="7" y="15" width="18" height="2" fill={L} />
      <rect x="7" y="21" width="18" height="2" fill={L} />
      <rect x="18" y="7" width="4" height="6" fill={A} stroke={L} strokeWidth="1" />
      <rect x="10" y="13" width="4" height="6" fill={T} stroke={L} strokeWidth="1" />
      <rect x="16" y="19" width="4" height="6" fill={A} stroke={L} strokeWidth="1" />
    </>
  ),
  preview: (
    <>
      <rect x="3" y="4" width="26" height="24" fill={P} stroke={L} strokeWidth="2" />
      <rect x="6" y="7" width="20" height="10" fill={T} />
      <rect x="6" y="20" width="12" height="2" fill={L} />
      <rect x="6" y="24" width="8" height="2" fill={A} />
    </>
  ),
  power: (
    <>
      <path d="M16 4v10" stroke={L} strokeWidth="3" strokeLinecap="square" />
      <path
        d="M9 9a10 10 0 1 0 14 0"
        fill="none"
        stroke={L}
        strokeWidth="3"
        strokeLinecap="square"
      />
    </>
  ),
  back: (
    <path
      d="M20 6L10 16l10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="square"
    />
  ),
  search: (
    <>
      <circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M20 20l8 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />
    </>
  ),
}

export function Icon({
  name,
  size = 48,
  className,
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {art[name] ?? art.doc}
    </svg>
  )
}

/** Small arrow badge drawn over link-type icons (Instagram.url). */
export function ShortcutBadge({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect x="0.5" y="0.5" width="13" height="13" fill="#F6F1E4" stroke="#1B1B1F" />
      <path d="M4 10l5-5M5 4h5v5" fill="none" stroke="#1B1B1F" strokeWidth="1.6" />
    </svg>
  )
}
