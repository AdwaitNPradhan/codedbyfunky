'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, useInView, useMotionValue } from 'motion/react'
import type { Project } from '@/lib/types'
import { addCoins, award } from '../lib/store'
import { sfx } from '../lib/sound'
import { cx, hostOf, rng, toneAt, track, useDesktop, useReduced } from '../lib/misc'
import { Icon } from './art'
import { DragCard } from './DragCard'
import { Modal } from './Modal'
import { Pic, Slab, SlabHead } from './Slab'

const PILE_SPRING = { type: 'spring', stiffness: 300, damping: 26 } as const

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function scatter(id: string, seed: number, desktop: boolean) {
  const r = rng(hash(`${id}:${seed}`))
  r()
  if (!desktop) return { x: (r() - 0.5) * 16, y: 0, r: (r() - 0.5) * 3 }
  const sign = r() > 0.5 ? 1 : -1
  return { x: (r() - 0.5) * 110, y: (r() - 0.5) * 80, r: sign * (2 + r() * 4) }
}
const tidyRot = (i: number) => (i % 2 ? 0.6 : -0.6)

function permute<T>(arr: T[], seed: number) {
  const r = rng(seed * 4099 + 11)
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Project card pile on a board. Starts scattered; Tidy up springs into a grid; Shuffle re-scatters. */
export function Work({ projects }: { projects: Project[] }) {
  const reduced = useReduced()
  const desktop = useDesktop()
  const board = useRef<HTMLDivElement>(null)
  const inView = useInView(board, { once: true, amount: 0.2 })
  const [mode, setMode] = useState<'pile' | 'tidy'>('tidy')
  const [seed, setSeed] = useState(0)
  const [permSeed, setPermSeed] = useState(0)
  const [tick, setTick] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<Project | null>(null)

  const featured = projects.filter((p) => p.featured)
  const base = (featured.length >= 3 ? featured : projects).slice(0, 6)
  const rest = projects.filter((p) => !base.includes(p))
  const list = showAll ? [...base, ...rest] : base
  // Shuffle moves cards between grid slots visually; DOM order (and tab order) never changes.
  const perm = useMemo(() => {
    const idx = list.map((_, i) => i)
    return mode === 'tidy' || !permSeed ? idx : permute(idx, permSeed)
  }, [list, mode, permSeed])

  useEffect(() => {
    const ul = board.current?.querySelector('ul')
    if (!ul) return
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    ro.observe(ul)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (inView && !reduced && mode === 'tidy' && seed === 0) {
      setMode('pile')
      setSeed(1)
    }
    // scatter once when the board scrolls into view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced])

  // Deep links: #project-<slug>
  useEffect(() => {
    const sync = () => {
      const m = location.hash.match(/^#project-(.+)$/)
      setOpen(m ? (projects.find((p) => p.slug === decodeURIComponent(m[1])) ?? null) : null)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [projects])

  const openProject = (p: Project) => {
    setOpen(p)
    history.replaceState(null, '', `#project-${p.slug}`)
    track('project_open', { slug: p.slug })
    addCoins(1)
    award('case-closed')
    sfx.pop()
  }
  const close = () => {
    setOpen(null)
    if (location.hash.startsWith('#project-'))
      history.replaceState(null, '', location.pathname + location.search)
  }

  if (!projects.length) return null

  return (
    <Slab id="work" tone="pink" labelledBy="work-h">
      <SlabHead id="work-h" title="Selected work" count={projects.length}>
        <p className="ar-lede">
          Real projects, thrown on a board. Drag them around, tidy up, or open one for the case
          study.
        </p>
        <div className="ar-toolbar" role="group" aria-label="Project pile controls">
          <button
            type="button"
            className="ar-btn ar-btn--sm ar-only-desktop"
            aria-pressed={mode === 'tidy'}
            onClick={() => (setMode('tidy'), setPermSeed(0), award('tidy-up'), sfx.pop())}
          >
            <Icon name="grid" size={18} /> Tidy up
          </button>
          <button
            type="button"
            className="ar-btn ar-btn--sm"
            onClick={() => {
              setMode('pile')
              setSeed((s) => s + 1)
              setPermSeed(seed + 1)
              award('shuffler')
              sfx.pop()
            }}
          >
            <Icon name="shuffle" size={18} /> Shuffle
          </button>
        </div>
      </SlabHead>

      <div className={cx('ar-board', mode === 'tidy' && 'is-tidy')} ref={board}>
        <ul className="ar-pile-grid">
          {list.map((p, i) => (
            <ProjectCard
              key={p.id}
              p={p}
              i={i}
              slot={perm[i] ?? i}
              mode={mode}
              seed={seed}
              tick={tick}
              desktop={desktop}
              constraints={board}
              onOpen={() => openProject(p)}
            />
          ))}
        </ul>
      </div>

      {rest.length > 0 && (
        <p className="ar-more">
          <button
            type="button"
            className="ar-btn"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? 'Show featured only' : `All work (${rest.length} more)`}
          </button>
        </p>
      )}

      <Modal
        open={!!open}
        onClose={close}
        label={open ? `${open.title}: case study` : 'Case study'}
        tone="cream"
        className="ar-case"
      >
        {open && <CaseStudy p={open} onContact={close} />}
      </Modal>
    </Slab>
  )
}

function ProjectCard({
  p,
  i,
  slot,
  mode,
  seed,
  tick,
  desktop,
  constraints,
  onOpen,
}: {
  p: Project
  i: number
  slot: number
  mode: 'pile' | 'tidy'
  seed: number
  tick: number
  desktop: boolean
  constraints: React.RefObject<HTMLElement | null>
  onOpen: () => void
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rot = useMotionValue(tidyRot(i))
  const reduced = useReduced()
  const target = useRef({ x: 0, y: 0, r: tidyRot(i) })

  useEffect(() => {
    const el = document.getElementById(`dc-proj-${p.id}`)
    const slotEl = el?.parentElement?.children[slot] as HTMLElement | undefined
    // natural (untransformed) grid position of the slot this card should sit in
    const base =
      el && slotEl
        ? { x: slotEl.offsetLeft - el.offsetLeft, y: slotEl.offsetTop - el.offsetTop }
        : { x: 0, y: 0 }
    const s = mode === 'tidy' ? { x: 0, y: 0, r: tidyRot(slot) } : scatter(p.id, seed, desktop)
    target.current = { x: base.x + s.x, y: base.y + s.y, r: reduced ? 0 : s.r }
    animate(x, target.current.x, PILE_SPRING)
    animate(y, target.current.y, PILE_SPRING)
    animate(rot, target.current.r, PILE_SPRING)
  }, [mode, seed, slot, tick, desktop, reduced, p.id, x, y, rot])

  const tone = toneAt(i + 1)
  return (
    <DragCard
      as="li"
      id={`proj-${p.id}`}
      x={x}
      y={y}
      restMV={rot}
      rest={tidyRot(i)}
      home={() => ({ x: target.current.x, y: target.current.y })}
      constraints={constraints}
      drag={desktop}
      className="ar-pcard-wrap"
    >
      <article
        className={cx('ar-pcard', `tone-${tone}`)}
        aria-labelledby={`proj-t-${p.id}`}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a,button')) onOpen()
        }}
      >
        <div className="ar-pcard__cover">
          <Pic
            img={p.cover}
            sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 420px"
            alt={p.cover?.alt || `${p.title} cover`}
          />
          {p.year && <span className="ar-chip ar-pcard__year">{p.year}</span>}
        </div>
        <div className="ar-pcard__body">
          <h3 id={`proj-t-${p.id}`} className="ar-h3">
            {p.title}
          </h3>
          <p className="ar-pcard__sum">{p.summary}</p>
          {p.stack.length > 0 && (
            <ul className="ar-tags" aria-label="Stack">
              {p.stack.slice(0, 5).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <div className="ar-pcard__actions">
            <button
              type="button"
              className="ar-btn ar-btn--sm ar-btn--ink"
              onClick={onOpen}
              aria-label={`Case study: ${p.title}`}
            >
              Case study <Icon name="arrow" size={16} />
            </button>
            {p.links.live && (
              <a
                className="ar-btn ar-btn--sm"
                href={p.links.live}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${p.title}: live site (opens in a new tab)`}
              >
                Live <Icon name="external" size={16} />
              </a>
            )}
          </div>
        </div>
      </article>
    </DragCard>
  )
}

function CaseStudy({ p, onContact }: { p: Project; onContact: () => void }) {
  const gallery = p.gallery.slice(0, 3)
  return (
    <article className="ar-cs">
      <h2 className="ar-h2 ar-h2--md">{p.title}</h2>
      <p className="ar-lede ar-lede--big">{p.summary}</p>
      <div className="ar-cs__cover">
        <Pic
          img={p.cover}
          sizes="(max-width: 900px) 92vw, 760px"
          priority
          alt={p.cover?.alt || `${p.title} cover`}
        />
      </div>

      {p.problem && (
        <section>
          <h3 className="ar-h3">Problem</h3>
          <p>{p.problem}</p>
        </section>
      )}
      <section>
        <h3 className="ar-h3">Role</h3>
        <p>{[p.role, p.client, p.year].filter(Boolean).join(' · ') || 'Solo build'}</p>
      </section>
      {p.stack.length > 0 && (
        <section>
          <h3 className="ar-h3">Stack</h3>
          <ul className="ar-tags">
            {p.stack.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
      {p.approach && (
        <section>
          <h3 className="ar-h3">Approach</h3>
          <p>{p.approach}</p>
        </section>
      )}
      {(p.outcome || p.metrics.length > 0) && (
        <section>
          <h3 className="ar-h3">Outcome</h3>
          {p.outcome && <p>{p.outcome}</p>}
          {p.metrics.length > 0 && (
            <ul className="ar-cs__metrics">
              {p.metrics.map((m) => (
                <li key={m.label} className="ar-fact-static">
                  <strong>{m.value}</strong>
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {gallery.length > 0 && (
        <ul className="ar-cs__gallery">
          {gallery.map((g, i) => (
            <li key={i}>
              <Pic
                img={g}
                sizes="(max-width: 900px) 46vw, 360px"
                thumb
                alt={g.alt || `${p.title} detail ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="ar-cs__links">
        {p.links.live && (
          <a
            className="ar-btn ar-btn--mint"
            href={p.links.live}
            target="_blank"
            rel="noopener noreferrer"
          >
            Live site · {hostOf(p.links.live)} <Icon name="external" size={16} />
          </a>
        )}
        {p.links.repo && (
          <a className="ar-btn" href={p.links.repo} target="_blank" rel="noopener noreferrer">
            Repo <Icon name="external" size={16} />
          </a>
        )}
        {p.links.caseStudy && (
          <a className="ar-btn" href={p.links.caseStudy} target="_blank" rel="noopener noreferrer">
            Write-up <Icon name="external" size={16} />
          </a>
        )}
        <a className="ar-btn ar-btn--pink" href="#contact" onClick={onContact}>
          Contact
        </a>
      </div>
    </article>
  )
}
