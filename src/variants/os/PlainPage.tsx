import type { ReactNode } from 'react'
import type { SiteData } from '@/lib/types'
import { fontVars } from './fonts'
import { local } from './Pic'
import { levelWord, monthYear, range, resumeFileName, social } from './util'
import styles from './os.module.css'

/**
 * The portfolio as a normal document. Server-rendered in both modes:
 * visible (`/os?plain=1`) it is the plain page; hidden (clip, never display:none) it gives crawlers and screen readers everything.
 */
export function PlainContent({ data, visible }: { data: SiteData; visible: boolean }) {
  const s = data.settings
  const tab = visible ? undefined : -1
  const A = ({ href, children, ext, ...r }: { href: string; children: ReactNode; ext?: boolean; className?: string; download?: string }) => (
    <a href={href} tabIndex={tab} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...r}>
      {children}
    </a>
  )
  const gh = social(data, 'github')
  const li = social(data, 'linkedin')
  const ig = s.instagram.url || social(data, 'instagram')
  const cats = Array.from(new Set(data.skills.map((x) => x.category)))

  return (
    <main id="plain-main" className={visible ? styles.plainBody : undefined} aria-label={`${s.name}, portfolio`}>
      <h1>
        {s.name}
        {s.roles[0] ? `, ${s.roles[0]}` : ''}
      </h1>
      {s.tagline && <p>{s.tagline}</p>}
      {s.availability.status !== 'closed' && (
        <p>
          <strong>{s.availability.status === 'open' ? 'Open to work.' : 'Selective availability.'}</strong> {s.availability.note}
        </p>
      )}
      {(s.location || s.timezone) && <p>{[s.location, s.timezone].filter(Boolean).join(' · ')}</p>}
      <p className={styles.plainCta}>
        {s.publicEmail && (
          <A href={`mailto:${s.publicEmail}`} className="primary">
            Email {s.publicEmail}
          </A>
        )}
        {s.resumeUrl && (
          <A href={s.resumeUrl} download={resumeFileName(s.resumeUrl, s.name)}>
            Download resume (PDF)
          </A>
        )}
        {gh && (
          <A href={gh} ext>
            GitHub
          </A>
        )}
        {li && (
          <A href={li} ext>
            LinkedIn
          </A>
        )}
        {ig && (
          <A href={ig} ext>
            Instagram {s.instagram.handle}
          </A>
        )}
      </p>

      <section aria-labelledby="p-about">
        <h2 id="p-about">About</h2>
        {(s.longBio || s.shortBio).split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        {s.roles.length > 0 && <ul className={styles.plainChips}>{s.roles.map((r) => <li key={r}>{r}</li>)}</ul>}
      </section>

      {data.projects.length > 0 && (
        <section aria-labelledby="p-work">
          <h2 id="p-work">Projects</h2>
          {data.projects.map((p) => (
            <article key={p.id} id={`project-${p.slug}`}>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <p>{[p.role, p.client, p.year].filter(Boolean).join(' · ')}</p>
              {p.stack.length > 0 && <ul className={styles.plainChips}>{p.stack.map((x) => <li key={x}>{x}</li>)}</ul>}
              {p.problem && <p><strong>Problem.</strong> {p.problem}</p>}
              {p.approach && <p><strong>Approach.</strong> {p.approach}</p>}
              {p.outcome && <p><strong>Outcome.</strong> {p.outcome}</p>}
              <p>
                {p.links.live && <A href={p.links.live} ext>Live</A>}
                {p.links.live && p.links.repo ? ' · ' : ''}
                {p.links.repo && <A href={p.links.repo} ext>Repo</A>}
              </p>
            </article>
          ))}
        </section>
      )}

      {data.photos.length > 0 && (
        <section aria-labelledby="p-photo">
          <h2 id="p-photo">Photography</h2>
          {s.instagram.pitch && <p>{s.instagram.pitch}</p>}
          {ig && (
            <p>
              <A href={ig} ext>
                Follow {s.instagram.handle} on Instagram
              </A>
            </p>
          )}
          <div className={visible ? styles.plainGrid : undefined}>
            {data.photos.map((p) => (
              <figure key={p.id} style={{ margin: 0 }}>
                {visible && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={local(p.image.thumb ?? p.image.card ?? p.image.url)} alt={p.image.alt || p.title} loading="lazy" width={p.image.width} height={p.image.height} />
                )}
                <figcaption>
                  {p.title}
                  {p.location ? `, ${p.location}` : ''}
                  {p.takenAt ? ` (${monthYear(p.takenAt)})` : ''}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {data.games.length > 0 && (
        <section aria-labelledby="p-games">
          <h2 id="p-games">Games</h2>
          <ul>
            {data.games.map((g) => (
              <li key={g.id}>
                <A href={`/games/${g.slug}`}>{g.title}</A>: {g.tagline} <em>({g.controls})</em>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.hardware.length > 0 && (
        <section aria-labelledby="p-hw">
          <h2 id="p-hw">Hardware</h2>
          {data.hardware.map((h) => (
            <article key={h.id}>
              <h3>
                {h.title} <small>({h.status === 'in-progress' ? 'in progress' : h.status}{h.year ? `, ${h.year}` : ''})</small>
              </h3>
              <p>{h.summary}</p>
              {h.components.length > 0 && <ul className={styles.plainChips}>{h.components.map((x) => <li key={x}>{x}</li>)}</ul>}
            </article>
          ))}
        </section>
      )}

      {data.skills.length > 0 && (
        <section aria-labelledby="p-skills">
          <h2 id="p-skills">Skills</h2>
          {cats.map((c) => (
            <div key={c}>
              <h3>{c}</h3>
              <ul className={styles.plainChips}>
                {data.skills.filter((x) => x.category === c).map((x) => (
                  <li key={x.id}>
                    {x.name} ({levelWord(x.level)})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {data.experience.length > 0 && (
        <section aria-labelledby="p-exp">
          <h2 id="p-exp">Experience</h2>
          {data.experience.map((e) => (
            <article key={e.id}>
              <h3>
                {e.role}, {e.org}
              </h3>
              <p>
                {range(e.start, e.end)}
                {e.location ? ` · ${e.location}` : ''}
              </p>
              {e.summary && <p>{e.summary}</p>}
              {e.highlights.length > 0 && <ul>{e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="p-contact">
        <h2 id="p-contact">Contact</h2>
        <p>
          {s.publicEmail ? (
            <>
              Email <A href={`mailto:${s.publicEmail}`}>{s.publicEmail}</A>, or{' '}
            </>
          ) : null}
          <A href="/os">open the desktop</A> and use the Mail app to send a message.
        </p>
      </section>
    </main>
  )
}

export function PlainView({ data, onDesktop }: { data: SiteData; onDesktop?: () => void }) {
  return (
    <div data-variant="os" className={`${styles.plain} ${fontVars}`}>
      <header className={styles.plainHead}>
        <span>FunkyOS · plain page</span>
        <a
          href="/os"
          onClick={(e) => {
            if (!onDesktop) return
            e.preventDefault()
            onDesktop()
          }}
        >
          Open the desktop →
        </a>
        <a href="#p-contact">Contact</a>
        {data.settings.resumeUrl && (
          <a href={data.settings.resumeUrl} download={resumeFileName(data.settings.resumeUrl, data.settings.name)}>
            Resume
          </a>
        )}
      </header>
      <PlainContent data={data} visible />
    </div>
  )
}
