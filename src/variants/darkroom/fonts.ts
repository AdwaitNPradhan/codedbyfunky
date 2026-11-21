import { DM_Mono, Hanken_Grotesk, Instrument_Serif } from 'next/font/google'

export const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--dr-display',
})

export const body = Hanken_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--dr-body',
})

export const mono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--dr-mono',
})
