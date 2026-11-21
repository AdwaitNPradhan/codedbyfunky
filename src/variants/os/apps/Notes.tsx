'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { fmtDate } from '../util'
import { Empty } from './common'
import { useWide } from './useWide'
import ui from './apps.module.css'

const Md = dynamic(() => import('./Md'), {
  ssr: false,
  loading: () => <p className={ui.dim}>Loading…</p>,
})

/** Apple-Notes style: a list on the left, the note on the right. One pane at a time when narrow. */
export default function Notes({ props, active }: AppProps) {
  const os = useOS()
  const notes = useMemo(
    () =>
      os.data.posts
        .filter((p) => p.kind === 'note')
        .sort((a, b) => Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt)),
    [os.data.posts],
  )
  const [ref, wide] = useWide<HTMLDivElement>(560)
  const [sel, setSel] = useState<string | null>(props.slug || null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (props.slug) setSel(props.slug)
  }, [props.slug])

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    return k
      ? notes.filter((n) => `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(k))
      : notes
  }, [notes, q])
  const cur = notes.find((n) => n.slug === sel) ?? (wide ? (shown[0] ?? null) : null)

  if (notes.length === 0) return <Empty>No notes yet. Add a post of kind “note” in the CMS.</Empty>

  const showList = wide || !cur
  const showNote = wide || Boolean(cur)
  return (
    <div className={ui.notes} ref={ref} data-wide={wide}>
      {showList && (
        <div className={ui.nList}>
          <input
            className={ui.search}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search notes"
          />
          <ul aria-label="Notes" className={ui.nItems}>
            {shown.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={ui.nItem}
                  aria-current={cur?.slug === n.slug ? 'true' : undefined}
                  onClick={() => setSel(n.slug)}
                >
                  <strong>{n.title}</strong>
                  <span>
                    {fmtDate(n.publishedAt)} · {n.excerpt || n.body.replace(/[#*`>_-]/g, '').slice(0, 60)}
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className={ui.dim}>No note matches “{q}”.</li>}
          </ul>
        </div>
      )}
      {showNote && (
        <article className={ui.nBody} aria-label={cur?.title ?? 'Note'} tabIndex={active ? 0 : -1}>
          {cur ? (
            <>
              <div className={ui.nHead}>
                {!wide && (
                  <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => setSel(null)}>
                    ‹ Notes
                  </button>
                )}
                <span className={ui.grow} />
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnSm}`}
                  onClick={() => os.share('notes', { slug: cur.slug })}
                >
                  Share
                </button>
              </div>
              <p className={ui.nDate}>{fmtDate(cur.publishedAt)}</p>
              <h2 className={ui.nTitle}>{cur.title}</h2>
              <Md>{cur.body}</Md>
              {cur.tags.length > 0 && (
                <ul className={ui.chips} aria-label="Tags">
                  {cur.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <Empty>Pick a note.</Empty>
          )}
        </article>
      )}
    </div>
  )
}
