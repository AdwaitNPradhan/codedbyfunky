'use client'

import { useEffect, useState } from 'react'
import { ACHIEVEMENTS, award, getState, setSound, useArcade, visit } from '../lib/store'
import { sfx } from '../lib/sound'
import { cx, track } from '../lib/misc'
import { Icon } from './art'
import { Modal } from './Modal'

const LINKS = [
  ['Work', 'work'],
  ['Play', 'play'],
  ['Photos', 'photos'],
  ['Lab', 'lab'],
  ['Contact', 'contact'],
] as const

const SECTION_IDS = [
  'top',
  'about',
  'work',
  'play',
  'photos',
  'lab',
  'skills',
  'experience',
  'contact',
]

export function Nav({ handle, resumeUrl }: { handle: string; resumeUrl: string | null }) {
  const [active, setActive] = useState('top')
  const [menu, setMenu] = useState(false)
  const [ach, setAch] = useState(false)
  const [stuck, setStuck] = useState(false)
  const coins = useArcade((s) => s.coins)
  const pulse = useArcade((s) => s.coinPulse)
  const sound = useArcade((s) => s.sound)
  const unlocked = useArcade((s) => s.unlocked)

  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (e): e is HTMLElement => !!e,
    )
    // The band is a thin line across the middle of the viewport: whichever section crosses it is "current".
    const ids = els.map((e) => e.id)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          setActive(e.target.id)
          visit(e.target.id)
          if (ids.every((id) => getState().visited.includes(id))) award('explorer')
        }
      },
      { rootMargin: '-45% 0px -54% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  const resume = resumeUrl && (
    <a
      className="ar-btn ar-btn--pink ar-btn--sm"
      href={resumeUrl}
      download
      onClick={() => track('cta_resume', { where: 'nav' })}
    >
      <Icon name="download" size={18} /> Resume
    </a>
  )

  return (
    <>
      <header className={cx('ar-nav', stuck && 'is-stuck', menu && 'is-open')}>
        <div className="ar-nav__bar">
          <a href="#top" className="ar-nav__logo" aria-label={`${handle} — back to top`}>
            {handle}
          </a>
          <nav aria-label="Primary" className="ar-nav__links">
            {LINKS.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className={cx('ar-pill', active === id && 'is-active')}
                aria-current={active === id ? 'location' : undefined}
              >
                {label}
              </a>
            ))}
            {resume}
          </nav>
          <div className="ar-nav__tools">
            <button
              type="button"
              className="ar-pill ar-pill--coin"
              onClick={() => setAch(true)}
              aria-label={`Coins: ${coins}. Open achievements`}
            >
              <Icon name="coin" size={18} />
              <span key={pulse} className="ar-coin-num">
                {String(coins).padStart(3, '0')}
              </span>
            </button>
            <button
              type="button"
              className="ar-pill ar-pill--sound"
              aria-pressed={sound}
              onClick={() => (setSound(!sound), sound || setTimeout(sfx.coin, 30))}
            >
              SOUND: {sound ? 'ON' : 'OFF'}
            </button>
          </div>
          <button
            type="button"
            className="ar-pill ar-nav__menu"
            aria-expanded={menu}
            aria-controls="ar-menu"
            onClick={() => setMenu((m) => !m)}
          >
            <Icon name={menu ? 'close' : 'menu'} size={18} /> Menu
          </button>
        </div>
        {menu && (
          <div id="ar-menu" className="ar-nav__panel">
            {LINKS.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="ar-pill ar-pill--lg"
                onClick={() => setMenu(false)}
              >
                {label}
              </a>
            ))}
            <div className="ar-nav__panel-row">
              <button
                type="button"
                className="ar-pill"
                aria-pressed={sound}
                onClick={() => setSound(!sound)}
              >
                SOUND: {sound ? 'ON' : 'OFF'}
              </button>
              {resumeUrl && (
                <a
                  className="ar-pill ar-pill--pink"
                  href={resumeUrl}
                  download
                  onClick={() => track('cta_resume', { where: 'menu' })}
                >
                  Resume
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      <div className={cx('ar-bottombar', active === 'contact' && 'is-hidden')}>
        <a className="ar-btn ar-btn--pink" href="#contact">
          Hire me
        </a>
        {resumeUrl && (
          <a
            className="ar-btn"
            href={resumeUrl}
            download
            onClick={() => track('cta_resume', { where: 'bottombar' })}
          >
            Resume
          </a>
        )}
      </div>

      <Modal
        open={ach}
        onClose={() => setAch(false)}
        label="Achievements"
        tone="yellow"
        className="ar-ach"
      >
        <h2 className="ar-h2 ar-h2--md">Achievements</h2>
        <p className="ar-lede">
          {unlocked.length} of {ACHIEVEMENTS.length} unlocked · {coins} coins. Coins come from
          exploring: sections, drags, games and secrets.
        </p>
        <ul className="ar-ach__list">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.includes(a.id)
            return (
              <li key={a.id} className={cx('ar-ach__item', got && 'is-got')}>
                <span className="ar-ach__mark" aria-hidden="true">
                  {got ? <Icon name="check" size={18} /> : <Icon name="coin" size={18} />}
                </span>
                <span>
                  <strong>{a.secret && !got ? '???' : a.title}</strong>
                  <span className="ar-ach__desc">
                    {a.secret && !got ? 'A secret. Hint: it is a very old code.' : a.desc}
                  </span>
                </span>
                <span className="ar-ach__state">{got ? 'UNLOCKED' : `+${a.coins}`}</span>
              </li>
            )
          })}
        </ul>
      </Modal>
    </>
  )
}

export function Toasts() {
  const toasts = useArcade((s) => s.toasts)
  return (
    <div className="ar-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="ar-toast">
          <strong>{t.title}</strong>
          <span>{t.desc}</span>
        </div>
      ))}
    </div>
  )
}
