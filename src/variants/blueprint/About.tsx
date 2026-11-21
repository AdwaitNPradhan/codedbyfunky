'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { imgSrc } from './util'
import type { Settings } from '@/lib/types'
import s from './sections.module.css'

/** Sheet 02: general notes in drawing-note style, a circular detail of the portrait, and the CMS stats as design data. */
export function About({ settings }: { settings: Settings }) {
  const sh = useSheet('sheet-notes')
  const fig = useRef<HTMLElement>(null)
  const paras = settings.longBio
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const notes: { k?: string; t: string }[] = []
  if (paras.length) paras.forEach((t) => notes.push({ t }))
  else if (settings.shortBio) notes.push({ t: settings.shortBio })
  const base = [settings.location, settings.timezone].filter(Boolean).join(' · ')
  if (base) notes.push({ k: 'BASE', t: base })
  if (settings.availability.status !== 'closed' && settings.availability.note) notes.push({ k: 'AVAILABILITY', t: settings.availability.note })
  if (settings.roles.length) notes.push({ k: 'DISCIPLINES', t: settings.roles.join(' / ') })

  const av = settings.avatar
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = fig.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5) * 2))
    el.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5) * 2))
  }

  return (
    <section id="sheet-notes" data-sheet className={`${s.sheet} ${s.notesSheet}`} aria-labelledby="h-notes">
      <div className={s.wrap}>
        <SheetHead id="h-notes" part={sh.part} tag="GENERAL NOTES" title="About" />
        <div className={s.notesGrid}>
          <ol className={s.notes}>
            {notes.slice(0, 8).map((n, i) => (
              <li key={i} data-reveal>
                {n.k && <span className={s.noteKey}>{n.k}: </span>}
                {n.t}
              </li>
            ))}
          </ol>
          <div className={s.notesSide}>
            {av && (
              <figure ref={fig} className={s.portrait} onPointerMove={onMove} data-reveal data-dim>
                <div className={s.portraitCircle}>
                  <Image
                    src={imgSrc(av)}
                    alt={av.alt || `Portrait of ${settings.name}`}
                    fill
                    sizes="(max-width: 768px) 60vw, 300px"
                    placeholder={av.blur ? 'blur' : 'empty'}
                    blurDataURL={av.blur}
                  />
                </div>
                <svg className={s.portraitMarks} viewBox="0 0 320 320" aria-hidden="true">
                  <circle cx="160" cy="160" r="150" className={s.dashRing} />
                  <path d="M0 160H20M300 160H320M160 0V20M160 300V320" />
                  <path d="M262 262L300 300H318" className={s.leaderPath} />
                  <circle cx="262" cy="262" r="3" className={s.leaderDot} />
                </svg>
                <figcaption>
                  DETAIL A <span>(2:1)</span>
                </figcaption>
              </figure>
            )}
            {settings.stats.length > 0 && (
              <table className={s.dataTable} data-reveal>
                <caption>DESIGN DATA</caption>
                <tbody>
                  {settings.stats.map((st) => (
                    <tr key={st.label}>
                      <th scope="row">{st.label}</th>
                      <td>{st.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
