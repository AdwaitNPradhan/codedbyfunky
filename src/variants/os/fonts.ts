import { Geist, JetBrains_Mono, Pixelify_Sans } from 'next/font/google'

export const geist = Geist({ subsets: ['latin'], display: 'swap', variable: '--font-os-ui' })
export const pixel = Pixelify_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-os-pixel',
})
export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-os-mono',
})

export const fontVars = `${geist.variable} ${pixel.variable} ${mono.variable}`
