'use client'

import { useEffect, useState } from 'react'
import { fontVars } from './fonts'
import { safeParse, store } from './util'
import type { Accent, Settings, Wall } from './types'
import styles from './os.module.css'

type Nav = { canGoBack: boolean; back: () => void }

/**
 * Shown instead of the desktop when FunkyOS runs inside an iframe.
 * An old version links back to "/", which is FunkyOS. A second desktop in a desktop would be a mess.
 */
export function FramedScreen() {
  const [look, setLook] = useState<{ wall: Wall; accent: Accent }>({ wall: 'teal', accent: 'orange' })
  const [canBack, setCanBack] = useState(false)

  useEffect(() => {
    const s = safeParse<Partial<Settings>>(store.get('local', 'funkyos.settings.v1'), {})
    setLook({ wall: s.wall ?? 'teal', accent: s.accent ?? 'orange' })
    // history.back() inside an iframe can leave the parent page. Only offer Back when the frame has its own entry.
    const nav = (window as Window & { navigation?: Nav }).navigation
    setCanBack(Boolean(nav?.canGoBack))
  }, [])

  const back = () => {
    const nav = (window as Window & { navigation?: Nav }).navigation
    if (nav?.canGoBack) nav.back()
  }

  return (
    <div
      data-variant="os"
      data-os-root
      data-wall={look.wall}
      data-accent={look.accent}
      className={`${styles.root} ${fontVars} ${styles.nestRoot}`}
    >
      <main className={styles.nest} aria-labelledby="nest-h">
        <div className={styles.nestTitle}>
          <span>FunkyOS</span>
        </div>
        <div className={styles.nestBody}>
          <div className={styles.nestArt} aria-hidden="true">
            <i>
              <i>
                <i />
              </i>
            </i>
          </div>
          <h1 id="nest-h" className={styles.nestH}>
            You are already inside FunkyOS.
          </h1>
          <p>
            This page is a window on a FunkyOS desktop. Another desktop in here would be a desktop in a
            desktop in a desktop.
          </p>
          <div className={styles.nestActions}>
            <a className={styles.nestPrimary} href="/" target="_top">
              Open FunkyOS in the top window
            </a>
            {canBack && (
              <button type="button" className={styles.nestSecondary} onClick={back}>
                Go back
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
