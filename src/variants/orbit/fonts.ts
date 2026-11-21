import { Funnel_Display, Geist, Geist_Mono } from 'next/font/google'

export const display = Funnel_Display({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
  variable: '--font-orbit-display',
})

export const body = Geist({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-orbit-body',
})

export const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-orbit-mono',
})

export const fontClasses = `${display.variable} ${body.variable} ${mono.variable}`
