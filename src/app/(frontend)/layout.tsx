import type { Metadata, Viewport } from 'next'
import React from 'react'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'codedbyfunky — engineer, photographer, tinkerer',
    template: '%s · codedbyfunky',
  },
  description:
    'Portfolio of funky: software engineering, web games, hardware builds and photography.',
  openGraph: { type: 'website', siteName: 'codedbyfunky' },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
