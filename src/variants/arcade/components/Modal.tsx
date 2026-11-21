'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../lib/misc'
import { Icon } from './art'

/**
 * Native <dialog>: focus is trapped, Esc closes, focus returns to the opener.
 * Children mount only while open, so games and images inside never run in the background.
 */
export function Modal({
  open,
  onClose,
  label,
  className,
  tone = 'cream',
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  tone?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="ar-dialog"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className={cx('ar-dialog__panel', `tone-${tone}`, className)}>
          <button
            type="button"
            className="ar-btn ar-btn--sm ar-dialog__close"
            onClick={onClose}
            data-native-cursor=""
          >
            <Icon name="close" size={18} /> Close
          </button>
          {children}
        </div>
      )}
    </dialog>
  )
}
