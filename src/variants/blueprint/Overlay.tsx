'use client'

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBP } from './ctx'
import b from './base.module.css'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'

/**
 * A "drawing sheet" modal. Renders outside the page wrapper so the page can be `inert`
 * while it is open. Esc closes, Tab is trapped, focus returns to the opener.
 */
export function Overlay({
  label,
  onClose,
  children,
  className,
}: {
  label: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const { overlayRoot, lock } = useBP()
  const ref = useRef<HTMLDivElement>(null)
  const ready = Boolean(overlayRoot)

  const opener = useRef<HTMLElement | null>(null)
  const alive = useRef(false)
  useEffect(() => {
    if (!ready) return
    // capture the opener once (React strict mode runs this effect twice in dev)
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null
    alive.current = true
    const unlock = lock()
    ref.current?.focus({ preventScroll: true })
    return () => {
      alive.current = false
      unlock()
      // the page is still inert until React commits the unlock, so restore focus a beat later (real unmount only)
      window.setTimeout(() => {
        if (!alive.current) opener.current?.focus?.({ preventScroll: true })
      }, 60)
    }
  }, [ready, lock])

  if (!overlayRoot) return null

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === ref.current)
    ) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      ref={ref}
      className={`${b.overlay} ${className ?? ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKey}
      data-lenis-prevent
    >
      <button
        type="button"
        className={b.scrim}
        onClick={onClose}
        aria-label="Close sheet"
        tabIndex={-1}
      />
      {children}
    </div>,
    overlayRoot,
  )
}

/** The X that closes a sheet. Drawn, not a glyph. */
export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className={b.closeBtn} onClick={onClick}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M2 2 L14 14 M14 2 L2 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span>{label}</span>
      <kbd>ESC</kbd>
    </button>
  )
}
