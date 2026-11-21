'use client'

import { Flip } from 'gsap/Flip'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Photo } from '@/lib/types'
import { shutter, track } from './engine'
import { gsap } from './gsap'
import p from './photo.module.css'
import { Arrow, aspect, fmtDate, localSrc, pad2, parseExposure, Pic } from './lib'
import r from './root.module.css'

gsap.registerPlugin(Flip)

const EASE = 'expo.inOut'
const inView = (el: Element) => {
  const b = el.getBoundingClientRect()
  return b.width > 0 && b.bottom > 0 && b.top < window.innerHeight && b.right > 0 && b.left < window.innerWidth
}
const findThumb = (id: string) => {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-frame][data-photo-id="${CSS.escape(id)}"]`))
  return all.find(inView) ?? null
}

type Props = {
  photos: Photo[]
  startId: string
  trigger: HTMLElement | null
  reduced: boolean
  /** Called after the close animation, with the element that should regain focus. */
  onClose: (restore: HTMLElement | null) => void
}

/** The enlarger: Flip from thumbnail to centred print, keyboard + swipe, loupe, EXIF reveal, focus trap. */
export default function Lightbox({ photos, startId, trigger, reduced, onClose }: Props) {
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((x) => x.id === startId)))
  const [loupe, setLoupe] = useState(false)
  const [exif, setExif] = useState(false)
  const dlg = useRef<HTMLDivElement>(null)
  const bd = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const chrome = useRef<HTMLDivElement>(null)
  const dir = useRef(0)
  const closing = useRef(false)
  const first = useRef(true)
  const photo = photos[index]
  const n = photos.length

  /* open: Flip.fit onto the thumbnail, then release to the centred position */
  useLayoutEffect(() => {
    const f = frame.current
    const b = bd.current
    const c = chrome.current
    if (!f || !b || !c) return
    const origin = trigger?.querySelector<HTMLElement>('[data-frame]') ?? null
    shutter()
    track('photo_open', { id: startId })
    if (!reduced && origin && inView(origin)) {
      gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' })
      gsap.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.35 })
      Flip.fit(f, origin, { scale: true })
      gsap.to(f, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.7, ease: EASE })
    } else {
      gsap.fromTo([b, c, f], { opacity: 0 }, { opacity: 1, duration: 0.15 })
    }
    return () => {
      gsap.killTweensOf([b, c, f])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on open
  }, [])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    const f = frame.current
    const b = bd.current
    const c = chrome.current
    if (!f || !b || !c) return onClose(trigger)
    const dest = findThumb(photos[index].id)
    const restore = (dest?.closest('a') as HTMLElement | null) ?? trigger
    const done = () => onClose(restore)
    gsap.killTweensOf([b, c, f])
    if (!reduced && dest) {
      gsap.to(c, { opacity: 0, duration: 0.2 })
      gsap.to(b, { opacity: 0, duration: 0.55, ease: 'power2.inOut' })
      Flip.fit(f, dest, { scale: true, duration: 0.6, ease: EASE, onComplete: done })
    } else {
      gsap.to([b, c, f], { opacity: 0, duration: 0.15, onComplete: done })
    }
  }, [index, onClose, photos, reduced, trigger])

  const go = useCallback(
    (d: number) => {
      if (closing.current || n < 2) return
      dir.current = d
      shutter()
      setIndex((i) => (i + d + n) % n)
    },
    [n],
  )

  /* slide the new frame in */
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const f = frame.current
    if (!f) return
    gsap.killTweensOf(f)
    gsap.fromTo(f, { x: reduced ? 0 : dir.current * 70, y: 0, scale: 1, opacity: 0 }, { x: 0, opacity: 1, duration: reduced ? 0.15 : 0.45, ease: 'expo.out' })
  }, [index, reduced])

  /* keyboard + focus trap + restore */
  useEffect(() => {
    const d = dlg.current
    d?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'l' || e.key === 'L') setLoupe((v) => !v)
      else if (e.key === 'i' || e.key === 'I') setExif((v) => !v)
      else if (e.key === 'Tab' && d) {
        const f = Array.from(d.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        } else if (!d.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [close, go])

  /* swipe: left/right changes frame, down closes (offset > 120 or velocity > 500px/s) */
  const g = useRef({ id: -1, x: 0, y: 0, axis: '' as '' | 'x' | 'y', s: [] as { x: number; y: number; t: number }[] })
  const down = (e: React.PointerEvent) => {
    if (loupe || (e.target as Element).closest('button, a')) return
    g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: '', s: [{ x: e.clientX, y: e.clientY, t: performance.now() }] }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const s = g.current
    if (s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    s.s.push({ x: e.clientX, y: e.clientY, t: performance.now() })
    if (s.s.length > 6) s.s.shift()
    if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    const f = frame.current
    if (!f) return
    if (s.axis === 'x') gsap.set(f, { x: dx })
    else if (s.axis === 'y') {
      gsap.set(f, { y: dy > 0 ? dy : dy * 0.2, scale: 1 - Math.min(0.15, Math.abs(dy) / 1500) })
      if (bd.current) gsap.set(bd.current, { opacity: 1 - Math.min(0.6, Math.max(0, dy) / 500) })
    }
  }
  const up = (e: React.PointerEvent) => {
    const s = g.current
    if (s.id !== e.pointerId) return
    s.id = -1
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    const a = s.s[0]
    const z = s.s[s.s.length - 1]
    const dt = Math.max(16, z.t - a.t)
    const vx = ((z.x - a.x) / dt) * 1000
    const vy = ((z.y - a.y) / dt) * 1000
    const f = frame.current
    if (s.axis === 'y' && (dy > 120 || vy > 500)) return close()
    if (s.axis === 'x' && (Math.abs(dx) > 60 || Math.abs(vx) > 400)) return go(dx < 0 ? 1 : -1)
    if (s.axis && f) {
      gsap.to(f, { x: 0, y: 0, scale: 1, duration: 0.4, ease: 'expo.out' })
      if (bd.current) gsap.to(bd.current, { opacity: 1, duration: 0.3 })
    } else if ((e.target as Element) === e.currentTarget) close() // tap on the dark area
  }

  const x = parseExposure(photo.exposure || '')
  const ar = aspect(photo.image)
  const url = localSrc(photo.image.card ?? photo.image.url)

  return (
    <div ref={dlg} className={p.lb} role="dialog" aria-modal="true" aria-label={`Photo viewer: ${photo.title}`}>
      <div ref={bd} className={p.lbBackdrop} aria-hidden="true" />
      <div ref={chrome} className={p.lbChrome}>
        <div className={p.lbTop}>
          <span className={`${r.mono} ${p.lbCount}`} aria-live="polite">
            frame {pad2(index + 1)} / {pad2(n)}
          </span>
          <div className={p.lbBtns}>
            <button type="button" className={p.lbBtn} aria-pressed={loupe} onClick={() => setLoupe((v) => !v)}>
              loupe
            </button>
            <button type="button" className={p.lbBtn} aria-pressed={exif} aria-expanded={exif} aria-controls="lb-exif" onClick={() => setExif((v) => !v)}>
              exif
            </button>
            <button type="button" className={p.lbBtn} data-autofocus onClick={close}>
              close
            </button>
          </div>
        </div>

        {n > 1 && (
          <>
            <button type="button" className={`${p.lbNav} ${p.lbPrev}`} onClick={() => go(-1)} aria-label="Previous frame">
              <span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}><Arrow dir="right" size={22} /></span>
            </button>
            <button type="button" className={`${p.lbNav} ${p.lbNext}`} onClick={() => go(1)} aria-label="Next frame">
              <Arrow dir="right" size={22} />
            </button>
          </>
        )}

        <div className={p.lbBottom}>
          <div>
            <p className={p.lbTitle}>{photo.title}</p>
            <p className={`${r.mono} ${p.lbMeta}`}>
              {[photo.location, fmtDate(photo.takenAt), photo.series].filter(Boolean).join(' · ')}
            </p>
          </div>
          {photo.instagramUrl && (
            <a href={photo.instagramUrl} target="_blank" rel="noopener noreferrer" className={`${r.link} ${p.lbIg}`} onClick={() => track('cta_instagram', { where: 'lightbox' })}>
              View on Instagram <Arrow />
            </a>
          )}
        </div>

        <div id="lb-exif" className={p.lbExif} data-open={exif} aria-hidden={!exif}>
          <dl className={`${r.mono} ${p.exifGrid}`}>
            {x && 'raw' in x ? (
              <div><dt>exposure</dt><dd>{x.raw}</dd></div>
            ) : x ? (
              <>
                <div><dt>aperture</dt><dd>{x.aperture ?? '–'}</dd></div>
                <div><dt>shutter</dt><dd>{x.shutter ?? '–'}</dd></div>
                <div><dt>iso</dt><dd>{x.iso ?? '–'}</dd></div>
              </>
            ) : null}
            {photo.camera && <div><dt>camera</dt><dd>{photo.camera}</dd></div>}
            {photo.lens && <div><dt>lens</dt><dd>{photo.lens}</dd></div>}
          </dl>
        </div>
      </div>

      <div className={p.lbStage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div
          ref={frame}
          className={p.lbFrame}
          style={{ '--ar': ar } as React.CSSProperties}
          data-loupe={loupe ? 'always' : undefined}
          data-src={url}
        >
          <Pic key={photo.id} img={photo.image} rendition="url" sizes="100vw" priority />
        </div>
      </div>
    </div>
  )
}
