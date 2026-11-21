'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '../icons'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { monthYear } from '../util'
import { modifiedLabel, VERSION_FILES } from '../versions'
import type { Img } from '@/lib/types'
import { Empty } from './common'
import ui from './apps.module.css'

type Section = 'projects' | 'photos' | 'games' | 'hardware' | 'documents' | 'versions'
type Row = { id: string; name: string; kind: string; year: string; ts?: number; stack: string; img: Img | null; icon: IconName; summary: string; open: () => void }

const SECTIONS: { id: Section; label: string; icon: IconName }[] = [
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'photos', label: 'Photos', icon: 'image' },
  { id: 'games', label: 'Games', icon: 'games' },
  { id: 'hardware', label: 'Hardware', icon: 'chip' },
  { id: 'documents', label: 'Documents', icon: 'doc' },
  { id: 'versions', label: 'Old Versions', icon: 'folder' },
]

type SortKey = 'name' | 'kind' | 'year'

export default function Files({ props, active }: AppProps) {
  const os = useOS()
  const { data } = os
  const [section, setSection] = useState<Section>(SECTIONS.some((s) => s.id === props.path) ? (props.path as Section) : 'projects')
  const [view, setView] = useState<'list' | 'icons'>('list')
  const [filter, setFilter] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [ql, setQl] = useState(false)
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'year', dir: -1 })
  const listRef = useRef<HTMLDivElement>(null)

  // Deep link: `files` opened again with another path switches section.
  useEffect(() => {
    if (props.path && SECTIONS.some((s) => s.id === props.path)) setSection(props.path as Section)
  }, [props.path])

  const rows = useMemo<Row[]>(() => {
    switch (section) {
      case 'projects':
        return data.projects.map((p) => ({
          id: p.slug,
          name: p.title,
          kind: p.featured ? 'Featured project' : 'Project',
          year: p.year ? String(p.year) : '',
          stack: p.stack.join(', '),
          img: p.cover,
          icon: 'folder',
          summary: p.summary,
          open: () => os.open('preview', { slug: p.slug }),
        }))
      case 'photos':
        return data.photos.map((p) => ({
          id: p.id,
          name: p.title,
          kind: `Photo${p.series ? ` · ${p.series}` : ''}`,
          year: p.takenAt ? String(new Date(p.takenAt).getFullYear()) : '',
          stack: [p.camera, p.lens].filter(Boolean).join(', '),
          img: p.image,
          icon: 'image',
          summary: [p.location, monthYear(p.takenAt)].filter(Boolean).join(' · '),
          open: () => os.open('photos', { photo: p.id }),
        }))
      case 'games':
        return data.games.map((g) => ({
          id: g.slug,
          name: g.title,
          kind: 'Game',
          year: '',
          stack: g.controls,
          img: g.cover,
          icon: 'games',
          summary: g.tagline,
          open: () => os.open('game', { slug: g.slug }),
        }))
      case 'hardware':
        return data.hardware.map((h) => ({
          id: h.slug,
          name: h.title,
          kind: `Hardware · ${h.status === 'in-progress' ? 'in progress' : h.status}`,
          year: h.year ? String(h.year) : '',
          stack: h.components.join(', '),
          img: h.cover,
          icon: 'chip',
          summary: h.summary,
          open: () => os.open('lab', { slug: h.slug }),
        }))
      case 'versions':
        return VERSION_FILES.map((v) => ({
          id: v.file,
          name: v.file,
          kind: 'HTML document',
          year: modifiedLabel(v.modified),
          ts: Date.parse(`${v.modified}T12:00:00Z`),
          stack: v.note,
          img: null,
          icon: v.icon,
          summary: `${v.title}. ${v.note}`,
          open: () => os.open('browser', { v: v.key }),
        }))
      default: {
        const docs: Row[] = [{ id: 'readme', name: 'README.txt', kind: 'Text', year: '', stack: '', img: null, icon: 'about', summary: 'Who I am and how to reach me.', open: () => os.open('about') }]
        if (data.settings.resumeUrl)
          docs.push({ id: 'resume', name: 'Resume.pdf', kind: 'PDF', year: '', stack: '', img: null, icon: 'pdf', summary: 'My resume as a PDF.', open: () => os.open('resume') })
        return docs
      }
    }
  }, [section, data, os])

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const f = q ? rows.filter((r) => `${r.name} ${r.kind} ${r.stack}`.toLowerCase().includes(q)) : rows
    return [...f].sort((a, b) => {
      const av = a[sort.k]
      const bv = b[sort.k]
      return (sort.k === 'year' ? (a.ts ?? Number(av || 0)) - (b.ts ?? Number(bv || 0)) : av.localeCompare(bv)) * sort.dir
    })
  }, [rows, filter, sort])

  useEffect(() => {
    setSel(null)
    setQl(false)
  }, [section])

  const cur = shown.find((r) => r.id === sel) ?? null
  const move = (d: number) => {
    if (!shown.length) return
    const i = cur ? shown.indexOf(cur) : -1
    const n = shown[Math.max(0, Math.min(shown.length - 1, i < 0 ? (d > 0 ? 0 : shown.length - 1) : i + d))]
    setSel(n.id)
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-id="${CSS.escape(n.id)}"]`)?.scrollIntoView({ block: 'nearest' }))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return
    const cols = view === 'icons' ? 3 : 1
    if (e.key === 'ArrowDown') (e.preventDefault(), move(cols))
    else if (e.key === 'ArrowUp') (e.preventDefault(), move(-cols))
    else if (e.key === 'ArrowRight' && view === 'icons') (e.preventDefault(), move(1))
    else if (e.key === 'ArrowLeft' && view === 'icons') (e.preventDefault(), move(-1))
    else if (e.key === 'Enter' && cur) (e.preventDefault(), cur.open())
    else if (e.key === ' ' && cur) (e.preventDefault(), setQl((v) => !v))
    else if (e.key === 'Escape' && ql) (e.preventDefault(), setQl(false))
  }

  const th = (k: SortKey, label: string) => (
    <button
      type="button"
      className={ui.th}
      aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
    >
      {label}
      {sort.k === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
    </button>
  )

  const onPick = (r: Row) => (os.mobile ? r.open() : setSel(r.id))

  return (
    <div
      className={ui.files}
      onKeyDown={onKey}
      style={section === 'versions' ? ({ '--year-w': '96px' } as React.CSSProperties) : undefined}
    >
      <nav className={ui.side} aria-label="Locations">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className={ui.sideBtn} aria-current={section === s.id ? 'page' : undefined} onClick={() => setSection(s.id)}>
            <Icon name={s.icon} size={20} />
            <span>{s.label}</span>
          </button>
        ))}
      </nav>
      <div className={ui.main}>
        <div className={ui.toolbar}>
          <nav aria-label="Breadcrumb" className={ui.crumbs}>
            <span>FunkyOS</span>
            <span aria-hidden="true"> › </span>
            <strong aria-current="page">{SECTIONS.find((s) => s.id === section)!.label}</strong>
          </nav>
          <span className={ui.grow} />
          <div className={ui.seg} role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              List
            </button>
            <button type="button" aria-pressed={view === 'icons'} onClick={() => setView('icons')}>
              Icons
            </button>
          </div>
          <input
            className={ui.search}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            aria-label="Filter items"
          />
          <button type="button" className={`${ui.btn} ${ui.btnSm} ${ui.openBtn}`} disabled={!cur} onClick={() => cur?.open()}>
            Open
          </button>
        </div>

        <div className={ui.listWrap} ref={listRef}>
          {shown.length === 0 && <Empty>{filter ? 'Nothing matches that filter.' : 'Nothing here yet.'}</Empty>}
          {view === 'list' && shown.length > 0 && (
            <>
              <div className={ui.thead}>
                {th('name', 'Name')}
                {th('kind', 'Kind')}
                {th('year', section === 'versions' ? 'Modified' : 'Year')}
                <span className={ui.th}>{section === 'versions' ? 'About' : 'Stack'}</span>
              </div>
              <ul className={ui.rows} role="listbox" aria-label={SECTIONS.find((s) => s.id === section)!.label} tabIndex={active ? 0 : -1}>
                {shown.map((r) => (
                  <li
                    key={r.id}
                    data-id={r.id}
                    role="option"
                    aria-selected={sel === r.id}
                    className={ui.row}
                    onClick={() => onPick(r)}
                    onDoubleClick={r.open}
                  >
                    <span className={ui.cName}>
                      <Icon name={r.icon} size={20} />
                      <span>{r.name}</span>
                    </span>
                    <span className={ui.cKind}>{r.kind}</span>
                    <span className={ui.cYear}>{r.year}</span>
                    <span className={ui.cStack}>{r.stack}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {view === 'icons' && shown.length > 0 && (
            <ul className={ui.tiles} role="listbox" aria-label={SECTIONS.find((s) => s.id === section)!.label} tabIndex={0}>
              {shown.map((r) => (
                <li key={r.id} data-id={r.id} role="option" aria-selected={sel === r.id} className={ui.tile} onClick={() => onPick(r)} onDoubleClick={r.open}>
                  <span className={ui.tileImg}>
                    {r.img ? <Pic img={r.img} size="thumb" sizes="160px" /> : <Icon name={r.icon} size={40} />}
                  </span>
                  <span className={ui.tileName}>{r.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className={ui.statusbar} aria-live="polite">
          {shown.length} item{shown.length === 1 ? '' : 's'}
          {cur ? ` · ${cur.name} selected` : ''} · Double-click to open · Space for quick look
        </p>

        {ql && cur && (
          <div className={ui.ql} role="dialog" aria-label={`Quick look: ${cur.name}`}>
            {cur.img && (
              <div className={ui.qlImg}>
                <Pic img={cur.img} size="card" sizes="400px" fit="cover" />
              </div>
            )}
            <div className={ui.qlText}>
              <h3 className={ui.qlTitle}>{cur.name}</h3>
              <p>{cur.summary}</p>
              {cur.stack && <p className={ui.dim}>{cur.stack}</p>}
              <div className={ui.ctaRow}>
                <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} autoFocus onClick={cur.open}>
                  Open
                </button>
                <button type="button" className={ui.btn} onClick={() => setQl(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
