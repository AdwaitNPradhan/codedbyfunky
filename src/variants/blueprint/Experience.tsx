'use client'

import { useMemo } from 'react'
import { useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { KIND_LABEL, revLetter, track, ym } from './util'
import type { ExperienceItem, Settings } from '@/lib/types'
import s from './sections.module.css'
import b from './base.module.css'

/** Sheet 08: experience as a revision table, newest first (REV E ... REV A). */
export function Experience({ items, settings }: { items: ExperienceItem[]; settings: Settings }) {
  const sh = useSheet('sheet-revisions')
  const rows = useMemo(() => {
    const asc = [...items].sort((a, c) => a.start.localeCompare(c.start))
    return asc.map((x, i) => ({ x, rev: revLetter(i) })).reverse()
  }, [items])
  if (!items.length) return null

  return (
    <section id="sheet-revisions" data-sheet className={`${s.sheet} ${s.revSheet}`} aria-labelledby="h-rev">
      <div className={s.wrap}>
        <SheetHead id="h-rev" part={sh.part} tag="REVISION TABLE" title="Experience" />
        <table className={s.rev} data-reveal>
          <caption className={b.vh}>Experience, newest first</caption>
          <thead>
            <tr>
              <th scope="col">REV</th>
              <th scope="col">DATE</th>
              <th scope="col">DESCRIPTION</th>
              <th scope="col">BY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ x, rev }) => (
              <tr key={x.id}>
                <td data-label="REV" className={s.revNo}>
                  {rev}
                </td>
                <td data-label="DATE" className={s.revDate}>
                  {ym(x.start)} <span aria-hidden="true">→</span>
                  <span className={b.vh}> to </span> {x.end ? ym(x.end) : 'PRESENT'}
                </td>
                <td data-label="DESCRIPTION" className={s.revDesc}>
                  <strong>{x.role}</strong>
                  <span className={s.revKind}>{KIND_LABEL[x.kind] ?? x.kind}</span>
                  {x.summary && <p>{x.summary}</p>}
                  {x.highlights.length > 0 && (
                    <ul>
                      {x.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td data-label="BY" className={s.revBy}>
                  {x.url ? (
                    <a href={x.url} target="_blank" rel="noopener noreferrer">
                      {x.org}
                    </a>
                  ) : (
                    x.org
                  )}
                  {x.location && <span>{x.location}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {settings.resumeUrl && (
          <a className={`${b.btn} ${b.btnGhost} ${s.moreBtn}`} href={settings.resumeUrl} download onClick={() => track('cta_resume', { at: 'revisions' })}>
            Download resume (PDF)
          </a>
        )}
      </div>
    </section>
  )
}
