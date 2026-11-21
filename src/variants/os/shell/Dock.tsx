'use client'

import { useRef } from 'react'
import { m, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { DOCK_APPS, META } from '../appmeta'
import { Icon } from '../icons'
import { useOS } from '../store'
import type { AppId, WinState } from '../types'
import styles from '../os.module.css'

const SPRING = { stiffness: 320, damping: 24, mass: 0.7 }

function Slot({
  mouseX,
  mag,
  label,
  app,
  winId,
  win,
  onClick,
}: {
  mouseX: MotionValue<number>
  mag: boolean
  label: string
  app: AppId
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
        >
          <Icon name={META[app].icon} size={48} />
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
  const extra = os.wins.filter((w) => !DOCK_APPS.includes(w.app))

  const toggle = (w: WinState | undefined, app: AppId) => {
    if (!w) return os.open(app, app === 'files' ? { path: 'projects' } : {})
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
        {DOCK_APPS.map((app) => (
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
