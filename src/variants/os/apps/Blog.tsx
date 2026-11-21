'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { fmtDate, readMinutes } from '../util'
import { Empty } from './common'
import ui from './apps.module.css'

const Md = dynamic(() => import('./Md'), {
  ssr: false,
  loading: () => <p className={ui.dim}>Loading…</p>,
})

/** Reader view: a list of posts, then one article at a time. */
export default function Blog({ props }: AppProps) {
  const os = useOS()
  const posts = useMemo(
    () => os.data.posts.filter((p) => p.kind === 'blog').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [os.data.posts],
  )
  const [sel, setSel] = useState<string | null>(props.slug || null)
  useEffect(() => {
    if (props.slug) setSel(props.slug)
  }, [props.slug])
  const cur = posts.find((p) => p.slug === sel) ?? null

  if (posts.length === 0) return <Empty>No posts yet. Add a post of kind “blog” in the CMS.</Empty>

  if (!cur)
    return (
      <div className={ui.scroll}>
        <h2 className={ui.bTitle}>Blog</h2>
        <ul className={ui.bList} aria-label="Posts">
          {posts.map((p) => (
            <li key={p.id}>
              <button type="button" className={ui.bCard} onClick={() => setSel(p.slug)}>
                {p.cover && (
                  <span className={ui.bCover}>
                    <Pic img={p.cover} size="thumb" sizes="160px" />
                  </span>
                )}
                <span className={ui.bText}>
                  <strong>{p.title}</strong>
                  <span className={ui.bMeta}>
                    {fmtDate(p.publishedAt)} · {readMinutes(p.body)} min read
                  </span>
                  <span>{p.excerpt}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )

  const i = posts.indexOf(cur)
  const newer = posts[i - 1]
  const older = posts[i + 1]
  return (
    <article className={`${ui.scroll} ${ui.bRead}`} aria-label={cur.title}>
      <div className={ui.nHead}>
        <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => setSel(null)}>
          ‹ All posts
        </button>
        <span className={ui.grow} />
        <button
          type="button"
          className={`${ui.btn} ${ui.btnSm}`}
          onClick={() => os.share('blog', { slug: cur.slug })}
        >
          Share
        </button>
      </div>
      {cur.cover && (
        <div className={ui.cover}>
          <Pic img={cur.cover} size="card" sizes="(max-width: 760px) 100vw, 740px" priority />
        </div>
      )}
      <p className={ui.bMeta}>
        {fmtDate(cur.publishedAt)} · {readMinutes(cur.body)} min read
      </p>
      <h2 className={ui.bTitle}>{cur.title}</h2>
      <Md>{cur.body}</Md>
      {cur.tags.length > 0 && (
        <ul className={ui.chips} aria-label="Tags">
          {cur.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <nav className={ui.bPager} aria-label="More posts">
        {newer ? (
          <button type="button" className={ui.btn} onClick={() => setSel(newer.slug)}>
            ‹ {newer.title}
          </button>
        ) : (
          <span />
        )}
        {older && (
          <button type="button" className={ui.btn} onClick={() => setSel(older.slug)}>
            {older.title} ›
          </button>
        )}
      </nav>
    </article>
  )
}
