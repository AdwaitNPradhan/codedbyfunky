'use client'

import { createContext, useContext } from 'react'

export type Sheet = { id: string; part: string; name: string; nav?: string }

export type BP = {
  /** null until the first client effect has read the media query. */
  reduced: boolean | null
  fine: boolean
  sheets: Sheet[]
  activeSkill: string | null
  setActiveSkill: (s: string | null) => void
  overlayRoot: HTMLElement | null
  lock: () => () => void
  scrollTo: (id: string) => void
  contactOk: boolean
  setContactOk: (b: boolean) => void
  /** Sheet index (ToC) overlay. */
  openIndex: () => void
}

export const BPContext = createContext<BP | null>(null)

export function useBP(): BP {
  const v = useContext(BPContext)
  if (!v) throw new Error('useBP outside blueprint root')
  return v
}

/** The sheet record (part number, name) for a section id. */
export function useSheet(id: string): Sheet {
  const { sheets } = useBP()
  return sheets.find((s) => s.id === id) ?? { id, part: 'P-00', name: '' }
}
