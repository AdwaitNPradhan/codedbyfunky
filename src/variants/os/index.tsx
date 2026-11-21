'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import type { SiteData } from '@/lib/types'
import { FramedScreen } from './FramedScreen'
import { fontVars } from './fonts'
import { useFramed, useMedia, useMounted, usePlainParam } from './hooks'
import { MobileShell } from './mobile/MobileShell'
import { PlainContent, PlainView } from './PlainPage'
import { getDoom } from '@/app/actions/doom'
import { Boot } from './shell/Boot'
import { Desktop } from './shell/Desktop'
import { DoomFx, DoomScreen } from './shell/DoomScreen'
import { Toast } from './shell/Toast'
import { OSProvider, useOS } from './store'
import { store } from './util'
import styles from './os.module.css'

const NOSCRIPT = `[data-os-splash]{display:none!important}
[data-variant="os"][data-os-root]{height:auto!important;overflow:auto!important;background:#f6f1e4!important}
[data-os-plain-sr]{position:static!important;width:auto!important;height:auto!important;margin:0!important;overflow:visible!important;clip:auto!important;clip-path:none!important;white-space:normal!important;color:#1b1b1f;padding:24px;max-width:880px;margin:0 auto!important;font:17px/1.6 system-ui,sans-serif}
[data-os-plain-sr] h1{font-size:34px;line-height:1.1}[data-os-plain-sr] h2{font-size:24px;margin-top:40px;border-top:2px solid #1b1b1f;padding-top:10px}[data-os-plain-sr] ul{padding-left:20px}[data-os-plain-sr] a{color:#1f4e54}`

/** Server-rendered and pre-hydration: a black BIOS screen with real text, and all content hidden with clip for crawlers. */
function ServerShell({ data }: { data: SiteData }) {
  return (
    <div data-variant="os" data-os-root className={`${styles.root} ${fontVars}`}>
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
      <div className={styles.boot} data-os-splash aria-hidden="true">
        <p className={styles.bootLines}>
          <span>FunkyOS BIOS v1.0</span>
          <span>
            <i className={styles.bootCursor} />
          </span>
        </p>
      </div>
      <div className={styles.sr} data-os-plain-sr>
        <PlainContent data={data} visible={false} />
      </div>
    </div>
  )
}

type BootMode = 'full' | 'mobile' | 'quick' | 'reduced'

function Frame({ data }: { data: SiteData }) {
  const os = useOS()
  const { settings, reduced, mobile } = os
  const [revealed, setRevealed] = useState(false)
  const [booting, setBooting] = useState(true)
  const [bootKey, setBootKey] = useState(0)
  const [black, setBlack] = useState(false)
  const [crt, setCrt] = useState(false)
  const rebooted = useRef(false)
  const dead = os.doom.phase === 'dead'
  const doomRef = useRef(os.doom.phase)
  doomRef.current = os.doom.phase

  // Is the site "down"? Asked once per visit, after hydration, so the server HTML and the cache stay normal.
  const { doomDead, doomRestore } = os
  useEffect(() => {
    let off = false
    getDoom()
      .then((d) => {
        if (!off && d.active) doomDead(d.until, d.now)
      })
      .catch(() => {})
    return () => {
      off = true
    }
  }, [doomDead])
  useEffect(() => {
    if (dead) setBooting(false)
  }, [dead])
  const reboot = useCallback(() => {
    rebooted.current = true
    doomRestore()
    setCrt(false)
    setRevealed(false)
    setBlack(false)
    setBooting(true)
    setBootKey((k) => k + 1)
  }, [doomRestore])

  const mode = useMemo<BootMode>(() => {
    if (reduced) return 'reduced'
    if (mobile) return 'mobile'
    return store.get('session', 'funkyBooted') && !rebooted.current ? 'quick' : 'full'
    // The mode is fixed per boot; later setting changes must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootKey])

  const onReveal = useCallback(() => {
    store.set('session', 'funkyBooted', '1')
    setRevealed(true)
    if (doomRef.current === 'dead') return
    if (rebooted.current) {
      if (!mobile) os.open('about')
    } else os.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os.start, os.open, mobile])
  const onDone = useCallback(() => setBooting(false), [])

  // Shut down: CRT collapse (0.4s), black (0.6s), then reboot.
  useEffect(() => {
    if (!os.shuttingDown) return
    const t: ReturnType<typeof setTimeout>[] = []
    const ms = reduced ? 150 : 400
    setCrt(true)
    t.push(
      setTimeout(() => setBlack(true), ms),
      setTimeout(() => {
        rebooted.current = true
        os.endShutdown()
        setCrt(false)
        setRevealed(false)
        setBlack(false)
        setBooting(true)
        setBootKey((k) => k + 1)
      }, ms + 600),
    )
    return () => t.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os.shuttingDown])

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? 'always' : 'user'}>
      <div
        data-variant="os"
        data-os-root
        className={`${styles.root} ${fontVars}`}
        data-wall={settings.wall}
        data-accent={settings.accent}
        data-reduced={reduced}
        data-mobile={mobile}
        data-busy={os.busy}
        data-doom={os.doom.phase}
        data-doom-step={os.doom.step}
      >
        <a
          className={styles.skipLink}
          href="/os?plain=1"
          onClick={(e) => {
            e.preventDefault()
            os.plain()
          }}
        >
          Switch to plain text version
        </a>
        <div className={crt ? styles.crtOff : undefined} style={{ position: 'absolute', inset: 0 }}>
          {revealed &&
            !dead &&
            (mobile ? (
              <MobileShell stagger={!rebooted.current} />
            ) : (
              <Desktop stagger={!rebooted.current} />
            ))}
        </div>
        {os.doom.phase === 'wipe' && <DoomFx step={os.doom.step} />}
        {dead && <DoomScreen onRestore={reboot} />}
        {booting && !dead && (
          <Boot key={bootKey} data={data} mode={mode} onReveal={onReveal} onDone={onDone} />
        )}
        {revealed && !dead && <Toast />}
        {black && <div className={styles.black} />}
        <div className={styles.sr} data-os-plain-sr>
          <PlainContent data={data} visible={false} />
        </div>
      </div>
    </MotionConfig>
  )
}

export default function Site({ data }: { data: SiteData }) {
  const mounted = useMounted()
  const plain = usePlainParam()
  const framed = useFramed()
  const mobile = useMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1100px)')

  useEffect(() => {
    if (!(mounted && plain)) return
    const t = document.title
    document.title = `${data.settings.name}: plain page`
    return () => {
      document.title = t
    }
  }, [mounted, plain, data.settings.name])

  if (!mounted) return <ServerShell data={data} />
  // Never boot a second desktop inside a FunkyOS browser window.
  if (framed) return <FramedScreen />
  if (plain)
    return (
      <PlainView
        data={data}
        onDesktop={() => {
          history.pushState(null, '', '/os')
          window.dispatchEvent(new PopStateEvent('popstate'))
        }}
      />
    )
  return (
    <LazyMotion features={domMax} strict>
      <OSProvider data={data} mobile={mobile}>
        <Frame data={data} />
      </OSProvider>
    </LazyMotion>
  )
}
