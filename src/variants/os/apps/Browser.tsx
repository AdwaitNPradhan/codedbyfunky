'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'
import { useOS } from '../store'
import type { AppProps } from '../types'
import { SITE_HOST, versionByKey, versionPath, type VersionKey } from '../versions'
import { Empty } from './common'
import ui from './apps.module.css'

/** The Navigation API is not in every TypeScript lib yet. Only the parts used here. */
type Nav = {
  canGoBack: boolean
  back: () => void
  addEventListener: (type: string, fn: () => void) => void
}
const navOf = (w: Window | null | undefined) =>
  (w as (Window & { navigation?: Nav }) | null | undefined)?.navigation

/** One old version of the site in a same-origin iframe. Mounted only while the window is visible. */
function Page({ id, vkey, file }: { id: string; vkey: VersionKey; file: string }) {
  const os = useOS()
  const frame = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)
  const [path, setPath] = useState(versionPath(vkey))
  const [canBack, setCanBack] = useState(false)
  // Fallback for browsers without the Navigation API: count document loads.
  const depth = useRef(0)
  const flag = useRef<'back' | 'reload' | null>(null)
  const seen = useRef(false)
  const win = os.wins.find((w) => w.id === id)

  useEffect(() => {
    if (loaded) return
    const t = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(t)
  }, [loaded])

  // Clicks inside the iframe never reach the window frame. Raise the window when the iframe takes focus.
  const { focus, setPaletteOpen } = os
  useEffect(() => {
    const on = () =>
      setTimeout(() => {
        if (document.activeElement === frame.current) focus(id)
      })
    window.addEventListener('blur', on)
    return () => window.removeEventListener('blur', on)
  }, [id, focus])

  const sync = () => {
    const cw = frame.current?.contentWindow
    if (!cw) return
    try {
      setPath(cw.location.pathname + cw.location.search)
      const nav = navOf(cw)
      setCanBack(nav ? nav.canGoBack : depth.current > 0)
    } catch {
      /* the page left this origin: keep the last address */
    }
  }

  const onLoad = () => {
    setLoaded(true)
    if (flag.current === 'back') depth.current = Math.max(0, depth.current - 1)
    else if (flag.current !== 'reload' && seen.current) depth.current += 1
    flag.current = null
    seen.current = true
    sync()
    try {
      const cw = frame.current?.contentWindow
      navOf(cw)?.addEventListener('currententrychange', sync)
      // Key presses inside the iframe never reach the desktop. Forward the palette shortcut.
      cw?.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          setPaletteOpen(true)
        }
      })
    } catch {
      /* ignore */
    }
  }

  const back = () => {
    const cw = frame.current?.contentWindow
    try {
      const nav = navOf(cw)
      if (nav) {
        if (nav.canGoBack) nav.back()
      } else if (depth.current > 0) {
        flag.current = 'back'
        cw?.history.back()
      }
    } catch {
      /* ignore */
    }
  }

  const reload = () => {
    setLoaded(false)
    setSlow(false)
    flag.current = 'reload'
    try {
      frame.current?.contentWindow?.location.reload()
    } catch {
      if (frame.current) frame.current.src = versionPath(vkey)
    }
  }

  return (
    <div className={ui.browser}>
      <div className={ui.bBar}>
        <button type="button" className={ui.bBtn} onClick={back} disabled={!canBack} aria-label="Back in this page">
          <Icon name="back" size={16} />
        </button>
        <button type="button" className={ui.bBtn} onClick={reload} aria-label="Reload this page">
          <Icon name="reload" size={16} />
        </button>
        <div className={ui.bAddr}>
          <Icon name="lock" size={12} className={ui.bLock} />
          <input
            readOnly
            value={`${SITE_HOST}${path}`}
            aria-label="Address (read only)"
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
        <a className={ui.bBtn} href={path} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file} in a new tab`}>
          <Icon name="external" size={16} />
          <span className={ui.bTxt}>New tab</span>
        </a>
        {!os.mobile && (
          <button
            type="button"
            className={ui.bBtn}
            onClick={() => os.toggleMax(id)}
            aria-label={win?.maximized ? 'Restore window size' : 'Maximize window'}
            aria-pressed={Boolean(win?.maximized)}
          >
            <Icon name="expand" size={16} />
            <span className={ui.bTxt}>{win?.maximized ? 'Restore' : 'Maximize'}</span>
          </button>
        )}
      </div>
      <div className={ui.bStage}>
        <iframe
          ref={frame}
          className={ui.bFrame}
          src={versionPath(vkey)}
          title={`${file}: an earlier version of this website`}
          onLoad={onLoad}
          allow="autoplay; fullscreen; gamepad; clipboard-write"
        />
        <div className={`${ui.bLoad} ${loaded ? ui.bLoadDone : ''}`} role="status" aria-live="polite">
          {loaded ? null : (
            <>
              <Icon name={versionByKey(vkey)?.icon ?? 'html'} size={48} />
              <p>Opening {file}…</p>
              <span className={ui.bTrack} aria-hidden="true">
                <i />
              </span>
              {slow && <p className={ui.bSlow}>Still loading. Old files are heavy.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Browser({ id, props, hidden }: AppProps) {
  const v = versionByKey(props.v)
  if (!v) return <Empty>That version is not in this folder. Open Old Versions in Files.</Empty>
  // A minimised window drops its iframe so the old page stops running. Restoring loads it again.
  if (hidden)
    return (
      <div className={ui.loading} role="status">
        {v.file} is paused while the window is minimised.
      </div>
    )
  return <Page id={id} vkey={v.key} file={v.file} />
}
