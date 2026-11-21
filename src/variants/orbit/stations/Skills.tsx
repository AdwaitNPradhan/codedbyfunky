'use client'

import clsx from 'clsx'
import { SKILL_LABEL, SKILL_ORDER } from '../lib/items'
import { useOrbit } from '../lib/store'
import { monthYear } from '../lib/util'
import { ArrowUpRight, BtnLink } from '../ui/bits'
import { Panel, Station, Title } from './Station'
import s from '../orbit.module.css'

const KIND_LABEL = { job: 'Job', freelance: 'Freelance', education: 'Education', award: 'Award', talk: 'Talk' } as const

export function Skills() {
  const { data, api, skillGroup, mobile } = useOrbit()
  const groups = SKILL_ORDER.map((cat) => ({ cat, items: data.skills.filter((k) => k.category === cat) })).filter((g) => g.items.length)
  const exp = data.experience
  if (!groups.length && !exp.length) return null

  return (
    <Station i={5}>
      <Panel station={5} a={0} b={mobile && exp.length ? 0.52 : 1} label="Skills">
        <div className={clsx(s.copy, s.colL)}>
          <Title id="skills-title">Skills</Title>
          <div className={s.groups}>
            {groups.map((g) => (
              <div
                key={g.cat}
                role="group"
                className={s.group}
                data-lit={skillGroup === g.cat ? 'true' : undefined}
                data-rise
                onPointerEnter={() => api.setSkillGroup(g.cat)}
                onPointerLeave={() => api.setSkillGroup(null)}
                onFocus={() => api.setSkillGroup(g.cat)}
                onBlur={() => api.setSkillGroup(null)}
                tabIndex={0}
                aria-label={SKILL_LABEL[g.cat]}
              >
                <h3 className={s.groupName}>{SKILL_LABEL[g.cat]}</h3>
                <ul className={s.skillList}>
                  {g.items.map((k) => (
                    <li key={k.id}>{k.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {exp.length > 0 && (
        <Panel station={5} a={mobile ? 0.58 : 0} b={1} label="Experience">
          <div className={clsx(s.copy, s.colR)}>
            <h2 className={s.title2} data-title id="exp-title">
              Experience
            </h2>
            <ol className={s.timeline}>
              {exp.map((e, i) => (
                <li
                  key={e.id}
                  className={s.tl}
                  data-rise
                  onPointerEnter={() => api.hoverKey(`exp:${i}`)}
                  onPointerLeave={() => api.hoverKey(null)}
                >
                  <p className={s.tlYears}>
                    {monthYear(e.start)} – {e.end ? monthYear(e.end) : 'Present'}
                    {e.kind !== 'job' && <span className={s.tlKind}> · {KIND_LABEL[e.kind]}</span>}
                  </p>
                  <h3 className={s.tlRole}>
                    {e.role}
                    {e.org && <span className={s.tlOrg}> · {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">{e.org}</a> : e.org}</span>}
                  </h3>
                  {e.summary && <p className={s.tlSum}>{e.summary}</p>}
                </li>
              ))}
            </ol>
            {data.settings.resumeUrl && (
              <BtnLink href={data.settings.resumeUrl} download variant="text" className={s.tlResume}>
                Full history in the resume <ArrowUpRight />
              </BtnLink>
            )}
          </div>
        </Panel>
      )}
    </Station>
  )
}
