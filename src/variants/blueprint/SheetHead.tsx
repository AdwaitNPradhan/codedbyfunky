'use client'

import { useEffect, useRef, useState } from 'react'
import { fmtMM } from './util'
import s from './sections.module.css'

/** Section header: plain-language title, then a drafting dimension line that reports its own width in mm. */
export function SheetHead({
  id,
  part,
  tag,
  title,
  note,
  trace = true,
}: {
  id: string
  part: string
  tag: string
  title: string
  note?: string
  trace?: boolean
}) {
  const line = useRef<HTMLDivElement>(null)
  const [mm, setMm] = useState('')

  useEffect(() => {
    const el = line.current
    if (!el) return
    const read = () => setMm(fmtMM(el.getBoundingClientRect().width))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header className={s.head} data-reveal>
      {trace && <span data-trace-pad={id} className={s.padAnchor} aria-hidden="true" />}
      <h2 id={id}>{title}</h2>
      {note && <p className={s.headNote}>{note}</p>}
      <div ref={line} className={s.dim} aria-hidden="true">
        <span className={s.dimTick} />
        <svg className={s.dimArrow} viewBox="0 0 10 8" width="10" height="8">
          <path d="M10 0 L0 4 L10 8" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span className={s.dimRule} />
        <span className={s.dimLabel}>
          {part} · {tag}
          {mm ? ` · ${mm} MM` : ''}
        </span>
        <span className={s.dimRule} />
        <svg className={s.dimArrow} viewBox="0 0 10 8" width="10" height="8">
          <path d="M0 0 L10 4 L0 8" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span className={s.dimTick} />
      </div>
    </header>
  )
}
