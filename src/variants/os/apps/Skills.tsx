'use client'

import { useMemo, useState } from 'react'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { levelWord, range } from '../util'
import { Empty, Ext } from './common'
import ui from './apps.module.css'

type Key = 'name' | 'category' | 'level' | 'years'

/** "Activity Monitor": skills as rows, no fake percentages. Second tab is the experience timeline. */
export default function Skills(_: AppProps) {
  const os = useOS()
  const { skills, experience } = os.data
  const [tab, setTab] = useState<'skills' | 'experience'>('skills')
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: 'level', dir: -1 })
  const cats = useMemo(() => Array.from(new Set(skills.map((s) => s.category))), [skills])
  const rows = useMemo(() => {
    const f = cat === 'all' ? skills : skills.filter((s) => s.category === cat)
    return [...f].sort((a, b) => {
      const av = a[sort.k] ?? 0
      const bv = b[sort.k] ?? 0
      return (typeof av === 'string' ? av.localeCompare(String(bv)) : Number(av) - Number(bv)) * sort.dir || a.name.localeCompare(b.name)
    })
  }, [skills, cat, sort])

  const th = (k: Key, label: string) => (
    <button
      type="button"
      className={ui.th}
      aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === 'level' || k === 'years' ? -1 : 1 }))}
    >
      {label}
      {sort.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
    </button>
  )

  return (
    <div className={ui.skills}>
      <div role="tablist" aria-label="Skills views" className={ui.tabs}>
        <button type="button" role="tab" id="sk-t-skills" aria-selected={tab === 'skills'} aria-controls="sk-panel" tabIndex={tab === 'skills' ? 0 : -1} onClick={() => setTab('skills')}>
          Skills ({skills.length})
        </button>
        <button type="button" role="tab" id="sk-t-exp" aria-selected={tab === 'experience'} aria-controls="sk-panel" tabIndex={tab === 'experience' ? 0 : -1} onClick={() => setTab('experience')}>
          Experience ({experience.length})
        </button>
      </div>
      <div id="sk-panel" role="tabpanel" aria-labelledby={tab === 'skills' ? 'sk-t-skills' : 'sk-t-exp'} className={ui.skPanel}>
        {tab === 'skills' && (
          <>
            {skills.length === 0 && <Empty>No skills in the CMS yet.</Empty>}
            {cats.length > 1 && (
              <div className={ui.filters} role="group" aria-label="Filter by kind">
                {['all', ...cats].map((c) => (
                  <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {rows.length > 0 && (
              <div className={ui.skTable}>
                <div className={ui.skHead}>
                  {th('name', 'Name')}
                  {th('category', 'Kind')}
                  {th('level', 'Level')}
                  {th('years', 'Years')}
                </div>
                <ul className={ui.skRows}>
                  {rows.map((s) => (
                    <li key={s.id} className={ui.skRow}>
                      <span className={ui.skName}>{s.name}</span>
                      <span className={ui.dim}>{s.category}</span>
                      <span className={`${ui.lvl} ${ui[`lvl_${levelWord(s.level)}`]}`}>{levelWord(s.level)}</span>
                      <span className={ui.dim}>{s.years ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {tab === 'experience' && (
          <>
            {experience.length === 0 && <Empty>No experience in the CMS yet.</Empty>}
            <ol className={ui.timeline}>
              {experience.map((e) => (
                <li key={e.id}>
                  <span className={ui.tlDot} aria-hidden="true" />
                  <p className={ui.tlWhen}>
                    {range(e.start, e.end)} · {e.kind}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                  <h3 className={ui.tlRole}>
                    {e.role}
                    <span className={ui.dim}> · {e.url ? <Ext href={e.url}>{e.org}</Ext> : e.org}</span>
                  </h3>
                  {e.summary && <p>{e.summary}</p>}
                  {e.highlights.length > 0 && (
                    <ul>
                      {e.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
