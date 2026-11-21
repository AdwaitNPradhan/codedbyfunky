import type { ExperienceItem } from '@/lib/types'
import { cx, fmtMonth, toneAt } from '../lib/misc'
import { Icon } from './art'
import { Slab, SlabHead } from './Slab'

const KIND: Record<ExperienceItem['kind'], string> = { job: 'JOB', freelance: 'FREELANCE', education: 'SCHOOL', award: 'AWARD', talk: 'TALK' }

/** Level select: every job is a level on a dashed path. Newest first, level number counts up with age. */
export function Experience({ items }: { items: ExperienceItem[] }) {
  if (!items.length) return null
  return (
    <Slab id="experience" tone="lilac" labelledBy="exp-h">
      <SlabHead id="exp-h" title="Experience" count={items.length}>
        <p className="ar-lede">Level select. Newest level first, each with its boss fight.</p>
      </SlabHead>
      <ol className="ar-path">
        {items.map((e, i) => {
          const end = e.end ? fmtMonth(e.end) : 'Now'
          const [boss, ...more] = e.highlights
          return (
            <li key={e.id} className={cx('ar-lvl', i % 2 === 1 && 'is-right')}>
              <div className="ar-lvl__badge" aria-hidden="true">
                <span>LV</span>
                <strong>{items.length - i}</strong>
              </div>
              <article className={cx('ar-lvl__card', `tone-${i === 0 ? 'yellow' : toneAt(i + 1) === 'lilac' ? 'cream' : toneAt(i + 1)}`)} aria-label={`${e.role}, ${e.org}`}>
                <p className="ar-lvl__when">
                  {fmtMonth(e.start)} – {end}
                  <span className="ar-chip ar-chip--cream">{KIND[e.kind]}</span>
                </p>
                <h3 className="ar-h3">{e.role}</h3>
                <p className="ar-lvl__org">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer">
                      {e.org} <Icon name="external" size={14} />
                    </a>
                  ) : (
                    e.org
                  )}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                {e.summary && <p>{e.summary}</p>}
                {boss && (
                  <p className="ar-lvl__boss">
                    <span>BOSS FIGHT</span> {boss}
                  </p>
                )}
                {more.length > 0 && (
                  <ul className="ar-lvl__more">
                    {more.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          )
        })}
      </ol>
    </Slab>
  )
}
