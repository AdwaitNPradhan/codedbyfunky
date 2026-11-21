'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, m, useDragControls, useMotionValue } from 'motion/react'
import { AppView } from '../apps/registry'
import { CopyButton } from '../apps/common'
import { HOME_APPS, META, needsSpotify, TAB_APPS } from '../appmeta'
import { useClock } from '../hooks'
import { Icon, ShortcutBadge } from '../icons'
import { Pic } from '../Pic'
import { useOS } from '../store'
import type { WinState } from '../types'
import { resumeFileName, social } from '../util'
import { WinIcon } from '../shell/WinIcon'
import { Wallpaper } from '../shell/Wallpaper'
import styles from '../os.module.css'
import ui from '../apps/apps.module.css'

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

function Sheet({ win, top }: { win: WinState; top: boolean }) {
  const os = useOS()
  const controls = useDragControls()
  const y = useMotionValue(0)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
  }, [])
  const title = META[win.app].title(win.props, os.data)
  return (
    <m.div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
      className={styles.sheet}
      style={{ y, zIndex: 9000 + win.z }}
      initial={os.reduced ? { opacity: 0 } : { y: '100%' }}
      animate={os.reduced ? { opacity: 1 } : { y: 0 }}
      exit={os.reduced ? { opacity: 0, transition: { duration: 0.12 } } : { y: '100%', transition: { duration: 0.3, ease: EXPO } }}
      transition={os.reduced ? { duration: 0.12 } : { duration: 0.35, ease: EXPO }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 120 || info.velocity.y > 500) os.close(win.id)
      }}
      inert={!top}
    >
      <div className={styles.sheetBar} onPointerDown={(e) => !(e.target as HTMLElement).closest('button') && controls.start(e)}>
        <button type="button" className={styles.backBtn} onClick={() => os.close(win.id)} aria-label={`Back, close ${title}`}>
          <Icon name="back" size={22} />
          Back
        </button>
        <h2 className={styles.sheetTitle}>{title}</h2>
        <button
          type="button"
          className={styles.sheetShare}
          onClick={() => os.share(win.app, win.props)}
          aria-label={`Share link to ${title}`}
        >
          <Icon name="share" size={22} />
        </button>
      </div>
      <div className={styles.sheetBody}>
        <AppView win={win} active={top} hidden={!top} />
      </div>
    </m.div>
  )
}

