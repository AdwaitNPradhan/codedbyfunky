import { Bricolage_Grotesque, Figtree, Silkscreen } from 'next/font/google'

export const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz', 'wdth'],
  display: 'swap',
  variable: '--ar-font-display',
})

export const bodyFont = Figtree({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--ar-font-body',
})

export const pixelFont = Silkscreen({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--ar-font-pixel',
})
