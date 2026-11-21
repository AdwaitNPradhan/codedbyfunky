'use client'

import { useEffect, useMemo, useState } from 'react'
import { useBP, useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { CATEGORY_LABEL, CATEGORY_ORDER, skillMatches } from './util'
import type { Project, Skill } from '@/lib/types'
import s from './sections.module.css'

type Chip = { key: string; label: string; skills: Skill[] }

/** One DIP package per category (max 16 pins). Odd counts get a NC pin, like a real part. */
function chips(skills: Skill[]): Chip[] {
  const out: Chip[] = []
  for (const cat of CATEGORY_ORDER) {
    const list = skills.filter((k) => k.category === cat)
    for (let i = 0; i < list.length; i += 16) {
      const part = list.slice(i, i + 16)
      const suffix = list.length > 16 ? ` ${String.fromCharCode(65 + i / 16)}` : ''
      out.push({ key: `${cat}-${i}`, label: `${CATEGORY_LABEL[cat] ?? cat.toUpperCase()}${suffix}`, skills: part })
    }
  }
  return out
}

const Level = ({ n }: { n: number }) => (
  <span className={s.level} aria-hidden="true">
    {[1, 2, 3, 4, 5].map((i) => (
      <i key={i} data-on={i <= n ? '1' : undefined} />
    ))}
  </span>
)

/** Sheet 07: skills as a pinout. Hovering a pin lights the matching rows in the BOM. */
export function Skills({ skills, projects }: { skills: Skill[]; projects: Project[] }) {
  const sh = useSheet('sheet-pinout')
  const { setActiveSkill, activeSkill } = useBP()
  const [hover, setHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const list = useMemo(() => chips(skills), [skills])
  const byName = useMemo(() => new Map(skills.map((k) => [k.name, k])), [skills])

  useEffect(() => {
    setActiveSkill(hover ?? pinned)
  }, [hover, pinned, setActiveSkill])
  useEffect(() => () => setActiveSkill(null), [setActiveSkill])

  if (!skills.length) return null
  const cur = activeSkill ? byName.get(activeSkill) : null
  const uses = activeSkill ? projects.filter((p) => skillMatches(activeSkill, p.stack)).length : 0

  const pin = (k: Skill, no: number) => (
    <li key={k.id} className={s.pinItem}>
      <button
        type="button"
        className={s.pin}
        data-active={activeSkill === k.name ? '1' : undefined}
        aria-pressed={pinned === k.name}
        aria-label={`Pin ${no}: ${k.name}, level ${k.level} of 5${k.years ? `, ${k.years} years` : ''}`}
        style={{ ['--lv' as string]: k.level }}
        onPointerEnter={(e) => e.pointerType !== 'touch' && setHover(k.name)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(k.name)}
        onBlur={() => setHover(null)}
        onClick={() => setPinned((p) => (p === k.name ? null : k.name))}
      >
        <span className={s.pinLabel}>{k.name}</span>
        <span className={s.pinNo}>{no}</span>
        <span className={s.pinStub} />
      </button>
    </li>
  )

  return (
    <section id="sheet-pinout" data-sheet className={`${s.sheet} ${s.pinSheet}`} aria-labelledby="h-pin">
      <div className={s.wrap}>
        <SheetHead id="h-pin" part={sh.part} tag="PINOUT" title="Skills" />
        <p className={s.pinReadout} role="status" aria-live="polite">
          {cur ? (
            <>
              <strong>{cur.name}</strong>
              <span>LEVEL {cur.level}/5</span>
              {cur.years ? <span>{cur.years} YRS</span> : null}
              <span>{uses ? `USED IN ${uses} BOM ITEM${uses > 1 ? 'S' : ''}` : 'NOT LISTED IN BOM STACKS'}</span>
            </>
          ) : (
            'HOVER OR TAP A PIN: MATCHING BOM ITEMS LIGHT UP'
          )}
        </p>

        {/* desktop / tablet: DIP packages */}
        <div className={s.ics}>
          {list.map((c, ci) => {
            const pins: (Skill | null)[] = [...c.skills]
            if (pins.length % 2) pins.push(null)
            const half = pins.length / 2
            const left = pins.slice(0, half).map((k, i) => ({ k, no: i + 1 }))
            const right = pins
              .slice(half)
              .map((k, i) => ({ k, no: half + i + 1 }))
              .reverse()
            return (
              <figure key={c.key} className={s.ic} data-reveal>
                <div className={s.icCol} data-side="l">
                  <ul>
                    {left.map(({ k, no }) =>
                      k ? (
                        pin(k, no)
                      ) : (
                        <li key={`nc${no}`} className={s.pinItem}>
                          <span className={`${s.pin} ${s.pinNC}`}>
                            <span className={s.pinLabel}>NC</span>
                            <span className={s.pinNo}>{no}</span>
                            <span className={s.pinStub} />
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div className={s.icBody} style={{ ['--rows' as string]: half }}>
                  <span className={s.icNotch} aria-hidden="true" />
                  <figcaption>
                    <span className={s.icRef}>U{ci + 1}</span>
                    <span className={s.icName}>{c.label}</span>
                  </figcaption>
                </div>
                <div className={s.icCol} data-side="r">
                  <ul>
                    {right.map(({ k, no }) =>
                      k ? (
                        pin(k, no)
                      ) : (
                        <li key={`nc${no}`} className={s.pinItem}>
                          <span className={`${s.pin} ${s.pinNC}`}>
                            <span className={s.pinLabel}>NC</span>
                            <span className={s.pinNo}>{no}</span>
                            <span className={s.pinStub} />
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </figure>
            )
          })}
        </div>

        {/* mobile: accordion */}
        <div className={s.accordion}>
          {list.map((c, ci) => (
            <details key={c.key} className={s.acc} open={ci === 0}>
              <summary>
                <span className={s.icRef}>U{ci + 1}</span>
                <span>{c.label}</span>
                <span className={s.accCount}>{c.skills.length}</span>
              </summary>
              <ul>
                {c.skills.map((k) => (
                  <li key={k.id}>
                    <button
                      type="button"
                      data-active={activeSkill === k.name ? '1' : undefined}
                      aria-pressed={pinned === k.name}
                      onClick={() => setPinned((p) => (p === k.name ? null : k.name))}
                    >
                      <span>{k.name}</span>
                      <Level n={k.level} />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
