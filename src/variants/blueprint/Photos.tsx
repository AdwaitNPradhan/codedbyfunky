'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from './gsap'
import { useBP, useSheet } from './ctx'
import { SheetHead } from './SheetHead'
import { Overlay, CloseButton } from './Overlay'
import { Duotone } from './Duotone'
import { imgSrc, pad2, track } from './util'
import type { Photo, Settings } from '@/lib/types'
import s from './sections.module.css'
import b from './base.module.css'

const VISIBLE = 9

function PlateSheet({
  list,
  index,
  settings,
  onClose,
  onNav,
}: {
  list: Photo[]
  index: number
  settings: Settings
  onClose: () => void
  onNav: (i: number) => void
}) {
  const p = list[index]
  const go = useCallback((d: number) => onNav((index + d + list.length) % list.length), [index, list.length, onNav])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [go])
  const date = p.takenAt ? p.takenAt.slice(0, 10) : ''
  const rows: [string, string][] = [
    ['LOCATION', p.location],
    ['DATE', date],
    ['SERIES', p.series],
    ['CAMERA', p.camera],
    ['LENS', p.lens],
    ['EXPOSURE', p.exposure],
  ]
  const ig = p.instagramUrl || settings.instagram.url
  return (
    <Overlay label={`Plate ${index + 1}: ${p.title}`} onClose={onClose} className={s.dwgOverlay}>
      <article className={s.drawing} key={p.id}>
        <div className={b.sheetBar}>
          <span className={b.mono}>
            REFERENCE PLATE · FIG. {pad2(index + 1)}/{pad2(list.length)}
          </span>
          <span className={s.dwgNav}>
            {list.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous plate">
                  <svg viewBox="0 0 16 8" width="16" height="8" aria-hidden="true">
                    <path d="M16 4H1M5 0.5L1 4L5 7.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
                  </svg>
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next plate">
                  <svg viewBox="0 0 16 8" width="16" height="8" aria-hidden="true">
                    <path d="M0 4H15M11 0.5L15 4L11 7.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
                  </svg>
                </button>
              </>
            )}
          </span>
          <CloseButton onClick={onClose} />
        </div>
        <div className={`${s.dwgBody} ${s.plateBody}`} data-lenis-prevent>
          <figure className={s.dwgFig} data-dim>
            <div className={s.dwgFigBox} style={{ aspectRatio: `${p.image.width} / ${p.image.height}` }}>
              <Image
                src={imgSrc(p.image, 'hero')}
                alt={p.image.alt || p.title}
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                priority
                placeholder={p.image.blur ? 'blur' : 'empty'}
                blurDataURL={p.image.blur}
              />
            </div>
          </figure>
          <div className={s.dwgText}>
            <h3 className={s.dwgTitle}>{p.title}</h3>
            <table className={s.dataTable}>
              <caption>EXIF</caption>
              <tbody>
                {rows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {ig && (
              <div className={s.dwgLinks}>
                <a
                  className={`${b.btn} ${b.btnPrimary}`}
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('cta_instagram', { at: 'plate' })}
                >
                  View on Instagram
                </a>
              </div>
            )}
          </div>
        </div>
      </article>
    </Overlay>
  )
}

function Plate({ p, n, onOpen }: { p: Photo; n: number; onOpen: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useBP()

  // touch has no hover: plates "develop" to colour as they pass the middle of the screen
  useEffect(() => {
    const el = ref.current
    if (!el || reduced === null) return
    if (!window.matchMedia('(hover: none)').matches) return
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 56%',
      end: 'bottom 44%',
      onToggle: (self) => (self.isActive ? el.setAttribute('data-colour', '1') : el.removeAttribute('data-colour')),
    })
    return () => st.kill()
  }, [reduced])

  return (
    <figure ref={ref} className={s.plate} data-reveal>
      <button type="button" className={s.plateBtn} onClick={onOpen} aria-label={`Open plate ${n}: ${p.title}`}>
        <span className={s.plateBox} style={{ aspectRatio: `${p.image.width} / ${p.image.height}` }} data-dim>
          <Duotone img={p.image} alt={p.image.alt || p.title} sizes="(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 22vw" />
          <i className={s.cTL} />
          <i className={s.cTR} />
          <i className={s.cBL} />
          <i className={s.cBR} />
        </span>
      </button>
      <figcaption>
        <span className={s.figNo}>FIG. {pad2(n)}</span>
        <span className={s.figTitle}>{p.title}</span>
        {p.location && <span className={s.figLoc}>{p.location}</span>}
        <span className={s.scaleBar} aria-hidden="true">
          <i />
          <em>10 MM</em>
        </span>
      </figcaption>
    </figure>
  )
}

/** Sheet 05: photography as reference plates, with the Instagram callout. */
export function Photos({ photos, settings }: { photos: Photo[]; settings: Settings }) {
  const sh = useSheet('sheet-plates')
  const sorted = useMemo(() => [...photos.filter((p) => p.featured), ...photos.filter((p) => !p.featured)], [photos])
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const rows = showAll ? sorted : sorted.slice(0, VISIBLE)
  const { reduced } = useBP()
  const cta = useRef<HTMLAnchorElement>(null)
  const leader = useRef<SVGPathElement>(null)

  useEffect(() => {
    const l = leader.current
    if (!l || reduced !== false) return
    gsap.set(l, { drawSVG: '0%' })
    const st = ScrollTrigger.create({
      trigger: l,
      start: 'top 85%',
      end: 'max',
      once: true,
      onEnter: () => void gsap.to(l, { drawSVG: '100%', duration: 0.8, ease: 'power2.inOut' }),
    })
    return () => st.kill()
  }, [reduced])

  if (!photos.length) return null
  const ig = settings.instagram

  return (
    <section id="sheet-plates" data-sheet className={`${s.sheet} ${s.platesSheet}`} aria-labelledby="h-plates">
      <div className={s.wrap}>
        <SheetHead id="h-plates" part={sh.part} tag="REFERENCE PLATES" title="Photography" />
        <div className={s.plateGrid}>
          {rows.map((p, i) => (
            <Plate key={p.id} p={p} n={i + 1} onOpen={() => setOpen(i)} />
          ))}
        </div>
        {sorted.length > VISIBLE && (
          <button type="button" className={`${b.btn} ${b.btnGhost} ${s.moreBtn}`} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? 'Show fewer plates' : `All plates (${sorted.length})`}
          </button>
        )}
        {ig.url && (
          <div className={s.igCta} data-reveal>
            <svg className={s.igLeader} viewBox="0 0 120 40" aria-hidden="true">
              <path ref={leader} d="M2 4V20L18 36H108" fill="none" />
              <path d="M100 31L108 36L100 41" fill="none" />
            </svg>
            <a
              ref={cta}
              className={`${b.btn} ${b.btnPrimary} ${s.igPill}`}
              href={ig.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('cta_instagram', { at: 'plates' })}
            >
              REF: {ig.handle} · SEE FULL SET
            </a>
            {(ig.pitch || ig.followers) && (
              <p className={s.igPitch}>
                {ig.pitch}
                {ig.followers && <span className={b.mono}> {ig.followers} FOLLOWERS</span>}
              </p>
            )}
          </div>
        )}
      </div>
      {open !== null && <PlateSheet list={sorted} index={open} settings={settings} onClose={() => setOpen(null)} onNav={setOpen} />}
    </section>
  )
}
