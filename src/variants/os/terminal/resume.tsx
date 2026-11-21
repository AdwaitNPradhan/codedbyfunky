import type { SiteData } from '@/lib/types'
import { levelWord, range, social } from '../util'
import ui from '../apps/apps.module.css'

const RULE = '─'.repeat(46)
const KIND_TITLES: Record<string, string> = {
  job: 'EXPERIENCE',
  freelance: 'EXPERIENCE',
  education: 'EDUCATION',
  award: 'AWARDS',
  talk: 'TALKS',
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
)

/** The resume as formatted terminal text, built from the CMS. `download` adds the PDF button. */
export function ResumeView({ data, download }: { data: SiteData; download?: () => void }) {
  const s = data.settings
  const gh = social(data, 'github')
  const li = social(data, 'linkedin')
  const ig = s.instagram.url || social(data, 'instagram')

  const groups = new Map<string, typeof data.experience>()
  for (const e of data.experience) {
    const k = KIND_TITLES[e.kind] ?? 'EXPERIENCE'
    groups.set(k, [...(groups.get(k) ?? []), e])
  }
  const cats = Array.from(new Set(data.skills.map((x) => x.category)))
  const top = data.projects.filter((p) => p.featured).slice(0, 4)
  const H = ({ children }: { children: string }) => (
    <>
      <div className={ui.tHead}>{`\n${children}`}</div>
      <div className={ui.tDim}>{RULE}</div>
    </>
  )

  return (
    <div className={ui.tOut}>
      <div className={ui.tHead}>{s.name.toUpperCase()}</div>
      <div>{s.roles.join(' · ')}</div>
      <div className={ui.tDim}>
        {[s.location, s.timezone, s.availability.status !== 'closed' ? s.availability.note : '']
          .filter(Boolean)
          .join(' · ')}
      </div>

      <H>SUMMARY</H>
      <div className={ui.tWrap}>{s.longBio || s.shortBio}</div>

      {Array.from(groups.entries()).map(([title, items]) => (
        <div key={title}>
          <H>{title}</H>
          {items.map((e) => (
            <div key={e.id} className={ui.tWrap}>
              {`${range(e.start, e.end)}  ${e.role} · ${e.org}${e.location ? ` · ${e.location}` : ''}`}
              {e.summary ? `\n  ${e.summary}` : ''}
              {e.highlights.map((h) => `\n  • ${h}`).join('')}
              {'\n'}
            </div>
          ))}
        </div>
      ))}

      {cats.length > 0 && (
        <>
          <H>SKILLS</H>
          {cats.map((c) => (
            <div key={c} className={ui.tWrap}>
              {`${c.padEnd(9)} ${data.skills
                .filter((x) => x.category === c)
                .sort((a, b) => b.level - a.level)
                .map((x) => `${x.name}${x.level >= 5 ? '*' : ''}`)
                .join(', ')}`}
            </div>
          ))}
          <div className={ui.tDim}>{`* ${levelWord(5)} use`}</div>
        </>
      )}

      {top.length > 0 && (
        <>
          <H>SELECTED PROJECTS</H>
          {top.map((p) => (
            <div key={p.id} className={ui.tWrap}>
              {`${p.title}${p.year ? ` (${p.year})` : ''}: ${p.summary}`}
            </div>
          ))}
        </>
      )}

      <H>CONTACT</H>
      {s.publicEmail && (
        <div>
          email {'    '}
          <A href={`mailto:${s.publicEmail}`}>{s.publicEmail}</A>
        </div>
      )}
      {gh && (
        <div>
          github {'   '}
          <A href={gh}>{gh}</A>
        </div>
      )}
      {li && (
        <div>
          linkedin {' '}
          <A href={li}>{li}</A>
        </div>
      )}
      {ig && (
        <div>
          instagram{' '}
          <A href={ig}>{ig}</A>
        </div>
      )}
      <div className={ui.tDim}>{`\n${RULE}`}</div>
      {s.resumeUrl ? (
        <div>
          PDF: <A href={s.resumeUrl}>{s.resumeUrl}</A>
          {download && (
            <>
              {'  '}
              <button type="button" className={ui.tLink} onClick={download}>
                [download]
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={ui.tDim}>PDF: not uploaded yet.</div>
      )}
    </div>
  )
}
