'use client'

import { useEffect, useRef } from 'react'
import type { Store } from '../lib/store'
import s from '../orbit.module.css'

/**
 * Desktop pointer ring. 12px dot → 56px with a label over anything actionable ([data-cursor] or 3D hits),
 * 2px caret bar over copy, hidden (native cursor) over form fields.
 */
export function Cursor({ store, enabled }: { store: Store; enabled: boolean }) {
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ring.current
    const lab = label.current
    if (!enabled || !el || !lab) return
    let x = -100
    let y = -100
    let tx = -100
    let ty = -100
    let raf = 0
    let domLabel: string | null = null
    let threeLabel: string | null = null
    let mode = 'dot'

    const apply = () => {
      const l = threeLabel ?? domLabel
      const m = mode === 'hide' && threeLabel ? 'big' : mode
      const next = l ? 'big' : m
      if (el.dataset.mode !== next) el.dataset.mode = next
      lab.textContent = l ?? ''
    }
    store.cursor = (l) => {
      threeLabel = l
      apply()
    }

    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const t = e.target as Element | null
      if (!t || !t.closest) return
      const cur = t.closest<HTMLElement>('[data-cursor]')
      if (t.closest('input, textarea, select')) {
        mode = 'hide'
        domLabel = null
      } else if (cur) {
        mode = 'big'
        domLabel = cur.dataset.cursor || ''
      } else if (t.closest('a, button, summary, [role="button"]')) {
        mode = 'link'
        domLabel = null
      } else if (t.closest('p, h1, h2, h3, li, dd, dt, figcaption, label')) {
        mode = 'bar'
        domLabel = null
      } else {
        mode = 'dot'
        domLabel = null
      }
      apply()
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      tx = e.clientX
      ty = e.clientY
      if (x < 0) {
        x = tx
        y = ty
      }
      el.style.opacity = ''
    }
    const leave = () => (el.style.opacity = '0')
    const loop = () => {
      x += (tx - x) * 0.18
      y += (ty - y) * 0.18
      const t = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.style.transform = t
      lab.style.transform = t
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('pointerleave', leave)
      store.cursor = () => {}
    }
  }, [enabled, store])

  if (!enabled) return null
  return (
    <>
      <div ref={ring} className={s.cursor} data-mode="dot" aria-hidden="true" style={{ opacity: 0 }}>
        <i />
      </div>
      <span ref={label} className={s.cursorLabel} aria-hidden="true" />
    </>
  )
}
