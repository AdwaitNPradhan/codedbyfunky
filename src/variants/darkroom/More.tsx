'use client'

import { useEffect, useRef, useState } from 'react'
import type { ExperienceItem, Game, HardwareProject, Skill } from '@/lib/types'
import { GameEmbed } from '@/components/games/GameEmbed'
import { Arrow, aspect, fmtDate, Pic } from './lib'
import m from './more.module.css'
import r from './root.module.css'

/* ---------- Games: "test strips". One framed screen + a rack of prints to pick from. ---------- */
export function Games({ games }: { games: Game[] }) {
  const [sel, setSel] = useState(0)
  const g = games[Math.min(sel, games.length - 1)]
  if (!g) return null
  return (
    <section id="games" className={`${r.section} ${m.games}`} data-section="games" aria-labelledby="games-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="games-h" className={r.title}>Games</h2>
          <p className={r.caption}>test strips: small browser games, playable right here</p>
        </div>

        <div className={m.gamesGrid}>
          <div className={m.stage}>
            <GameEmbed
              key={g.slug}
              game={g.component}
              title={g.title}
              className={m.screen}
              poster={(start) => (
                <button type="button" className={m.poster} onClick={start} aria-label={`Play ${g.title}`}>
                  {g.cover && <Pic img={g.cover} rendition="card" sizes="(max-width: 1100px) 100vw, 780px" />}
                  <span className={m.playBadge}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><path d="M4 2.5v13l11-6.5z" /></svg>
                    Play {g.title}
                  </span>
                </button>
              )}
            />
            <div className={m.info}>
              <h3 className={m.gameTitle}>{g.title}</h3>
              <p className={m.gameTag}>{g.tagline}</p>
              {g.controls && <p className={`${r.mono} ${m.controls}`}>controls: {g.controls}</p>}
              <a href={`/games/${g.slug}`} target="_blank" rel="noopener noreferrer" className={`${r.link} ${m.fullLink}`}>
                Open full screen <Arrow />
              </a>
            </div>
          </div>

          <ul className={m.rack} aria-label="Pick a game">
            {games.map((x, i) => (
              <li key={x.id}>
                <button type="button" className={m.print} aria-pressed={i === sel} onClick={() => setSel(i)}>
                  <span className={m.mat} style={{ aspectRatio: x.cover ? aspect(x.cover) : 4 / 3 }}>
                    {x.cover && <Pic img={x.cover} rendition="thumb" sizes="(max-width: 700px) 44vw, 180px" loading="lazy" />}
                  </span>
                  <span className={`${r.mono} ${m.printName}`}>{x.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------- Hardware: "bench notes" ---------- */
const STATUS: Record<HardwareProject['status'], string> = { built: 'built', 'in-progress': 'on the bench', planned: 'not yet developed' }

export function Hardware({ items }: { items: HardwareProject[] }) {
  if (!items.length) return null
  return (
    <section id="hardware" className={`${r.section} ${m.hardware}`} data-section="hardware" aria-labelledby="hw-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="hw-h" className={r.title}>Hardware</h2>
          <p className={r.caption}>bench notes: boards, firmware and enclosures I built myself</p>
        </div>
        <ul className={m.bench}>
          {items.map((h) => (
            <li key={h.id} className={m.benchItem}>
              <figure className={m.benchPhoto} data-status={h.status} style={{ aspectRatio: h.cover ? aspect(h.cover) : 3 / 2 }}>
                {h.cover && <Pic img={h.cover} rendition="card" sizes="(max-width: 800px) 100vw, 46vw" loading="lazy" />}
                {h.status === 'planned' && <figcaption className={`${r.mono} ${m.undeveloped}`}>not yet developed</figcaption>}
              </figure>
              <div className={m.notes}>
                <div className={m.notesHead}>
                  <h3 className={m.hwTitle}>{h.title}</h3>
                  <span className={`${r.mono} ${m.status}`} data-status={h.status}>{STATUS[h.status]}{h.year ? ` · ${h.year}` : ''}</span>
                </div>
                <p className={m.hwSummary}>{h.summary}</p>
                {h.components.length > 0 && (
                  <dl className={`${r.mono} ${m.spec}`}>
                    <dt>parts</dt>
                    <dd>{h.components.join(' / ')}</dd>
                    {h.tools.length > 0 && (
                      <>
                        <dt>tools</dt>
                        <dd>{h.tools.join(' / ')}</dd>
                      </>
                    )}
                  </dl>
                )}
                <div className={m.hwLinks}>
                  {h.links.repo && <a className={r.link} href={h.links.repo} target="_blank" rel="noopener noreferrer">Source <Arrow /></a>}
                  {h.links.video && <a className={r.link} href={h.links.video} target="_blank" rel="noopener noreferrer">Video <Arrow /></a>}
                  {h.links.writeup && <a className={r.link} href={h.links.writeup} target="_blank" rel="noopener noreferrer">Write-up <Arrow /></a>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Skills: "kit list". Words, never percentage bars. ---------- */
const GROUPS: { name: string; cats: Skill['category'][] }[] = [
  { name: 'Interface', cats: ['frontend', 'mobile'] },
  { name: 'Backend and ops', cats: ['backend', 'devops'] },
  { name: 'Bench and darkroom', cats: ['hardware', 'creative', 'tools'] },
]
const tag = (l: number) => (l >= 5 ? 'daily' : l === 4 ? 'often' : 'learning')

export function Skills({ skills }: { skills: Skill[] }) {
  const cols = GROUPS.map((g) => ({
    ...g,
    items: skills.filter((s) => g.cats.includes(s.category)).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length)
  if (!cols.length) return null
  return (
    <section id="skills" className={`${r.section} ${m.skills}`} data-section="skills" aria-labelledby="skills-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="skills-h" className={r.title}>Skills</h2>
          <p className={r.caption}>kit list, tagged by how often it is in my hands</p>
        </div>
        <div className={m.kit}>
          {cols.map((c) => (
            <div key={c.name} className={m.kitCol}>
              <h3 className={m.kitName}>{c.name}</h3>
              <ul>
                {c.items.map((s) => (
                  <li key={s.id} className={`${r.mono} ${m.kitItem}`}>
                    <span>{s.name}</span>
                    <i aria-hidden="true" />
                    <b data-tag={tag(s.level)}>{tag(s.level)}</b>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Experience: outlined years that fill on hover / when centred ---------- */
const KIND: Partial<Record<ExperienceItem['kind'], string>> = { freelance: 'freelance', education: 'education', award: 'award', talk: 'talk' }

export function Experience({ items }: { items: ExperienceItem[] }) {
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const ul = list.current
    if (!ul || typeof IntersectionObserver === 'undefined') return
    // On touch there is no hover: fill the year of the row nearest the middle of the screen.
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => ((e.target as HTMLElement).dataset.lit = e.isIntersecting ? 'true' : 'false')),
      { rootMargin: '-42% 0px -42% 0px' },
    )
    Array.from(ul.children).forEach((li) => io.observe(li))
    return () => io.disconnect()
  }, [items.length])
  if (!items.length) return null
  const sorted = [...items].sort((a, b) => (a.start < b.start ? 1 : -1))
  return (
    <section id="experience" className={`${r.section} ${m.exp}`} data-section="experience" aria-labelledby="exp-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="exp-h" className={r.title}>Experience</h2>
          <p className={r.caption}>roles, newest first</p>
        </div>
        <ul ref={list} className={m.expList}>
          {sorted.map((x) => (
            <li key={x.id} className={m.expRow}>
              <span className={m.year} aria-hidden="true">{new Date(x.start).getUTCFullYear()}</span>
              <div className={m.expBody}>
                <h3 className={m.expRole}>{x.role}</h3>
                <p className={m.expOrg}>
                  {x.url ? <a className={r.link} href={x.url} target="_blank" rel="noopener noreferrer">{x.org}</a> : x.org}
                  {x.location ? <span className={`${r.mono} ${m.expLoc}`}> · {x.location.toLowerCase()}</span> : null}
                </p>
                <p className={`${r.mono} ${m.expRange}`}>
                  {fmtDate(x.start)} – {x.end ? fmtDate(x.end) : 'present'}
                  {KIND[x.kind] ? ` · ${KIND[x.kind]}` : ''}
                </p>
                {x.summary && <p className={m.expSummary}>{x.summary}</p>}
                {x.highlights.length > 0 && (
                  <ul className={m.expHi}>
                    {x.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
