'use client'

import { useEffect, useRef, useState } from 'react'
import type { Project } from '@/lib/types'
import { gsap } from './gsap'
import { Arrow, featuredFirst, isLite, MQ_FINE, pad2, Pic, useDarkroom, useMedia } from './lib'
import s from './story.module.css'
import r from './root.module.css'

const VISIBLE = 6

/** Print index: editorial rows. On a fine pointer the cover follows the cursor (lerp 0.12, tilt by x-velocity). */
export function Work({ projects }: { projects: Project[] }) {
  const { openProject, reduced } = useDarkroom()
  const fine = useMedia(MQ_FINE)
  const ordered = featuredFirst(projects)
  const [all, setAll] = useState(false)
  const shown = all ? ordered : ordered.slice(0, VISIBLE)
  const [hover, setHover] = useState(-1)
  const trail = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const t = trail.current
    if (!t || !fine || reduced || isLite()) return
    let tx = 0, ty = 0, cx = 0, cy = 0, init = false, tilt = 0
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!init) {
        cx = tx
        cy = ty
        init = true
      }
    }
    const tick = (_: number, dt: number) => {
      const k = 1 - Math.pow(1 - 0.12, dt / 16.67)
      const vx = (tx - cx) * k
      cx += vx
      cy += (ty - cy) * k
      tilt += (Math.max(-6, Math.min(6, vx * 0.5)) - tilt) * 0.2
      t.style.transform = `translate3d(${cx + 28}px,${cy - 110}px,0) rotate(${tilt}deg)`
    }
    window.addEventListener('pointermove', move, { passive: true })
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      gsap.ticker.remove(tick)
    }
  }, [fine, reduced])

  if (!projects.length) return null
  return (
    <section id="work" className={`${r.section} ${s.work}`} data-section="work" aria-labelledby="work-h">
      <div className={r.inner}>
        <div className={r.head}>
          <h2 id="work-h" className={r.title}>Work</h2>
          <p className={r.caption}>print index: software I designed, built and shipped</p>
        </div>

        <ul ref={list} className={s.index} onPointerLeave={() => setHover(-1)}>
          {shown.map((p, i) => (
            <li key={p.id}>
              <a
                href={`#project-${p.slug}`}
                className={s.row}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(-1)}
                onClick={(e) => {
                  e.preventDefault()
                  const b = e.currentTarget.getBoundingClientRect()
                  const x = e.detail === 0 ? b.left + b.width / 2 : e.clientX
                  const y = e.detail === 0 ? b.top + b.height / 2 : e.clientY
                  openProject(p.slug, x, y, e.currentTarget)
                }}
              >
                <span className={`${r.mono} ${s.rowNo}`}>{pad2(i + 1)}</span>
                <span className={s.rowMain}>
                  <span className={s.rowTitle}>{p.title}</span>
                  <span className={s.rowSummary}>{p.summary}</span>
                </span>
                <span className={`${r.mono} ${s.rowYear}`}>{p.year ?? ''}</span>
                <span className={s.rowStack}>{p.stack.slice(0, 4).join(' · ')}</span>
                {p.cover && (
                  <span className={s.rowThumb} aria-hidden="true">
                    <Pic img={p.cover} rendition="thumb" sizes="96px" />
                  </span>
                )}
                <span className={s.rowArrow} aria-hidden="true"><Arrow size={22} /></span>
              </a>
            </li>
          ))}
        </ul>

        {ordered.length > VISIBLE && (
          <button type="button" className={`${r.btnLine} ${s.allWork}`} aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? 'Show fewer' : `All work (${ordered.length})`}
          </button>
        )}
      </div>

      <div ref={trail} className={s.trail} data-on={hover >= 0} aria-hidden="true">
        {shown.map((p, i) =>
          p.cover ? (
            <span key={p.id} className={s.trailImg} data-active={hover === i}>
              <Pic img={p.cover} rendition="thumb" sizes="320px" loading="lazy" />
            </span>
          ) : null,
        )}
      </div>
    </section>
  )
}
