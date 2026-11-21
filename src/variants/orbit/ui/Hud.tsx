'use client'

import clsx from 'clsx'
import { N_STATIONS, STATIONS } from '../lib/config'
import { useOrbit } from '../lib/store'
import { pad, track } from '../lib/util'
import { igHandle } from '../stations/Photography'
import { ArrowUpRight, Download } from './bits'
import s from '../orbit.module.css'

export function Hud({
  plain,
  canFly,
  onToggleView,
  sound,
}: {
  plain: boolean
  canFly: boolean
  onToggleView: () => void
  sound: { on: boolean; toggle: () => void }
}) {
  const { data, api, station } = useOrbit()
  const st = data.settings
  const ig = st.instagram
  const go = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    api.toStation(i)
  }
  return (
    <>
      <header className={s.top}>
        <a href="#hello" className={s.mark} onClick={go(0)} data-cursor="HOME" aria-label={`${st.name} — back to top`}>
          {st.handle || st.name}
        </a>
        <nav className={s.topNav} aria-label="Primary">
          <a href="#work" className={s.topLink} onClick={go(1)}>
            Work
          </a>
          {st.resumeUrl && (
            <a href={st.resumeUrl} download className={s.topLink} onClick={() => track('cta_resume', { where: 'nav' })}>
              Resume <Download />
            </a>
          )}
          <a href="#contact" className={clsx(s.topLink, s.topCta)} onClick={go(6)}>
            Contact
          </a>
        </nav>
      </header>

      {!plain && (
        <nav className={s.rail} aria-label="Stations">
          <ol>
            {STATIONS.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={s.tick}
                  aria-current={i === station ? 'step' : undefined}
                  aria-label={`${pad(i + 1)} ${t.label}`}
                  onClick={() => api.toStation(i)}
                >
                  <span className={s.tickLabel}>{t.label}</span>
                  <span className={s.tickMark} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className={s.foot}>
        {!plain && (
          <p className={s.counter} aria-live="off">
            {pad(station + 1)}/{pad(N_STATIONS)} <span>{STATIONS[station].label}</span>
          </p>
        )}
        <div className={s.toggles}>
          {canFly && (
            <button type="button" className={s.toggle} aria-pressed={plain} onClick={onToggleView}>
              {plain ? 'Flight view' : 'Plain view'}
            </button>
          )}
          <button type="button" className={s.toggle} aria-pressed={sound.on} onClick={sound.toggle}>
            Sound {sound.on ? 'on' : 'off'}
          </button>
        </div>
      </div>

      {ig.url && (
        <a className={s.igFloat} href={ig.url} target="_blank" rel="noopener noreferrer" onClick={() => track('cta_instagram', { where: 'hud' })}>
          {igHandle(ig.handle)} <ArrowUpRight />
        </a>
      )}
    </>
  )
}
