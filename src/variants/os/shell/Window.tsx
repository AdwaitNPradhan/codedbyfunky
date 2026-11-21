'use client'

import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { animate, m, useMotionValue } from 'motion/react'
import { AppView } from '../apps/registry'
import { iconOf, MENU_H, META, MIN_H, MIN_W } from '../appmeta'
import { Icon } from '../icons'
import { useOS } from '../store'
import type { WinState } from '../types'
import { clamp } from '../util'
import styles from '../os.module.css'

export type SnapSide = 'l' | 'r' | 'max' | null
type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const DIRS: Dir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
type Bez = [number, number, number, number]
const EASE_BACK: Bez = [0.34, 1.56, 0.64, 1]
const EXPO_OUT: Bez = [0.16, 1, 0.3, 1]

export const Window = memo(function Window({
  win,
  active,
  onSnapPreview,
}: {
  win: WinState
  active: boolean
  onSnapPreview: (s: SnapSide) => void
}) {
  const os = useOS()
  const { area, reduced, data } = os
  const titleId = useId()
  const root = useRef<HTMLDivElement>(null)
  const x = useMotionValue(win.geo.x)
  const y = useMotionValue(win.geo.y)
  const w = useMotionValue(win.geo.w)
  const h = useMotionValue(win.geo.h)
  const [gone, setGone] = useState(false)
  const [mt, setMt] = useState({ dx: 0, dy: 0 })
  const areaRef = useRef(area)
  areaRef.current = area

  // System-driven geometry changes (maximise, snap, cascade, viewport clamp) animate. User drags set values directly.
  const { geo, geoTick } = win
  useEffect(() => {
    const t = { duration: reduced ? 0 : 0.2, ease: EXPO_OUT }
    const ctl = [
      [x, geo.x],
      [y, geo.y],
      [w, geo.w],
      [h, geo.h],
    ] as const
    const anims = ctl.filter(([mv, v]) => mv.get() !== v).map(([mv, v]) => animate(mv, v, t))
    return () => anims.forEach((a) => a.stop())
  }, [geo.x, geo.y, geo.w, geo.h, geoTick, reduced, x, y, w, h])

  // Fly toward the dock icon on minimise.
  useLayoutEffect(() => {
    if (!win.minimized) {
      setGone(false)
      return
    }
    const r = root.current?.getBoundingClientRect()
    const t =
      document.querySelector<HTMLElement>(`[data-dock-win="${CSS.escape(win.id)}"]`) ??
      document.querySelector<HTMLElement>(`[data-dock-app="${win.app}"]`)
    const tr = t?.getBoundingClientRect()
    if (r && tr)
      setMt({
        dx: tr.x + tr.width / 2 - (r.x + r.width / 2),
        dy: tr.y + tr.height / 2 - (r.y + r.height / 2),
      })
  }, [win.minimized, win.id, win.app])

  // Focus moves into a new window (unless an app already took focus).
  useEffect(() => {
    const el = root.current
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
  }, [])

  const title = META[win.app].title(win.props, data)

  const onTitleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.pointerType === 'mouse' && e.button !== 0) ||
      (e.target as HTMLElement).closest('button')
    )
      return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const a = areaRef.current
    const s = { px: e.clientX, py: e.clientY, x: x.get(), y: y.get(), w: w.get(), h: h.get() }
    const wasBig = win.maximized || Boolean(win.snap)
    let moved = false
    let restored = false
    let side: SnapSide = null
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - s.px
      const dy = ev.clientY - s.py
      if (!moved && Math.hypot(dx, dy) < 3) return
      moved = true
      if (wasBig && !restored) {
        restored = true
        const pw = Math.min(win.prev?.w ?? 640, a.w)
        const ph = Math.min(win.prev?.h ?? 440, a.h)
        const ratio = (s.px - s.x) / s.w
        s.w = pw
        s.h = ph
        w.set(pw)
        h.set(ph)
        s.x = ev.clientX - ratio * pw - dx
        s.y = ev.clientY - MENU_H - 16 - dy
      }
      x.set(clamp(s.x + dx, 0, Math.max(0, a.w - s.w)))
      y.set(clamp(s.y + dy, 0, Math.max(0, a.h - s.h)))
      const next: SnapSide =
        ev.clientX <= 16
          ? 'l'
          : ev.clientX >= window.innerWidth - 16
            ? 'r'
            : ev.clientY <= MENU_H + 6
              ? 'max'
              : null
      if (next !== side) {
        side = next
        onSnapPreview(next)
      }
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      onSnapPreview(null)
      if (!moved) return
      if (side) os.snap(win.id, side)
      else os.setGeo(win.id, { x: x.get(), y: y.get(), w: w.get(), h: h.get() })
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const onResizeDown = (dir: Dir) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const a = areaRef.current
    const s = { px: e.clientX, py: e.clientY, x: x.get(), y: y.get(), w: w.get(), h: h.get() }
    let raf = 0
    let pend: { x: number; y: number; w: number; h: number } | null = null
    const apply = () => {
      raf = 0
      if (!pend) return
      x.set(pend.x)
      y.set(pend.y)
      w.set(pend.w)
      h.set(pend.h)
    }
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - s.px
      const dy = ev.clientY - s.py
      let nx = s.x
      let ny = s.y
      let nw = s.w
      let nh = s.h
      if (dir.includes('e')) nw = clamp(s.w + dx, MIN_W, a.w - s.x)
      if (dir.includes('s')) nh = clamp(s.h + dy, MIN_H, a.h - s.y)
      if (dir.includes('w')) {
        nw = clamp(s.w - dx, MIN_W, s.x + s.w)
        nx = s.x + s.w - nw
      }
      if (dir.includes('n')) {
        nh = clamp(s.h - dy, MIN_H, s.y + s.h)
        ny = s.y + s.h - nh
      }
      pend = { x: nx, y: ny, w: nw, h: nh }
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      cancelAnimationFrame(raf)
      apply()
      os.setGeo(win.id, { x: x.get(), y: y.get(), w: w.get(), h: h.get() })
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const hidden = win.minimized
  const openT = reduced ? { duration: 0.12 } : { duration: 0.35, ease: EASE_BACK }

  return (
    <m.div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-labelledby={titleId}
      data-win={win.id}
      className={`${styles.win} ${active ? styles.active : ''}`}
      style={{
        x,
        y,
        width: w,
        height: h,
        zIndex: win.z,
        visibility: hidden && gone ? 'hidden' : 'visible',
        pointerEvents: hidden ? 'none' : 'auto',
      }}
      inert={hidden}
      onPointerDownCapture={() => os.focus(win.id)}
      onFocusCapture={() => !active && !hidden && os.focus(win.id)}
    >
      <m.div
        className={styles.winInner}
        initial={reduced ? { opacity: 0 } : { scale: 0.92, opacity: 0 }}
        animate={
          hidden
            ? reduced
              ? { opacity: 0 }
              : { scale: 0.2, opacity: 0, x: mt.dx, y: mt.dy }
            : { scale: 1, opacity: 1, x: 0, y: 0 }
        }
        exit={
          reduced
            ? { opacity: 0, transition: { duration: 0.12 } }
            : { scale: 0.96, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }
        }
        transition={
          hidden
            ? reduced
              ? { duration: 0.12 }
              : { duration: 0.35, ease: [0.7, 0, 0.84, 0] }
            : reduced
              ? { duration: 0.12 }
              : {
                  ...openT,
                  x: { duration: 0.4, ease: EXPO_OUT },
                  y: { duration: 0.4, ease: EXPO_OUT },
                }
        }
        onAnimationComplete={() => hidden && setGone(true)}
      >
        <div
          className={styles.title}
          onPointerDown={onTitleDown}
          onDoubleClick={(e) =>
            !(e.target as HTMLElement).closest('button') && os.toggleMax(win.id)
          }
        >
          <Icon name={iconOf(win.app, win.props)} size={18} />
          <span className={styles.titleText} id={titleId}>
            {title}
          </span>
          <div className={styles.tbtns}>
            <button
              type="button"
              className={styles.tbtn}
              aria-label="Minimise"
              onClick={() => os.minimize(win.id)}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <rect x="1" y="7" width="8" height="2" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.tbtn}
              aria-label={win.maximized || win.snap ? 'Restore' : 'Maximise'}
              onClick={() => os.toggleMax(win.id)}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <rect
                  x="1"
                  y="1"
                  width="8"
                  height="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.tbtn} ${styles.close}`}
              aria-label="Close"
              onClick={() => os.close(win.id)}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.wbody}>
          <AppView win={win} active={active} hidden={hidden} />
        </div>
      </m.div>
      {!win.maximized &&
        DIRS.map((d) => (
          <div
            key={d}
            className={styles.rh}
            data-d={d}
            onPointerDown={onResizeDown(d)}
            aria-hidden="true"
          />
        ))}
      {!win.maximized && !win.snap && <span className={styles.grip} aria-hidden="true" />}
    </m.div>
  )
})
