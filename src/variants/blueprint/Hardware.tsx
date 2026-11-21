'use client'

import { useMemo, useState } from 'react'
import { useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { ExplodeLab } from './ExplodeLab'
import { Duotone } from './Duotone'
import type { HardwareProject } from '@/lib/types'
import s from './sections.module.css'
import b from './base.module.css'

const STEPS = ['Concept', 'Breadboard', 'PCB', 'Enclosure', 'Shipped']
const FILLED: Record<HardwareProject['status'], number> = { built: 5, 'in-progress': 3, planned: 1 }
const STATUS_LABEL: Record<HardwareProject['status'], string> = { built: 'BUILT', 'in-progress': 'IN PROGRESS', planned: 'PROPOSED' }

function StatusLine({ status }: { status: HardwareProject['status'] }) {
  const n = FILLED[status]
  return (
    <ol className={s.steps} data-status={status} aria-label={`Build status: ${STATUS_LABEL[status].toLowerCase()}, step ${n} of 5`}>
      {STEPS.map((label, i) => (
        <li key={label} data-state={i < n ? 'done' : i === n && status === 'in-progress' ? 'now' : 'todo'}>
          <i aria-hidden="true" />
          <span>{label}</span>
        </li>
      ))}
    </ol>
  )
}

function Sheet({ h, n, compact }: { h: HardwareProject; n: number; compact: boolean }) {
  const [open, setOpen] = useState(!compact)
  const planned = h.status === 'planned'
  const files = [
    h.links.repo && { label: 'Repo', url: h.links.repo },
    h.links.video && { label: 'Video', url: h.links.video },
    h.links.writeup && { label: 'Write-up', url: h.links.writeup },
  ].filter(Boolean) as { label: string; url: string }[]

  return (
    <article className={s.hw} id={`hardware-${h.slug}`} data-planned={planned ? '1' : undefined} data-compact={compact ? '1' : undefined} data-reveal>
      <header className={s.hwHead}>
        <h3>{h.title}</h3>
        <span className={s.status} data-status={h.status}>
          {STATUS_LABEL[h.status]}
        </span>
        <span className={`${s.hwNo} ${b.mono}`}>HW-{String(n).padStart(2, '0')}</span>
      </header>
      <div className={s.hwBody}>
        <div className={s.hwMain}>
          <p className={s.hwSummary}>{h.summary}</p>
          {h.details && <p className={s.hwDetails}>{h.details}</p>}
          <StatusLine status={h.status} />
          {compact && !open && h.components.length > 0 && (
            <ul className={s.chips} aria-label="Parts">
              {h.components.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          <table className={s.specTable}>
            <caption className={b.vh}>Specification</caption>
            <tbody>
              <tr>
                <th scope="row">STATUS</th>
                <td>{STATUS_LABEL[h.status]}</td>
              </tr>
              {h.year && (
                <tr>
                  <th scope="row">YEAR</th>
                  <td>{h.year}</td>
                </tr>
              )}
              {h.components.length > 0 && (
                <tr>
                  <th scope="row">PARTS</th>
                  <td>{h.components.length}</td>
                </tr>
              )}
              {h.tools.length > 0 && (
                <tr>
                  <th scope="row">TOOLS</th>
                  <td>{h.tools.join(' · ')}</td>
                </tr>
              )}
              {files.length > 0 && (
                <tr>
                  <th scope="row">FILES</th>
                  <td>
                    {files.map((f, i) => (
                      <span key={f.label}>
                        {i > 0 && ' · '}
                        <a href={f.url} target="_blank" rel="noopener noreferrer">
                          {f.label}
                        </a>
                      </span>
                    ))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {compact && h.components.length > 0 && (
            <button type="button" className={`${b.btn} ${b.btnGhost} ${b.btnSm}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? 'Close exploded view' : 'Open exploded view'}
            </button>
          )}
        </div>
        <div className={s.hwViz}>
          {open && h.components.length > 0 && (
            <figure className={s.hwFig}>
              <ExplodeLab title={h.title} parts={h.components} planned={planned} />
              <figcaption>
                FIG. {String(n).padStart(2, '0')}A · EXPLODED VIEW. Illustrative stack built from the parts list; enclosure outlines are generic.
              </figcaption>
            </figure>
          )}
          {h.cover && !compact && (
            <figure className={s.hwPhoto} data-dim>
              <div className={s.hwPhotoBox} style={{ aspectRatio: `${h.cover.width} / ${h.cover.height}` }}>
                <Duotone img={h.cover} sizes="(max-width: 900px) 90vw, 320px" />
              </div>
              <figcaption>FIG. {String(n).padStart(2, '0')}B · {planned ? 'CONCEPT' : 'BUILD'} IMAGE</figcaption>
            </figure>
          )}
        </div>
      </div>
    </article>
  )
}

/** Sheet 04: hardware. Featured builds get a full sheet; the rest are filed compactly and expand on demand. */
export function Hardware({ hardware }: { hardware: HardwareProject[] }) {
  const sh = useSheet('sheet-hardware')
  const sorted = useMemo(() => {
    const f = hardware.filter((x) => x.featured)
    const rest = hardware.filter((x) => !x.featured)
    return f.length ? [...f, ...rest] : hardware
  }, [hardware])
  const nFull = hardware.some((x) => x.featured) ? hardware.filter((x) => x.featured).length : Math.min(2, hardware.length)
  if (!hardware.length) return null

  return (
    <section id="sheet-hardware" data-sheet className={`${s.sheet} ${s.hwSheet}`} aria-labelledby="h-hw">
      <div className={s.wrap}>
        <SheetHead id="h-hw" part={sh.part} tag="HARDWARE" title="Hardware builds" />
        <div className={s.hwList}>
          {sorted.map((h, i) => (
            <Sheet key={h.id} h={h} n={i + 1} compact={i >= nFull} />
          ))}
        </div>
      </div>
    </section>
  )
}
