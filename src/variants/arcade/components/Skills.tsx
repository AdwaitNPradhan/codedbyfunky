'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import type { Skill } from '@/lib/types'
import { cx, rng, type Tone } from '../lib/misc'
import { Slab, SlabHead } from './Slab'

const CATS: Skill['category'][] = ['frontend', 'backend', 'mobile', 'devops', 'hardware', 'creative', 'tools']
const LABEL: Record<Skill['category'], string> = { frontend: 'Frontend', backend: 'Backend', mobile: 'Mobile', devops: 'DevOps', hardware: 'Hardware', creative: 'Creative', tools: 'Tools' }
const TONE: Record<Skill['category'], Tone | 'cream'> = { frontend: 'pink', backend: 'blue', mobile: 'mint', devops: 'orange', hardware: 'yellow', creative: 'lilac', tools: 'cream' }

/** Sticker sheet: die-cut stickers grouped by category, filter pills on top. */
export function Skills({ skills }: { skills: Skill[] }) {
  const [filter, setFilter] = useState<'all' | Skill['category']>('all')
  const groups = useMemo(
    () =>
      CATS.map((c) => ({ c, items: skills.filter((s) => s.category === c).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)) })).filter((g) => g.items.length),
    [skills],
  )
  if (!skills.length) return null
  const shown = filter === 'all' ? groups : groups.filter((g) => g.c === filter)

  return (
    <Slab id="skills" tone="cream" labelledBy="skills-h">
      <SlabHead id="skills-h" title="Skills" count={skills.length}>
        <p className="ar-lede">Tools I reach for. LV is how comfortable I am, from 1 (learning) to 5 (daily driver).</p>
      </SlabHead>
      <div className="ar-filters" role="group" aria-label="Filter skills by category">
        <button type="button" className={cx('ar-pill', filter === 'all' && 'is-active')} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All ({skills.length})
        </button>
        {groups.map((g) => (
          <button key={g.c} type="button" className={cx('ar-pill', filter === g.c && 'is-active')} aria-pressed={filter === g.c} onClick={() => setFilter(g.c)}>
            {LABEL[g.c]} ({g.items.length})
          </button>
        ))}
      </div>
      <div className="ar-sheet">
        {shown.map((g) => (
          <section key={g.c} className="ar-sheet__group" aria-label={LABEL[g.c]}>
            <h3 className="ar-h3 ar-sheet__title">{LABEL[g.c]}</h3>
            <ul className="ar-sheet__list">
              {g.items.map((s, i) => {
                const r = rng(s.name.length * 131 + i * 17)
                return (
                  <li key={s.id} className={cx('ar-sk', `tone-${TONE[g.c]}`)} style={{ '--r': `${(r() - 0.5) * 7}deg` } as CSSProperties}>
                    <span className="ar-sk__name">{s.name}</span>
                    <span className="ar-sk__lv">LV {s.level}{s.years ? ` · ${s.years}y` : ''}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Slab>
  )
}
