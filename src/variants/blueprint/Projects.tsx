'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from './gsap'
import { useBP, useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { Overlay, CloseButton } from './Overlay'
import { imgSrc, pad2, skillMatches, track } from './util'
import type { Img, Project } from '@/lib/types'
import s from './sections.module.css'
import b from './base.module.css'

const VISIBLE = 8

function Fig({ img, n, sizes, priority }: { img: Img; n: number; sizes: string; priority?: boolean }) {
  return (
    <figure className={s.dwgFig} data-dim>
      <div className={s.dwgFigBox} style={{ aspectRatio: `${img.width} / ${img.height}` }}>
        <Image
          src={imgSrc(img)}
          alt={img.alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={img.blur ? 'blur' : 'empty'}
          blurDataURL={img.blur}
        />
      </div>
      <figcaption>FIG. {pad2(n)}</figcaption>
    </figure>
  )
}

/** Case study as an assembly drawing sheet. Problem, role, stack, approach, outcome, links. */
function ProjectSheet({
  list,
  index,
  onClose,
  onNav,
}: {
  list: Project[]
  index: number
  onClose: () => void
  onNav: (i: number) => void
}) {
  const { scrollTo } = useBP()
  const p = list[index]
  const imgs = [p.cover, ...p.gallery].filter((x): x is Img => Boolean(x))
  const go = useCallback((d: number) => onNav((index + d + list.length) % list.length), [index, list.length, onNav])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [go])

  return (
    <Overlay label={`${p.title}: assembly drawing`} onClose={onClose} className={s.dwgOverlay}>
      <article className={s.drawing} key={p.id}>
        <div className={b.sheetBar}>
          <span className={b.mono}>
            ASSEMBLY DRAWING · {pad2(index + 1)}/{pad2(list.length)}
          </span>
          <span className={s.dwgNav}>
            {list.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous project">
                  <svg viewBox="0 0 16 8" width="16" height="8" aria-hidden="true">
                    <path d="M16 4H1M5 0.5L1 4L5 7.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
                  </svg>
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next project">
                  <svg viewBox="0 0 16 8" width="16" height="8" aria-hidden="true">
                    <path d="M0 4H15M11 0.5L15 4L11 7.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
                  </svg>
                </button>
              </>
            )}
          </span>
          <CloseButton onClick={onClose} />
        </div>
        <div className={s.dwgBody} data-lenis-prevent>
          <div className={s.dwgFigs}>
            {imgs.map((im, i) => (
              <Fig key={im.url} img={im} n={i + 1} priority={i === 0} sizes="(max-width: 900px) 100vw, 46vw" />
            ))}
          </div>
          <div className={s.dwgText}>
            <h3 className={s.dwgTitle}>{p.title}</h3>
            <p className={s.dwgLede}>{p.summary}</p>
            {p.problem && (
              <section>
                <h4>Problem</h4>
                <p>{p.problem}</p>
              </section>
            )}
            <dl className={s.dwgSpec}>
              {p.role && (
                <div>
                  <dt>ROLE</dt>
                  <dd>{p.role}</dd>
                </div>
              )}
              {p.year && (
                <div>
                  <dt>YEAR</dt>
                  <dd>{p.year}</dd>
                </div>
              )}
              {p.client && (
                <div>
                  <dt>FOR</dt>
                  <dd>{p.client}</dd>
                </div>
              )}
              {p.stack.length > 0 && (
                <div className={s.dwgStack}>
                  <dt>STACK</dt>
                  <dd>
                    <ul>
                      {p.stack.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
            {p.approach && (
              <section>
                <h4>Approach</h4>
                <p>{p.approach}</p>
              </section>
            )}
            {p.outcome && (
              <section>
                <h4>Outcome</h4>
                <p>{p.outcome}</p>
              </section>
            )}
            {p.metrics.length > 0 && (
              <table className={s.dataTable}>
                <caption>MEASURED</caption>
                <tbody>
                  {p.metrics.map((m) => (
                    <tr key={m.label}>
                      <th scope="row">{m.label}</th>
                      <td>{m.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className={s.dwgLinks}>
              {p.links.live && (
                <a className={`${b.btn} ${b.btnPrimary}`} href={p.links.live} target="_blank" rel="noopener noreferrer">
                  Live
                </a>
              )}
              {p.links.repo && (
                <a className={`${b.btn} ${b.btnGhost}`} href={p.links.repo} target="_blank" rel="noopener noreferrer">
                  Repo
                </a>
              )}
              {p.links.caseStudy && (
                <a className={`${b.btn} ${b.btnGhost}`} href={p.links.caseStudy} target="_blank" rel="noopener noreferrer">
                  Write-up
                </a>
              )}
              <button
                type="button"
                className={b.textLink}
                onClick={() => {
                  onClose()
                  window.setTimeout(() => scrollTo('sheet-order'), 80)
                }}
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </article>
    </Overlay>
  )
}

function Row({
  p,
  n,
  matched,
  onOpen,
  onHover,
}: {
  p: Project
  n: number
  matched: boolean
  onOpen: () => void
  onHover: (p: Project | null) => void
}) {
  const { reduced } = useBP()
  const path = useRef<SVGPathElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (path.current && reduced === false) gsap.set(path.current, { drawSVG: '0%' })
  }, [reduced])

  const enter = () => {
    onHover(p)
    const el = path.current
    const sv = svg.current
    if (el && sv) {
      // size the bracket in real pixels so DrawSVG can measure it (no non-scaling stroke)
      const h = Math.round(sv.getBoundingClientRect().height)
      sv.setAttribute('viewBox', `0 0 14 ${h}`)
      el.setAttribute('d', `M12 1H3V${h - 1}H12`)
    }
    if (el && reduced === false) {
      gsap.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out', overwrite: true })
    }
  }
  const leave = () => {
    onHover(null)
    if (path.current && reduced === false) gsap.to(path.current, { drawSVG: '100% 100%', duration: 0.2, ease: 'power2.in', overwrite: true })
  }

  return (
    <tr
      className={s.row}
      data-match={matched ? '1' : undefined}
      onPointerEnter={(e) => e.pointerType !== 'touch' && enter()}
      onPointerLeave={(e) => e.pointerType !== 'touch' && leave()}
      onClick={onOpen}
    >
      <td data-label="ITEM" className={s.cItem}>
        <svg ref={svg} className={s.bracket} viewBox="0 0 14 60" aria-hidden="true">
          <path ref={path} d="M12 1H3V59H12" />
        </svg>
        <span className={b.mono}>P-{pad2(n)}</span>
      </td>
      <td data-label="NAME" className={s.cName}>
        <button type="button" className={s.rowBtn} onClick={(e) => { e.stopPropagation(); onOpen() }} onFocus={enter} onBlur={leave}>
          {p.title}
        </button>
        <span className={s.rowSum}>{p.summary}</span>
      </td>
      <td data-label="STACK" className={s.cStack}>
        {p.stack.join(' / ')}
      </td>
      <td data-label="ROLE" className={s.cRole}>
        {p.role}
      </td>
      <td data-label="YEAR" className={s.cYear}>
        {p.year ?? ''}
      </td>
    </tr>
  )
}

/** Sheet 03: software projects as a bill of materials. */
export function Projects({ projects }: { projects: Project[] }) {
  const sh = useSheet('sheet-work')
  const { activeSkill } = useBP()
  const sorted = useMemo(() => [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)], [projects])
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [hover, setHover] = useState<Project | null>(null)
  const preview = useRef<HTMLDivElement>(null)
  const rows = showAll ? sorted : sorted.slice(0, VISIBLE)

  const openAt = useCallback(
    (i: number) => {
      setOpen(i)
      const p = sorted[i]
      track('project_open', { slug: p.slug })
      try {
        history.replaceState(null, '', `#project-${p.slug}`)
      } catch {
        /* ignore */
      }
    },
    [sorted],
  )
  const close = useCallback(() => {
    setOpen(null)
    try {
      history.replaceState(null, '', location.pathname + location.search)
    } catch {
      /* ignore */
    }
  }, [])

  // deep link: /blueprint#project-slug
  useEffect(() => {
    const m = location.hash.match(/^#project-(.+)$/)
    if (!m) return
    const i = sorted.findIndex((p) => p.slug === m[1])
    if (i >= 0) setOpen(i)
  }, [sorted])

  // preview card follows the pointer (fine pointers only)
  const onMove = (e: React.PointerEvent) => {
    const el = preview.current
    if (!el || e.pointerType === 'touch') return
    const w = 300
    const x = e.clientX + 28 + w > window.innerWidth ? e.clientX - 28 - w : e.clientX + 28
    const y = Math.min(e.clientY + 20, window.innerHeight - 280)
    el.style.transform = `translate3d(${x}px,${y}px,0)`
  }

  if (!projects.length) return null

  return (
    <section id="sheet-work" data-sheet className={`${s.sheet} ${s.workSheet}`} aria-labelledby="h-work">
      <div className={s.wrap}>
        <SheetHead id="h-work" part={sh.part} tag="BILL OF MATERIALS" title="Software projects" />
        <div className={s.bomWrap} onPointerMove={onMove} data-reveal>
          <table className={s.bom}>
            <caption className={b.vh}>Software projects. Select a row to open its assembly drawing.</caption>
            <thead>
              <tr>
                <th scope="col">ITEM</th>
                <th scope="col">NAME</th>
                <th scope="col">STACK</th>
                <th scope="col">ROLE</th>
                <th scope="col">YEAR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <Row
                  key={p.id}
                  p={p}
                  n={i + 1}
                  matched={Boolean(activeSkill && skillMatches(activeSkill, p.stack))}
                  onOpen={() => openAt(i)}
                  onHover={setHover}
                />
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length > VISIBLE && (
          <button type="button" className={`${b.btn} ${b.btnGhost} ${s.moreBtn}`} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? 'Show fewer' : `All work (${sorted.length})`}
          </button>
        )}
        {activeSkill && (
          <p className={s.matchNote} role="status">
            {sorted.filter((p) => skillMatches(activeSkill, p.stack)).length} item(s) use {activeSkill}
          </p>
        )}
      </div>

      <div ref={preview} className={s.preview} data-on={hover ? '1' : '0'} aria-hidden="true">
        {hover?.cover && (
          <div className={s.previewImg}>
            <Image
              key={hover.id}
              src={imgSrc(hover.cover, 'thumb')}
              alt=""
              fill
              sizes="300px"
              placeholder={hover.cover.blur ? 'blur' : 'empty'}
              blurDataURL={hover.cover.blur}
            />
          </div>
        )}
        {hover && (
          <p>
            <strong>{hover.title}</strong>
            {hover.summary}
          </p>
        )}
      </div>

      {open !== null && <ProjectSheet list={sorted} index={open} onClose={close} onNav={openAt} />}
    </section>
  )
}
