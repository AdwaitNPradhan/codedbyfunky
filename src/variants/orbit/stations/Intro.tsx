'use client'

import Image from 'next/image'
import clsx from 'clsx'
import { firstSentence } from '../lib/items'
import { useOrbit } from '../lib/store'
import { imgUrl, track } from '../lib/util'
import { ArrowRight, ArrowUpRight, BtnLink, Download } from '../ui/bits'
import { Panel, Station, Title, useGo } from './Station'
import s from '../orbit.module.css'

export function Intro() {
  const { data, mobile } = useOrbit()
  const st = data.settings
  const go = useGo()
  const open = st.availability.status === 'open'
  const selective = st.availability.status === 'selective'
  const lede = firstSentence(st.shortBio)
  const where = [st.location, st.timezone].filter(Boolean).join(' · ')
  const bioParas = (st.longBio || st.shortBio).split(/\n{2,}/).filter(Boolean)
  const socials = st.socials.filter((l) => l.url)

  return (
    <Station i={0}>
      <Panel station={0} a={0} b={mobile ? 0.5 : 0.46} first label="Introduction">
        <div className={clsx(s.copy, s.colHero)}>
          <h1 className={s.h1} data-hero data-hero-title>
            {st.tagline || `${st.name}, ${st.roles[0] ?? 'software engineer'}`}
          </h1>
          <p className={s.lede} data-hero data-hero-rise>
            <strong>{st.name}</strong> — {lede}
          </p>
          <div className={s.actions} data-hero data-hero-rise>
            <BtnLink href="#contact" variant="primary" magnetic cursor="HIRE" onClick={go(6)}>
              Contact
            </BtnLink>
            {st.resumeUrl && (
              <BtnLink href={st.resumeUrl} download magnetic cursor="PDF" onClick={() => track('cta_resume', { where: 'hero' })}>
                Resume <Download />
              </BtnLink>
            )}
            <BtnLink href="#work" variant="text" cursor="FLY" onClick={go(1)}>
              See the work <ArrowRight />
            </BtnLink>
          </div>
          {(open || selective || where) && (
            <ul className={s.meta} data-hero data-hero-rise>
              {(open || selective) && (
                <li className={s.avail} data-status={st.availability.status}>
                  <span className={s.dot} aria-hidden="true" />
                  {open ? 'Open to work' : 'Selectively available'}
                  {st.availability.note && <span className="sr-only"> — {st.availability.note}</span>}
                </li>
              )}
              {where && <li>{where}</li>}
            </ul>
          )}
        </div>
      </Panel>

      <Panel station={0} a={mobile ? 0.55 : 0.5} b={1} label="About">
        <div className={clsx(s.copy, s.colL, s.about)}>
          <Title id="about-title">About</Title>
          <div className={s.aboutBody} data-rise>
            {st.avatar && (
              <div className={s.portrait}>
                <Image
                  src={imgUrl(st.avatar, 'thumb')}
                  alt={st.avatar.alt || st.name}
                  width={160}
                  height={160}
                  sizes="96px"
                  placeholder={st.avatar.blur ? 'blur' : 'empty'}
                  blurDataURL={st.avatar.blur}
                />
              </div>
            )}
            <div className={s.bio}>
              {bioParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          {st.roles.length > 0 && (
            <p className={s.roles} data-rise>
              {st.roles.join(' · ')}
            </p>
          )}
          {socials.length > 0 && (
            <ul className={s.socials} data-rise>
              {socials.map((l) => (
                <li key={l.url}>
                  <BtnLink
                    href={l.url}
                    external
                    variant="text"
                    cursor="OPEN"
                    onClick={() => l.platform === 'instagram' && track('cta_instagram', { where: 'about' })}
                  >
                    {l.label} <ArrowUpRight />
                  </BtnLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </Station>
  )
}
