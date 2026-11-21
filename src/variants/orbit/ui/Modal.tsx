'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import clsx from 'clsx'
import s from '../orbit.module.css'
import { Close } from './bits'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * In-page dialog: Esc closes, Tab is trapped, focus returns to the opener.
 * The rest of the app is `inert` while this is mounted (set by the root).
 */
export function Modal({ label, onClose, children, wide }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // captured during the first render (before any focus move) so StrictMode's double effect cannot overwrite it
  const openerRef = useRef<HTMLElement | null>(null)
  if (openerRef.current === null && typeof document !== 'undefined') openerRef.current = document.activeElement as HTMLElement | null

  useEffect(() => {
    const opener = openerRef.current
    const el = ref.current
    const first = el?.querySelector<HTMLElement>('[data-autofocus]')
    ;(first ?? el)?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !el) return
      const f = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      // after the root drops `inert`
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus({ preventScroll: true })
      })
    }
  }, [])

  return (
    <div className={s.modalRoot}>
      <div className={s.backdrop} onClick={() => onClose()} aria-hidden="true" />
      <div ref={ref} className={clsx(s.dialog, wide && s.dialogWide)} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} data-lenis-prevent>
        <button type="button" className={s.dialogClose} onClick={() => onClose()} aria-label="Close" data-autofocus data-cursor="CLOSE">
          <Close />
        </button>
        {children}
      </div>
    </div>
  )
}
