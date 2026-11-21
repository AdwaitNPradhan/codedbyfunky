'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, m, useMotionValue } from 'motion/react'
import { getInstagramFeed } from '@/app/actions/instagram'
import type { IgPost } from '@/lib/instagram'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { clamp, monthYear } from '../util'
import { Empty, Ext } from './common'
import { InstagramFeed } from './InstagramFeed'
import ui from './apps.module.css'

export default function Photos({ props, active, hidden }: AppProps) {
  const os = useOS()
  const { data } = os
  const ig = data.settings.instagram
  const igUrl = ig.url || data.settings.socials.find((s) => s.platform === 'instagram')?.url || ''
  const albums = useMemo(() => Array.from(new Set(data.photos.map((p) => p.series).filter(Boolean))), [data.photos])
  // The Instagram feed (when a token is set and the API answers), else the CMS photo library.
  const [feed, setFeed] = useState<{ state: 'loading' | 'ok' | 'none'; posts: IgPost[] }>({ state: 'loading', posts: [] })
  const [source, setSource] = useState<'ig' | 'lib'>(props.photo ? 'lib' : 'ig')
  useEffect(() => {
    let off = false
    getInstagramFeed()
      .then((r) => !off && setFeed(r.ok && r.posts.length ? { state: 'ok', posts: r.posts } : { state: 'none', posts: [] }))
      .catch(() => !off && setFeed({ state: 'none', posts: [] }))
    return () => {
      off = true
    }
  }, [])
  useEffect(() => {
    if (props.photo) setSource('lib')
    else if (props.id) setSource('ig')
  }, [props.photo, props.id])
  const [album, setAlbum] = useState('all')
  const list = useMemo(() => (album === 'all' ? data.photos : data.photos.filter((p) => p.series === album)), [album, data.photos])
  const [idx, setIdx] = useState<number | null>(null)
  const [info, setInfo] = useState(false)
  const [play, setPlay] = useState(false)
  const [hover, setHover] = useState(false)
  const viewer = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const sc = useMotionValue(1)
  const tx = useMotionValue(0)
  const ty = useMotionValue(0)

  // `open photos` from elsewhere can ask for a specific photo.
  useEffect(() => {
    if (!props.photo) return
    const all = data.photos.findIndex((p) => p.id === props.photo)
    if (all < 0) return
    setAlbum('all')
    setIdx(all)
  }, [props.photo, data.photos])

  const photo = idx !== null ? list[idx] : null
  const go = useCallback(
    (d: number) => setIdx((i) => (i === null || list.length === 0 ? i : (i + d + list.length) % list.length)),
    [list.length],
  )

  const resetZoom = useCallback(() => {
    sc.set(1)
    tx.set(0)
    ty.set(0)
  }, [sc, tx, ty])
  useEffect(resetZoom, [idx, resetZoom])
  useEffect(() => {
    if (photo) viewer.current?.focus({ preventScroll: true })
  }, [photo])

  // Slideshow: 3s per photo, paused on hover, when minimised and when closed.
  useEffect(() => {
    if (!play || hover || hidden || idx === null) return
    const t = setInterval(() => go(1), 3000)
    return () => clearInterval(t)
  }, [play, hover, hidden, idx, go])

  const zoomBy = useCallback(
    (f: number) => {
      const next = clamp(sc.get() * f, 1, 5)
      animate(sc, next, { duration: 0.15 })
      if (next === 1) {
        animate(tx, 0, { duration: 0.15 })
        animate(ty, 0, { duration: 0.15 })
      }
    },
    [sc, tx, ty],
  )

  // Wheel needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const on = (e: WheelEvent) => {
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)
    }
    el.addEventListener('wheel', on, { passive: false })
    return () => el.removeEventListener('wheel', on)
  }, [zoomBy, photo])

  // Pointer pan and two-finger pinch.
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)
  const onPD = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onPM = (e: React.PointerEvent) => {
    const p = pts.current.get(e.pointerId)
    if (!p) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current) sc.set(clamp(sc.get() * (d / pinch.current), 1, 5))
      pinch.current = d
    } else if (sc.get() > 1) {
      tx.set(tx.get() + dx)
      ty.set(ty.get() + dy)
    }
  }
  const onPU = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId)
    pinch.current = 0
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!photo) return
    const k = e.key
    if (k === 'Escape') (e.preventDefault(), setIdx(null))
    else if (k === 'ArrowRight') (e.preventDefault(), go(1))
    else if (k === 'ArrowLeft') (e.preventDefault(), go(-1))
    else if (k === ' ') (e.preventDefault(), setPlay((v) => !v))
    else if (k === 'i' || k === 'I') setInfo((v) => !v)
    else if (k === '+' || k === '=') zoomBy(1.3)
    else if (k === '-') zoomBy(1 / 1.3)
    else if (k === '0') resetZoom()
  }

  const showFeed = feed.state === 'ok' && (source === 'ig' || data.photos.length === 0)
  if (data.photos.length === 0 && feed.state !== 'ok')
    return feed.state === 'loading' ? (
      <div className={ui.loading} role="status">
        Loading photos…
      </div>
    ) : (
      <Empty>No photos in the CMS yet.</Empty>
    )

  return (
    <div className={ui.photos}>
      {feed.state === 'ok' && data.photos.length > 0 && (
        <div className={ui.igTabs} role="group" aria-label="Photo source">
          <button type="button" aria-pressed={showFeed} onClick={() => setSource('ig')}>
            Instagram
          </button>
          <button type="button" aria-pressed={!showFeed} onClick={() => setSource('lib')}>
            Library
          </button>
        </div>
      )}
      {showFeed ? (
        <InstagramFeed posts={feed.posts} openId={props.id} handle={ig.handle} url={igUrl} pitch={ig.pitch} />
      ) : (
      <>
      <div className={ui.toolbar}>
        <label className={ui.albumLabel}>
          <span className={ui.srOnly}>Album</span>
          <select className={ui.select} value={album} onChange={(e) => setAlbum(e.target.value)} aria-label="Album">
            <option value="all">All photos ({data.photos.length})</option>
            {albums.map((a) => (
              <option key={a} value={a}>
                {a} ({data.photos.filter((p) => p.series === a).length})
              </option>
            ))}
          </select>
        </label>
        <span className={ui.grow} />
        {igUrl && (
          <Ext href={igUrl} className={`${ui.btn} ${ui.btnPrimary}`}>
            Open Instagram {ig.handle} ↗
          </Ext>
        )}
      </div>
      {ig.pitch && <p className={ui.pitch}>{ig.pitch}</p>}

      <ul className={ui.grid} aria-label="Photos">
        {list.map((p, i) => (
          <li key={p.id}>
            <button type="button" className={ui.thumb} onClick={() => setIdx(i)} aria-label={`${p.title}${p.location ? `, ${p.location}` : ''}`}>
              <Pic img={p.image} size="thumb" sizes="(max-width: 600px) 33vw, 160px" alt="" />
            </button>
          </li>
        ))}
      </ul>

      {photo && (
        <div ref={viewer} className={ui.viewer} role="dialog" aria-label={`Photo viewer: ${photo.title}`} tabIndex={-1} onKeyDown={onKey}>
          <div
            ref={stage}
            className={ui.stage}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            onPointerDown={onPD}
            onPointerMove={onPM}
            onPointerUp={onPU}
            onPointerCancel={onPU}
            onDoubleClick={() => (sc.get() > 1 ? resetZoom() : animate(sc, 2.5, { duration: 0.2 }))}
          >
            <m.div className={ui.stageImg} style={{ x: tx, y: ty, scale: sc }}>
              <Pic key={photo.id} img={photo.image} size="hero" sizes="(max-width: 900px) 100vw, 820px" fit="contain" alt={photo.image.alt || photo.title} />
            </m.div>
          </div>
          <div className={ui.vbar}>
            <div className={ui.vcap}>
              <strong>{photo.title}</strong>
              <span>
                {[photo.location, monthYear(photo.takenAt)].filter(Boolean).join(' · ')} · {(idx ?? 0) + 1}/{list.length}
              </span>
            </div>
            <div className={ui.vbtns}>
              <button type="button" className={ui.vbtn} onClick={() => go(-1)} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className={ui.vbtn} aria-pressed={play} onClick={() => setPlay((v) => !v)} aria-label={play ? 'Pause slideshow' : 'Play slideshow'}>
                {play ? 'Pause' : 'Play'}
              </button>
              <button type="button" className={ui.vbtn} onClick={() => go(1)} aria-label="Next photo">
                ›
              </button>
              <button type="button" className={ui.vbtn} onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">
                −
              </button>
              <button type="button" className={ui.vbtn} onClick={() => zoomBy(1.3)} aria-label="Zoom in">
                +
              </button>
              <button type="button" className={ui.vbtn} aria-pressed={info} onClick={() => setInfo((v) => !v)} aria-label="Photo info">
                i
              </button>
              <button type="button" className={ui.vbtn} onClick={() => setIdx(null)} aria-label="Close viewer">
                ✕
              </button>
            </div>
          </div>
          {info && (
            <dl className={ui.exif}>
              {[
                ['Camera', photo.camera],
                ['Lens', photo.lens],
                ['Exposure', photo.exposure],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              {photo.instagramUrl && (
                <div>
                  <dt>Instagram</dt>
                  <dd>
                    <Ext href={photo.instagramUrl}>View post ↗</Ext>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
      </>
      )}
    </div>
  )
}
