'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IgPost } from '@/lib/instagram'
import { useOS } from '../store'
import { fmtDate } from '../util'
import { Ext } from './common'
import ui from './apps.module.css'

const alt = (p: IgPost) => p.caption.split('\n')[0].slice(0, 110) || `Instagram photo, ${fmtDate(p.timestamp)}`

/**
 * The Instagram feed as a grid with a lightbox. Images are plain lazy <img> tags: the CDN links
 * expire, so next/image (which caches them) would show broken pictures later.
 */
export function InstagramFeed({
  posts,
  openId,
  handle,
  url,
  pitch,
}: {
  posts: IgPost[]
  openId?: string
  handle: string
  url: string
  pitch: string
}) {
  const os = useOS()
  const [idx, setIdx] = useState<number | null>(null)
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const box = useRef<HTMLDivElement>(null)

  // A shared link (`?app=photos&id=...`) opens that post.
  useEffect(() => {
    if (!openId) return
    const i = posts.findIndex((p) => p.id === openId)
    if (i >= 0) setIdx(i)
  }, [openId, posts])
  useEffect(() => {
    if (idx !== null) box.current?.focus({ preventScroll: true })
  }, [idx])

  const go = useCallback(
    (d: number) => setIdx((i) => (i === null ? i : (i + d + posts.length) % posts.length)),
    [posts.length],
  )
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') (e.preventDefault(), setIdx(null))
    else if (e.key === 'ArrowRight') (e.preventDefault(), go(1))
    else if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1))
  }
  const bad = (id: string) => setBroken((s) => new Set(s).add(id))
  const post = idx !== null ? posts[idx] : null

  return (
    <>
      <div className={ui.toolbar}>
        <strong>Instagram {handle}</strong>
        <span className={ui.grow} />
        {url && (
          <Ext href={url} className={`${ui.btn} ${ui.btnPrimary}`}>
            Follow {handle} ↗
          </Ext>
        )}
      </div>
      {pitch && <p className={ui.pitch}>{pitch}</p>}

      <ul className={ui.grid} aria-label="Instagram posts">
        {posts.map((p, i) => (
          <li key={p.id}>
            <button type="button" className={ui.thumb} onClick={() => setIdx(i)} aria-label={`${alt(p)}, ${fmtDate(p.timestamp)}`}>
              {broken.has(p.id) ? (
                <span className={ui.igGone} aria-hidden="true">
                  ◻
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={ui.igImg}
                  src={p.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => bad(p.id)}
                />
              )}
              {p.kind !== 'image' && <span className={ui.igKind}>{p.kind === 'video' ? '▶' : '❐'}</span>}
            </button>
          </li>
        ))}
      </ul>

      {post && (
        <div ref={box} className={ui.viewer} role="dialog" aria-label={`Instagram post: ${alt(post)}`} tabIndex={-1} onKeyDown={onKey}>
          <div className={ui.igStage}>
            {broken.has(post.id) ? (
              <p className={ui.dim}>This picture is no longer available here.</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.image} alt={alt(post)} referrerPolicy="no-referrer" onError={() => bad(post.id)} />
            )}
          </div>
          <div className={ui.vbar}>
            <div className={ui.vcap}>
              <strong className={ui.igCaption}>{post.caption || 'No caption'}</strong>
              <span>
                {fmtDate(post.timestamp)} · {(idx ?? 0) + 1}/{posts.length}
              </span>
            </div>
            <div className={ui.vbtns}>
              <button type="button" className={ui.vbtn} onClick={() => go(-1)} aria-label="Previous post">
                ‹
              </button>
              <button type="button" className={ui.vbtn} onClick={() => go(1)} aria-label="Next post">
                ›
              </button>
              <a className={ui.vbtn} href={post.permalink} target="_blank" rel="noopener noreferrer" aria-label="View on Instagram, opens in a new tab">
                IG ↗
              </a>
              <button type="button" className={ui.vbtn} onClick={() => os.share('photos', { id: post.id })} aria-label="Share link to this post">
                Share
              </button>
              <button type="button" className={ui.vbtn} onClick={() => setIdx(null)} aria-label="Close viewer">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
