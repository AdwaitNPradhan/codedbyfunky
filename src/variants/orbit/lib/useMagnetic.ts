'use client'

import { useEffect, type RefObject } from 'react'
import { loadMotion } from './motion'

/** CTA buttons ([data-magnetic]) lean toward the pointer within 80px (max 10px), then spring back. */
export function useMagnetic(enabled: boolean, rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!enabled || !root) return
    let dead = false
    let off = () => {}
    loadMotion().then(({ gsap }) => {
      if (dead) return
      const state = new WeakMap<HTMLElement, { x: (v: number) => void; y: (v: number) => void; pulled: boolean }>()
      let raf = 0
      let px = 0
      let py = 0
      const run = () => {
        raf = 0
        root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
          const panel = el.closest<HTMLElement>('[data-panel]')
          if (panel && panel.dataset.live === '0') return
          const r = el.getBoundingClientRect()
          if (!r.width) return
          let st = state.get(el)
          if (!st) {
            st = { x: gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' }), pulled: false }
            state.set(el, st)
          }
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const dx = px - cx
          const dy = py - cy
          const near = Math.abs(dx) < r.width / 2 + 80 && Math.abs(dy) < r.height / 2 + 80
          if (near) {
            st.pulled = true
            st.x(Math.max(-10, Math.min(10, dx * 0.22)))
            st.y(Math.max(-10, Math.min(10, dy * 0.22)))
          } else if (st.pulled) {
            st.pulled = false
            gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', overwrite: true })
          }
        })
      }
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return
        px = e.clientX
        py = e.clientY
        if (!raf) raf = requestAnimationFrame(run)
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      off = () => {
        window.removeEventListener('pointermove', onMove)
        cancelAnimationFrame(raf)
        root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => gsap.set(el, { clearProps: 'x,y' }))
      }
    })
    return () => {
      dead = true
      off()
    }
  }, [enabled, rootRef])
}
