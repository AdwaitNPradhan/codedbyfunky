'use client'

import { useEffect, useRef, useState } from 'react'
import { getDoom, recoverDoom } from '@/app/actions/doom'
import { useOS } from '../store'
import { sfx } from '../sound'
import styles from '../os.module.css'

const SNARK = [
  'Keyboard detected. Press F1 to continue. (There is no F1. There is also no disk.)',
  'Nice try. The boot disk is gone. So are the backups.',
  'Mashing keys will not bring back a root directory.',
  'Have you tried turning it off and on again? It is already off.',
  'Somebody typed sudo rm -rf / and now you are here. Be kind to them.',
  'The boot disk is not under the keyboard either.',
  'Still no boot device. The restore timer is real. Go and get a coffee.',
  'Error 0x0000: the portfolio is out for lunch.',
]

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  return `${h > 0 ? `${h}:` : ''}${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** "No bootable device found." A client-only overlay: the server HTML stays normal. */
export function DoomScreen({ onRestore }: { onRestore: () => void }) {
  const { doom, reduced } = useOS()
  const [now, setNow] = useState(() => Date.now() + doom.skew)
  const [snark, setSnark] = useState<string | null>(null)
  const nth = useRef(0)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + doom.skew), 250)
    return () => clearInterval(t)
  }, [doom.skew])
  const left = Math.max(0, doom.until - now)
  const restoring = left <= 0

  useEffect(() => {
    if (!restoring) return
    const t = setTimeout(onRestore, 2600)
    return () => clearTimeout(t)
  }, [restoring, onRestore])

  // Ends early for everyone when the owner restores or flips the CMS kill switch.
  useEffect(() => {
    const t = setInterval(() => {
      getDoom()
        .then((d) => !d.active && onRestore())
        .catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [onRestore])

  const [root, setRoot] = useState<'idle' | 'busy' | 'denied'>('idle')
  const restore = async () => {
    setRoot('busy')
    const r = await recoverDoom().catch(() => ({ ok: false }))
    if (r.ok) onRestore()
    else setRoot('denied')
  }

  // Any key or tap only earns a snarky line (except on the restore controls).
  useEffect(() => {
    const on = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('[data-restore]')) return
      if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey || e.altKey)) return
      sfx.error()
      setSnark(SNARK[nth.current++ % SNARK.length])
    }
    window.addEventListener('keydown', on)
    window.addEventListener('pointerdown', on)
    return () => {
      window.removeEventListener('keydown', on)
      window.removeEventListener('pointerdown', on)
    }
  }, [])

  const minutes = Math.ceil(left / 60000)
  return (
    <main className={styles.doomScreen} data-reduced={reduced} aria-label="No bootable device found">
      <div className={styles.doomLines}>
        <p>FunkyOS BIOS v1.0 &nbsp; Copyright (C) codedbyfunky</p>
        <p>CPU: PixelCore @ 8 MHz ............. OK</p>
        <p>Memory test: 640K .................. OK</p>
        <p>&nbsp;</p>
        <p>Detecting primary master ........... none</p>
        <p>Detecting primary slave ............ none</p>
        <p>&nbsp;</p>
        <h1 className={styles.doomH}>No bootable device found.</h1>
        <p>
          Insert boot disk and press any key.
          <i className={styles.doomCursor} aria-hidden="true" />
        </p>
        <p>&nbsp;</p>
        <p>
          Reason: someone ran <code>rm -rf /</code> on the root directory.
        </p>
        <p>Affected: every visitor. Backups: restoring.</p>
        <p className={styles.doomCount}>
          {restoring ? (
            'Restoring from backup…'
          ) : (
            <>
              System restore in <span aria-hidden="true">{clock(left)}</span>
              <span className={styles.srOnly}>{` about ${minutes} minute${minutes === 1 ? '' : 's'}`}</span>
            </>
          )}
        </p>
        <p data-restore>
          <button type="button" className={styles.doomRestore} onClick={restore} disabled={root === 'busy'}>
            {root === 'busy' ? '[ Checking root… ]' : '[ Restore system (root only) ]'}
          </button>
        </p>
        {root === 'denied' && (
          <p data-restore role="alert">
            Permission denied: only root can restore.{' '}
            <a href="/admin" target="_blank" rel="noopener noreferrer" className={styles.doomRestoreLink}>
              Log in as root
            </a>
            , then press Restore again.
          </p>
        )}
        <p className={styles.doomSnark} role="status" aria-live="polite">
          {snark ?? ' '}
        </p>
      </div>
    </main>
  )
}

/** Glitch bars and the fade to black while the wipe runs. */
export function DoomFx({ step }: { step: number }) {
  return <div className={styles.doomFx} data-step={step} aria-hidden="true" />
}