export function MobileShell({ stagger }: { stagger: boolean }) {
  const os = useOS()
  const { data } = os
  const s = data.settings
  const clock = useClock({ hour: '2-digit', minute: '2-digit', hour12: false })
  const sheets = [...os.wins].sort((a, b) => a.z - b.z)
  const topId = sheets[sheets.length - 1]?.id ?? null
  const topApp = sheets[sheets.length - 1]?.app
  const ig = s.instagram.url || social(data, 'instagram')
  const avail = s.availability.status !== 'closed'

  // Keep sheets above the on-screen keyboard.
  useEffect(() => {
    const vv = window.visualViewport
    const host = document.querySelector<HTMLElement>('[data-variant="os"]')
    if (!vv || !host) return
    const on = () => host.style.setProperty('--vvh', `${vv.height}px`)
    on()
    vv.addEventListener('resize', on)
    return () => {
      vv.removeEventListener('resize', on)
      host.style.removeProperty('--vvh')
    }
  }, [])

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && topId) os.close(topId)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [os, topId])

  return (
    <div className={`${styles.stage} ${styles.fadeIn}`}>
      <Wallpaper parallax={false} />
      <header className={styles.mTop}>
        <span className={styles.logoMark}>FunkyOS</span>
        <span className={styles.spacer} />
        <span className={styles.clock} suppressHydrationWarning>
          {clock}
        </span>
        <button type="button" className={styles.hire} onClick={() => os.open('mail', { subject: "Let's talk" })}>
          Hire me
        </button>
      </header>

      <div className={styles.home}>
        <section className={styles.welcome} aria-label="Quick view">
          <div className={styles.wtitle}>README.txt · Quick view</div>
          <div className={styles.wbodyM}>
            <div className={ui.aboutHead}>
              {s.avatar && (
                <div className={ui.avatar} style={{ width: 64, height: 64 }}>
                  <Pic img={s.avatar} size="thumb" sizes="64px" alt="" priority />
                </div>
              )}
              <div className={ui.aboutIntro}>
                {avail && (
                  <p className={ui.avail}>
                    <span className={ui.pulse} aria-hidden="true" />
                    {s.availability.status === 'open' ? 'Open to work' : 'Selective availability'}
                  </p>
                )}
                <h2 className={ui.hello} style={{ fontSize: 22, margin: '6px 0 0' }}>
                  <span className={ui.line}>Hi, I’m {s.name}.</span> <span className={ui.line}>I build software.</span>
                </h2>
              </div>
            </div>
            <p className={ui.lede} style={{ fontSize: 14.5 }}>
              {s.tagline || s.shortBio}
            </p>
            <div className={ui.ctaRow}>
              <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => os.open('files', { path: 'projects' })}>
                Projects
              </button>
              {s.resumeUrl && (
                <a className={ui.btn} href={s.resumeUrl} download={resumeFileName(s.resumeUrl, s.name)}>
                  Resume
                </a>
              )}
              <button type="button" className={ui.btn} onClick={() => os.open('mail')}>
                Contact
              </button>
            </div>
            {s.publicEmail && (
              <p className={ui.emailLine} style={{ margin: '8px 0 0', flexWrap: 'wrap' }}>
                <a href={`mailto:${s.publicEmail}`} className={ui.touchLink}>
                  {s.publicEmail}
                </a>
                <CopyButton text={s.publicEmail} label="Copy" className={ui.btnSm} />
              </p>
            )}
            <p style={{ margin: '8px 0 0' }}>
              <button type="button" className={ui.linkBtn} onClick={os.plain}>
                See everything as a plain page →
              </button>
            </p>
          </div>
        </section>

        <nav className={styles.homeGrid} aria-label="Apps">
          {HOME_APPS.filter((a) => needsSpotify(a, data)).map((a, i) => (
            <m.button
              key={a}
              type="button"
              className={styles.hicon}
              style={{ '--i': i } as React.CSSProperties}
              data-home-app={a}
              initial={stagger ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: stagger ? 0.15 + i * 0.04 : 0 }}
              onClick={() => os.open(a, a === 'files' ? { path: 'projects' } : {})}
            >
              <Icon name={META[a].icon} size={56} />
              {META[a].label}
            </m.button>
          ))}
          {(
            [
              ['applications', 'apps', 'Applications'],
              ['media', 'image', 'Media'],
              ['versions', 'html', 'Old versions'],
            ] as const
          ).map(([path, icon, label], i) => (
            <m.button
              key={path}
              type="button"
              className={styles.hicon}
              initial={stagger ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: stagger ? 0.15 + (HOME_APPS.length + i) * 0.04 : 0 }}
              onClick={() => os.open('files', { path })}
            >
              <Icon name={icon} size={56} />
              {label}
            </m.button>
          ))}
          {data.projects
            .filter((p) => p.featured)
            .slice(0, 8)
            .map((p) => (
              <button
                key={p.slug}
                type="button"
                className={styles.hicon}
                aria-label={`${p.title}, app`}
                onClick={() => os.open('product', { slug: p.slug })}
              >
                <WinIcon app="product" props={{ slug: p.slug }} size={56} />
                {p.title}
              </button>
            ))}
          {ig && (
            <a className={styles.hicon} href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram, opens in a new tab">
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon name="instagram" size={56} />
                <span style={{ position: 'absolute', right: -2, bottom: -2 }}>
                  <ShortcutBadge />
                </span>
              </span>
              Instagram
            </a>
          )}
        </nav>
      </div>

      <nav className={styles.tabbar} aria-label="Main tabs">
        {TAB_APPS.map((a) => (
          <button
            key={a}
            type="button"
            className={styles.tab}
            aria-current={topApp === a ? 'true' : undefined}
            data-home-app={a}
            onClick={() => os.open(a, a === 'files' ? { path: 'projects' } : {})}
          >
            <Icon name={META[a].icon} size={26} />
            {META[a].label === 'README.txt' ? 'About' : META[a].label}
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {sheets.map((w) => (
          <Sheet key={w.id} win={w} top={w.id === topId} />
        ))}
      </AnimatePresence>
    </div>
  )
}
