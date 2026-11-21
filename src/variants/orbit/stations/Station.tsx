'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import clsx from 'clsx'
import { dwellVh, countsOf, STATIONS } from '../lib/config'
import { useOrbit } from '../lib/store'
import s from '../orbit.module.css'

/** One 3D station = one tall section whose sticky child pins the overlay panels. */
export function Station({ i, children }: { i: number; children: ReactNode }) {
  const { data } = useOrbit()
  const c = countsOf(data)
  const d = dwellVh(c, false)[i]
  const m = dwellVh(c, true)[i]
  const style = { '--dwell-d': d, '--dwell-m': m } as CSSProperties
  return (
    <section id={STATIONS[i].id} data-station={i} className={s.station} style={style} aria-label={STATIONS[i].label}>
      <div className={s.stick} data-stick>
        {children}
      </div>
    </section>
  )
}

/**
 * Overlay layer. `a`/`b` = the part of the station's dwell scroll during which this panel is shown (0..1).
 * On phones the inner `.sheet` becomes a bottom sheet; on desktop it vanishes (display: contents) and
 * children sit on the 12-column grid.
 */
export function Panel({
  station,
  a = 0,
  b = 1,
  first,
  tall,
  label,
  children,
}: {
  station: number
  a?: number
  b?: number
  first?: boolean
  tall?: boolean
  label?: string
  children: ReactNode
}) {
  return (
    <div data-panel data-st={station} data-a={a} data-b={b} className={clsx(s.panel, first && s.panelFirst)}>
      <div className={clsx(s.sheet, tall && s.sheetTall)} role="group" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

export function Title({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 className={s.title} data-title id={id}>
      {children}
    </h2>
  )
}

/** In flight mode an `a[href^="#"]` smooth-flies to the station; in Plain view it scrolls natively. */
export function useGo() {
  const { api } = useOrbit()
  return (i: number) => (e: MouseEvent) => {
    e.preventDefault()
    api.toStation(i)
  }
}
