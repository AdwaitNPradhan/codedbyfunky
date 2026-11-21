import { Archivo, IBM_Plex_Mono } from 'next/font/google'

// Archivo is a variable font: the `wdth` axis (62-125) drives the drafting-label widths.
export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
})
