'use client'

import { useEffect, useRef } from 'react'
import type { Photo, Settings } from '@/lib/types'
import { GreaseCross } from './About'
import { scrollVel, tick, track } from './engine'
import { gsap } from './gsap'
import { aspect, Arrow, fmtDate, localSrc, MQ_PIN, pad2, parseExposure, Pic, useDarkroom } from './lib'
import p from './photo.module.css'
import r from './root.module.css'

const frameCode = (i: number) => `${pad2(i + 1)}A`

function Exif({ text }: { text: string }) {
  const x = parseExposure(text)
  if (!x) return null
  if ('raw' in x) return <span className={`${r.mono} ${p.exifMini}`} aria-hidden="true"><b>{x.raw}</b></span>
  return (
    <span className={`${r.mono} ${p.exifMini}`} aria-hidden="true">
      <b>{x.aperture ?? '–'}</b>
      <b>{x.shutter ?? '–'}</b>
      <b>{x.iso ? `iso ${x.iso}` : '–'}</b>
    </span>
  )
}

/* ---------- (a) contact sheet ---------- */
function Sheet({ photos }: { photos: Photo[] }) {
  const { openPhoto } = useDarkroom()
  return (
    <ul className={p.sheet} aria-label="Contact sheet — open any frame in the enlarger">
      {photos.slice(0, 36).map((ph, i) => (
        <li key={ph.id} className={p.cell}>
          <a
            href={`#photo-${ph.id}`}
            draggable={false}
            onClick={(e) => {
              e.preventDefault()
              openPhoto(ph.id, e.currentTarget)
            }}
            aria-label={`Open frame ${pad2(i + 1)}: ${ph.title}${ph.location ? `, ${ph.location}` : ''}`}
          >
            <span
              className={p.frame}
              style={{ aspectRatio: aspect(ph.image) }}
              data-frame
              data-photo-id={ph.id}
              data-loupe=""
              data-src={localSrc(ph.image.card ?? ph.image.url)}
            >
              <Pic img={ph.image} rendition="thumb" sizes="(max-width: 700px) 30vw, 14vw" loading="lazy" />
              {ph.exposure && <Exif text={ph.exposure} />}
              {ph.featured && <GreaseCross className={p.pick} />}
            </span>
            <span className={`${r.mono} ${p.no}`}>{frameCode(i)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/* ---------- (c) pinned film strip. Desktop: ScrollTrigger pin + scrub. Touch/reduced: native snap scroller. ---------- */
function Strip({ frames }: { frames: Photo[] }) {
  const { openPhoto, scrollTo } = useDarkroom()
  const sec = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const trackEl = useRef<HTMLUListElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const n = frames.length

  useEffect(() => {
    const secEl = sec.current
    const pinEl = pin.current
    const tr = trackEl.current
    if (!secEl || !pinEl || !tr || n < 2) return
    let moved = false

    /* Drag the strip with a mouse: pinned => drives page scroll, native => scrollLeft. Touch scrolls natively. */
    let drag: { x: number; moved: boolean } | null = null
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (Math.abs(dx) > 4) drag.moved = true
      if (!drag.moved) return
      drag.x = e.clientX
      if (secEl.dataset.pinned) scrollTo(window.scrollY - dx, true)
      else pinEl.scrollLeft -= dx
    }
    const onUp = () => {
      if (drag?.moved) moved = true
      setTimeout(() => (moved = false), 0)
      drag = null
      pinEl.style.scrollSnapType = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      drag = { x: e.clientX, moved: false }
      pinEl.style.scrollSnapType = 'none' // mandatory snap would undo every small scrollLeft step
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    pinEl.addEventListener('pointerdown', onDown)
    pinEl.addEventListener('click', onClickCapture, true)

    const writeCount = (i: number) => {
      if (counter.current) counter.current.textContent = `frame ${pad2(i + 1)} / ${pad2(n)}`
    }

    const mm = gsap.matchMedia()
    mm.add(MQ_PIN, () => {
      const dist = () => Math.max(0, tr.scrollWidth - window.innerWidth)
      if (dist() < 40) return
      secEl.dataset.pinned = 'true'
      const items = gsap.utils.toArray<HTMLElement>(tr.children)
      const skew = gsap.quickTo(items, 'skewX', { duration: 0.4, ease: 'power3.out' })
      let last = -1
      let active = false
      gsap.to(tr, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: pinEl,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onToggle: (self) => {
            active = self.isActive
            if (!active) skew(0)
          },
          onUpdate: (self) => {
            const i = Math.round(self.progress * (n - 1))
            if (i !== last) {
              if (last !== -1) tick()
              last = i
              writeCount(i)
            }
          },
        },
      })
      const loop = () => {
        if (active) skew(Math.max(-4, Math.min(4, scrollVel.v * -0.003)))
      }
      gsap.ticker.add(loop)
      return () => {
        gsap.ticker.remove(loop)
        gsap.set(items, { clearProps: 'skewX' })
        delete secEl.dataset.pinned
      }
    })

    // native mode: update the counter from scrollLeft
    const onScroll = () => {
      if (secEl.dataset.pinned) return
      const c = pinEl.scrollLeft + pinEl.clientWidth / 2
      let best = 0
      let bd = Infinity
      for (let i = 0; i < tr.children.length; i++) {
        const el = tr.children[i] as HTMLElement
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - c)
        if (d < bd) {
          bd = d
          best = i
        }
      }
      writeCount(best)
    }
    pinEl.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      mm.revert()
      pinEl.removeEventListener('pointerdown', onDown)
      pinEl.removeEventListener('click', onClickCapture, true)
      pinEl.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [n, scrollTo])

  if (n === 0) return null
  return (
    <div ref={sec} className={p.stripSec}>
      <div ref={pin} className={p.pin} role="region" aria-label="Film strip, scroll sideways" tabIndex={0}>
        <div className={p.stripHead}>
          <h3 className={p.stripTitle}>Film strip</h3>
          <span ref={counter} className={`${r.mono} ${p.stripCount}`}>frame 01 / {pad2(n)}</span>
        </div>
        <ul ref={trackEl} className={p.track}>
          {frames.map((ph, i) => (
            <li key={ph.id} className={p.sFrame} style={{ '--ar': aspect(ph.image) } as React.CSSProperties}>
              <a
                href={`#photo-${ph.id}`}
                draggable={false}
                onClick={(e) => {
                  e.preventDefault()
                  openPhoto(ph.id, e.currentTarget)
                }}
                aria-label={`Open frame ${pad2(i + 1)}: ${ph.title}`}
              >
                <span className={p.sWin} data-frame data-photo-id={ph.id} data-loupe="" data-src={localSrc(ph.image.card ?? ph.image.url)}>
                  <Pic img={ph.image} rendition="card" sizes="(max-width: 899px) 78vw, 60vh" loading="lazy" />
                </span>
                <span className={`${r.mono} ${p.sMeta}`}>
                  <b>{frameCode(i)}</b>
                  <span>{ph.title}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ---------- (d) Instagram block, no third-party embed ---------- */
function InstaBlock({ ig, photos }: { ig: Settings['instagram']; photos: Photo[] }) {
  if (!ig?.url) return null
  return (
    <div className={p.insta}>
      <h3 className={`${r.title} ${p.instaTitle}`}>Follow the darkroom</h3>
      <div className={p.instaSide}>
        <p className={p.instaPitch}>{ig.pitch}</p>
        <a
          href={ig.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${r.btn} ${p.instaBtn}`}
          onClick={() => track('cta_instagram', { where: 'block' })}
        >
          {ig.handle} <Arrow />
        </a>
        {ig.followers && <p className={`${r.mono} ${p.instaCount}`}>{ig.followers} followers</p>}
      </div>
      <ul className={p.instaGrid} aria-label="Recent frames on Instagram">
        {photos.slice(0, 6).map((ph) => (
          <li key={ph.id} style={{ aspectRatio: aspect(ph.image) }}>
            <a
              href={ph.instagramUrl || ig.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ph.title} on Instagram (opens in a new tab)`}
              onClick={() => track('cta_instagram', { where: 'grid' })}
            >
              <Pic img={ph.image} rendition="thumb" sizes="(max-width: 700px) 30vw, 14vw" loading="lazy" />
              <span className={p.instaHover} aria-hidden="true"><Arrow size={20} /></span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Photography({ photos, ig }: { photos: Photo[]; ig: Settings['instagram'] }) {
  const picks = [...photos.filter((x) => x.featured), ...photos.filter((x) => !x.featured)]
  const dated = photos.find((x) => x.takenAt)
  if (!photos.length) return null
  return (
    <section id="photography" className={`${r.section} ${p.photo}`} data-section="photography" aria-labelledby="photo-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="photo-h" className={r.title}>Photography</h2>
          <p className={r.caption}>
            contact sheet, {photos.length} frames{dated ? `, latest ${fmtDate(dated.takenAt)}` : ''}. crosses mark the picks.
          </p>
        </div>
        <Sheet photos={photos} />
      </div>
      <Strip frames={picks.slice(0, 18)} />
      <div className={r.inner}>
        <InstaBlock ig={ig} photos={picks} />
      </div>
    </section>
  )
}
