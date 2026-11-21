'use client'

import { useEffect, useRef } from 'react'
import type { SiteData } from '@/lib/types'
import { onReveal, track } from './engine'
import { gsap, ScrollTrigger, SplitText } from './gsap'
import { Arrow, featuredFirst, isLite, Pic, useDarkroom } from './lib'
import s from './story.module.css'
import r from './root.module.css'

const FROM = 'grayscale(1) brightness(0.18) sepia(1) saturate(4) hue-rotate(-25deg)'
const TO = 'grayscale(0) brightness(1) sepia(0) saturate(1) hue-rotate(0deg)'

export function Hero({ data }: { data: SiteData }) {
  const { settings, photos } = data
  const { scrollTo, reduced } = useDarkroom()
  const sec = useRef<HTMLElement>(null)
  const img = useRef<HTMLDivElement>(null)
  const wash = useRef<HTMLDivElement>(null)
  const h1 = useRef<HTMLHeadingElement>(null)

  const photo = featuredFirst(photos)[0]
  const roles = settings.roles.join(' ').toLowerCase()
  const lines =
    /engineer|developer/.test(roles) && /photograph/.test(roles)
      ? ['Engineer by day.', 'Photographer always.']
      : [settings.tagline || settings.name]
  const avail = settings.availability
  const ig = settings.instagram

  useEffect(() => {
    const el = sec.current
    const wrap = img.current
    const veil = wash.current
    const head = h1.current
    if (!el || !wrap || !veil || !head) return

    const ctx = gsap.context(() => {
      if (reduced) return
      /* Develop in the tray: auto-plays after the intro, scroll 0 -> 40vh pushes it further, never back. */
      const dev = gsap
        .timeline({ paused: true, onComplete: () => void gsap.set(wrap, { clearProps: 'filter' }) })
        .fromTo(wrap, { filter: FROM }, { filter: TO, ease: 'none', duration: 1 }, 0)
        .fromTo(veil, { opacity: 1 }, { opacity: 0, ease: 'none', duration: 1 }, 0)
      let auto: gsap.core.Tween | undefined
      if (isLite()) dev.progress(1)
      else gsap.set(wrap, { filter: FROM })

      let split: SplitText | undefined
      let shown = false
      const lift = () => {
        if (split) gsap.to(split.lines, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 })
      }
      void document.fonts.ready.then(() => {
        split = SplitText.create(head, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self: SplitText) => {
            // masks clip at the line box (leading .9): give descenders and ascenders room
            gsap.set(self.masks, { paddingTop: '0.08em', marginTop: '-0.08em', paddingBottom: '0.16em', marginBottom: '-0.16em' })
            if (!shown) gsap.set(self.lines, { yPercent: 130 })
          },
        })
      })

      const off = onReveal(() => {
        shown = true
        lift()
        if (!isLite()) auto = gsap.to(dev, { progress: 1, duration: 2.4, ease: 'power2.out' })
      })

      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: () => `+=${window.innerHeight * 0.4}`,
        onUpdate: (self) => {
          const t = Math.max(self.progress, dev.progress())
          if (t > dev.progress() + 0.001) {
            auto?.kill()
            gsap.to(dev, { progress: t, duration: 0.8, ease: 'power2.out', overwrite: true })
          }
        },
      })
      return () => off()
    }, el)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section id="top" ref={sec} className={s.hero} data-section="top" aria-label="Introduction">
      <div ref={img} className={s.heroImg} data-hero-img>
        {photo && <Pic img={photo.image} rendition="hero" sizes="100vw" priority />}
      </div>
      <div ref={wash} className={s.heroWash} aria-hidden="true" />
      <div className={s.heroShade} aria-hidden="true" />

      {ig?.url && (
        <a
          href={ig.url}
          target="_blank"
          rel="noopener noreferrer"
          className={s.stamp}
          onClick={() => track('cta_instagram', { where: 'hero' })}
          aria-label={`Follow ${ig.handle} on Instagram${ig.followers ? `, ${ig.followers} followers` : ''}`}
        >
          <svg viewBox="0 0 120 120" className={s.stampRing} aria-hidden="true">
            <defs>
              <path id="stampPath" d="M60 60 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0" />
            </defs>
            <text fontSize="9.5" fill="currentColor" fontWeight="500">
              <textPath href="#stampPath" textLength="290" lengthAdjust="spacing">follow the darkroom · {ig.handle} ·</textPath>
            </text>
          </svg>
          <span className={s.stampArrow}><Arrow size={26} /></span>
        </a>
      )}

      <div className={`${s.heroBody} ${s.inner}`}>
        <h1 ref={h1} className={`${r.display} ${s.h1}`}>
          <span className="sr-only">{settings.name}, {settings.roles[0]}. </span>
          {lines.map((l) => (
            <span key={l} className={s.h1Line}>{l} </span>
          ))}
        </h1>

        <div className={s.heroMeta}>
          <p className={s.heroSub}>{settings.tagline}</p>
          <div className={s.heroActions}>
            <a
              href="#contact"
              className={r.btn}
              onClick={(e) => {
                e.preventDefault()
                scrollTo('#contact')
              }}
            >
              Contact
            </a>
            <a
              href="#work"
              className={`${r.btnGhost} ${r.link}`}
              onClick={(e) => {
                e.preventDefault()
                scrollTo('#work')
              }}
            >
              See work <Arrow dir="down" />
            </a>
            {settings.resumeUrl && (
              <a href={settings.resumeUrl} download className={`${r.btnGhost} ${r.link}`} onClick={() => track('cta_resume', { where: 'hero' })}>
                Resume <Arrow dir="down" />
              </a>
            )}
          </div>
          <p className={`${r.mono} ${s.heroFacts}`}>
            <span>{settings.name}</span>
            {settings.roles[0] && <span>{settings.roles[0]}</span>}
            {settings.location && <span>{settings.location}{settings.timezone ? ` · ${settings.timezone}` : ''}</span>}
            {avail.status !== 'closed' && (
              <span className={s.avail}>
                <i aria-hidden="true" />
                {avail.note || (avail.status === 'open' ? 'Open to work' : 'Selective projects')}
              </span>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
