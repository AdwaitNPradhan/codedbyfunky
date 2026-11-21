'use client'

import Image from 'next/image'
import type { Project } from '@/lib/types'
import { hostOf, imgUrl, pad } from '../lib/util'
import { ArrowLeft, ArrowRight, ArrowUpRight, Btn, BtnLink, Chip } from './bits'
import { Modal } from './Modal'
import s from '../orbit.module.css'

/** Problem → Role → Stack → Approach → Outcome → Links (the order recruiters scan). */
export function CaseStudy({
  project,
  index,
  total,
  onClose,
  onStep,
  onContact,
}: {
  project: Project
  index: number
  total: number
  onClose: () => void
  onStep: (d: -1 | 1) => void
  onContact: () => void
}) {
  const p = project
  const shots = [p.cover, ...p.gallery].filter((x): x is NonNullable<typeof x> => Boolean(x)).slice(0, 4)
  return (
    <Modal label={`Case study: ${p.title}`} onClose={onClose} wide>
      <article className={s.cs}>
        <header className={s.csHead}>
          <p className={s.csCount}>
            Case study {pad(index + 1)}/{pad(total)}
          </p>
          <h2 className={s.csTitle}>{p.title}</h2>
          <p className={s.csSum}>{p.summary}</p>
        </header>

        {shots.length > 0 && (
          <div className={s.csShots} data-n={shots.length}>
            {shots.map((im, i) => (
              <figure key={im.url} className={s.csShot}>
                <Image
                  src={imgUrl(im, i === 0 ? 'hero' : 'card')}
                  alt={im.alt || `${p.title} screenshot ${i + 1}`}
                  width={im.width}
                  height={im.height}
                  sizes={i === 0 ? '(max-width: 900px) 94vw, 820px' : '(max-width: 900px) 46vw, 400px'}
                  placeholder={im.blur ? 'blur' : 'empty'}
                  blurDataURL={im.blur}
                  priority={i === 0}
                />
              </figure>
            ))}
          </div>
        )}

        <div className={s.csGrid}>
          {p.problem && (
            <section className={s.csBlock}>
              <h3>Problem</h3>
              <p>{p.problem}</p>
            </section>
          )}
          <section className={s.csBlock}>
            <h3>Role</h3>
            <p>
              {[p.role, p.client, p.year].filter(Boolean).join(' · ')}
            </p>
          </section>
          {p.stack.length > 0 && (
            <section className={s.csBlock}>
              <h3>Stack</h3>
              <ul className={s.chips}>
                {p.stack.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </ul>
            </section>
          )}
          {p.approach && (
            <section className={s.csBlock}>
              <h3>Approach</h3>
              <p>{p.approach}</p>
            </section>
          )}
          {(p.outcome || p.metrics.length > 0) && (
            <section className={s.csBlock}>
              <h3>Outcome</h3>
              {p.outcome && <p>{p.outcome}</p>}
              {p.metrics.length > 0 && (
                <dl className={s.csMetrics}>
                  {p.metrics.map((m) => (
                    <div key={m.label}>
                      <dd>{m.value}</dd>
                      <dt>{m.label}</dt>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          )}
          <section className={s.csBlock}>
            <h3>Links</h3>
            <div className={s.actions}>
              {p.links.live && (
                <BtnLink href={p.links.live} external variant="primary" cursor="OPEN">
                  Live · {hostOf(p.links.live)} <ArrowUpRight />
                </BtnLink>
              )}
              {p.links.repo && (
                <BtnLink href={p.links.repo} external cursor="OPEN">
                  Repo <ArrowUpRight />
                </BtnLink>
              )}
              {p.links.caseStudy && (
                <BtnLink href={p.links.caseStudy} external cursor="OPEN">
                  Write-up <ArrowUpRight />
                </BtnLink>
              )}
              {!p.links.live && !p.links.repo && !p.links.caseStudy && <p className={s.csMuted}>No public links yet.</p>}
            </div>
          </section>
        </div>

        <footer className={s.csFoot}>
          <Btn onClick={() => onStep(-1)} disabled={total < 2} aria-label="Previous case study">
            <ArrowLeft /> Previous
          </Btn>
          <Btn variant="primary" onClick={onContact} cursor="HIRE">
            Work with me <ArrowRight />
          </Btn>
          <Btn onClick={() => onStep(1)} disabled={total < 2} aria-label="Next case study">
            Next <ArrowRight />
          </Btn>
        </footer>
      </article>
    </Modal>
  )
}
