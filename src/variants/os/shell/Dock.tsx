'use client'

import { useRef } from 'react'
import { m, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { DOCK_APPS, idFor, META, needsSpotify } from '../appmeta'
import { WinIcon } from './WinIcon'
import { useOS } from '../store'
import type { AppId, WinProps, WinState } from '../types'
import styles from '../os.module.css'

const SPRING = { stiffness: 320, damping: 24, mass: 0.7 }

function Slot({
  mouseX,
  mag,
  label,
  app,
  props,
  winId,
  win,
  onClick,
}: {
  mouseX: MotionValue<number>
  mag: boolean
  label: string
  app: AppId
  props?: WinProps
  winId?: string
  win?: WinState
  onClick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dist = useTransform(mouseX, (v) => {
    const r = ref.current?.getBoundingClientRect()
    return r ? v - (r.x + r.width / 2) : 9999
  })
  // scale = 1 + 0.5 * cos(clamp(dist / 120, 0, 1) * PI / 2)
  const raw = useTransform(
    dist,
    (d) => 1 + 0.5 * Math.cos(Math.min(1, Math.abs(d) / 120) * (Math.PI / 2)),
  )
  const scale = useSpring(raw, SPRING)
  const running = Boolean(win)
  const os = useOS()
  const target: WinProps = win?.props ?? props ?? (app === 'files' ? { path: 'projects' } : {})
  return (
    <div className={styles.dslot} ref={ref}>
      <m.div className={styles.ditem} style={{ scale: mag ? scale : 1 }}>
        <button
          type="button"
          className={styles.dbtn}
          aria-label={label}
          data-dock-app={app}
          data-dock-win={winId}
          onClick={onClick}
          onContextMenu={(e) => {
            e.preventDefault()
            os.openMenu(e.clientX, e.clientY - 70, [
              { label: 'Open', onSelect: onClick },
              { label: 'Share link', onSelect: () => os.share(app, target) },
            ])
          }}
        >
          <WinIcon app={app} props={target} size={48} />
        </button>
        {running && (
          <span
            className={`${styles.run} ${win?.minimized ? styles.dim : ''}`}
            aria-hidden="true"
          />
        )}
      </m.div>
      <span className={styles.tip} aria-hidden="true">
        {label}
      </span>
    </div>
  )
}

export function Dock() {
  const os = useOS()
  const mouseX = useMotionValue(-9999)
  const mag = !os.reduced
  // Windows of apps that have no permanent dock slot get a temporary one, so a minimised window is never lost.
  // Featured products are installed apps pinned to the dock (not on narrow screens).
  const pinned = os.area.w >= 900 ? os.data.projects.filter((p) => p.featured).slice(0, 3) : []
  const pinnedIds = new Set(pinned.map((p) => idFor('product', { slug: p.slug })))
  const extra = os.wins.filter((w) => !DOCK_APPS.includes(w.app) && !pinnedIds.has(w.id))

  const toggle = (w: WinState | undefined, app: AppId, props?: WinProps) => {
    if (!w) return os.open(app, props ?? (app === 'files' ? { path: 'projects' } : {}))
    if (w.minimized || os.activeId !== w.id) return os.focus(w.id)
    os.minimize(w.id)
  }

  return (
    <nav className={styles.dockWrap} aria-label="Dock">
      <div
        className={styles.dock}
        onPointerMove={(e) => e.pointerType === 'mouse' && mouseX.set(e.clientX)}
        onPointerLeave={() => mouseX.set(-9999)}
      >
        {DOCK_APPS.filter((a) => needsSpotify(a, os.data)).map((app) => (
          <Slot
            key={app}
            mouseX={mouseX}
            mag={mag}
            app={app}
            label={META[app].label === 'Projects' ? 'Projects' : META[app].label}
            win={os.wins.find((w) => w.app === app)}
            onClick={() =>
              toggle(
                os.wins.find((w) => w.app === app),
                app,
              )
            }
          />
        ))}
        {pinned.length > 0 && <span className={styles.dsep} aria-hidden="true" />}
        {pinned.map((p) => {
          const props = { slug: p.slug }
          const w = os.wins.find((x) => x.id === idFor('product', props))
          return (
            <Slot
              key={p.slug}
              mouseX={mouseX}
              mag={mag}
              app="product"
              props={props}
              winId={idFor('product', props)}
              label={p.title}
              win={w}
              onClick={() => toggle(w, 'product', props)}
            />
          )
        })}
        {extra.length > 0 && <span className={styles.dsep} aria-hidden="true" />}
        {extra.map((w) => (
          <Slot
            key={w.id}
            mouseX={mouseX}
            mag={mag}
            app={w.app}
            winId={w.id}
            label={META[w.app].title(w.props, os.data)}
            win={w}
            onClick={() => toggle(w, w.app)}
          />
        ))}
      </div>
    </nav>
  )
}
