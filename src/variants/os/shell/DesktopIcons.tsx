'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { m } from 'motion/react'
import { DESKTOP_APPS, META } from '../appmeta'
import { Icon, ShortcutBadge, type IconName } from '../icons'
import { useOS } from '../store'
import type { AppId } from '../types'
import { clamp, safeParse, store } from '../util'
import styles from '../os.module.css'

const CELL = 96
const KEY = 'funkyos.icons.v1'

type Item = { id: string; label: string; icon: IconName; app?: AppId; href?: string }
type Pos = { c: number; r: number }

export function DesktopIcons({ stagger }: { stagger: boolean }) {
  const os = useOS()
  const { data } = os
  const box = useRef<HTMLDivElement>(null)
  const igUrl =
    data.settings.instagram.url ||
    data.settings.socials.find((s) => s.platform === 'instagram')?.url ||
    ''

  const items = useMemo<Item[]>(() => {
    const base: Item[] = DESKTOP_APPS.map((a) => ({
      id: a,
      label: META[a].label,
      icon: META[a].icon,
      app: a,
    }))
    if (igUrl)
      base.push({ id: 'instagram', label: 'Instagram.url', icon: 'instagram', href: igUrl })
    return base
  }, [igUrl])

  const rows = Math.max(3, Math.floor((os.area.h + 84 - 8) / CELL))
  const defaults = useMemo(() => {
    const o: Record<string, Pos> = {}
    items.forEach((it, i) => (o[it.id] = { c: Math.floor(i / rows), r: i % rows }))
    return o
  }, [items, rows])

  const [saved, setSaved] = useState<Record<string, Pos>>(() =>
    safeParse(store.get('session', KEY), {}),
  )
  const pos = useMemo(() => {
    // Saved positions win; anything off-grid after a resize falls back to its default slot.
    const o: Record<string, Pos> = {}
    for (const it of items) {
      const s = saved[it.id]
      o[it.id] = s && s.r < rows ? s : defaults[it.id]
    }
    return o
  }, [items, saved, defaults, rows])

  const [sel, setSel] = useState<string[]>([])
  const [focusId, setFocusId] = useState(items[0]?.id)
  const [band, setBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const els = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    store.set('session', KEY, JSON.stringify(saved))
  }, [saved])

  const activate = (it: Item) =>
    it.app
      ? os.open(it.app, it.app === 'files' ? { path: 'projects' } : {})
      : it.href && os.external(it.href)

  const free = (p: Pos, except: string) =>
    !items.some((o) => o.id !== except && pos[o.id].c === p.c && pos[o.id].r === p.r)
  const nearestFree = (p: Pos, except: string): Pos => {
    for (let d = 0; d < 40; d++) {
      for (let dc = -d; dc <= d; dc++)
        for (let dr = -d; dr <= d; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue
          const q = { c: p.c + dc, r: p.r + dr }
          if (
            q.c >= 0 &&
            q.r >= 0 &&
            q.r < rows &&
            q.c * CELL + CELL <= os.area.w &&
            free(q, except)
          )
            return q
        }
    }
    return p
  }

  const onIconDown = (it: Item) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    setSel(e.shiftKey ? (s) => [...s, it.id] : [it.id])
    setFocusId(it.id)
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const start = { px: e.clientX, py: e.clientY, x: pos[it.id].c * CELL, y: pos[it.id].r * CELL }
    let moved = false
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.px
      const dy = ev.clientY - start.py
      if (!moved && Math.hypot(dx, dy) < 5) return
      if (!moved) setDragId(it.id)
      moved = true
      el.style.transform = `translate(${clamp(start.x + dx, 0, os.area.w - CELL)}px, ${clamp(start.y + dy, 0, os.area.h + 84 - CELL)}px)`
    }
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.style.transform = ''
      setDragId(null)
      if (!moved) return
      const want = {
        c: clamp(
          Math.round((start.x + ev.clientX - start.px) / CELL),
          0,
          Math.max(0, Math.floor(os.area.w / CELL) - 1),
        ),
        r: clamp(Math.round((start.y + ev.clientY - start.py) / CELL), 0, rows - 1),
      }
      setSaved((s) => ({
        ...s,
        ...Object.fromEntries(items.map((o) => [o.id, pos[o.id]])),
        [it.id]: nearestFree(want, it.id),
      }))
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const onBandDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    const host = e.currentTarget
    const r0 = host.getBoundingClientRect()
    const sx = e.clientX - r0.left
    const sy = e.clientY - r0.top
    host.setPointerCapture(e.pointerId)
    setSel([])
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    const move = (ev: PointerEvent) => {
      const cx = ev.clientX - r0.left
      const cy = ev.clientY - r0.top
      const b = {
        x: Math.min(sx, cx),
        y: Math.min(sy, cy),
        w: Math.abs(cx - sx),
        h: Math.abs(cy - sy),
      }
      setBand(b)
      setSel(
        items
          .filter((it) => {
            const p = pos[it.id]
            const ix = p.c * CELL
            const iy = p.r * CELL
            return ix < b.x + b.w && ix + CELL > b.x && iy < b.y + b.h && iy + CELL > b.y
          })
          .map((it) => it.id),
      )
    }
    const up = () => {
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', up)
      setBand(null)
    }
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerup', up)
    host.addEventListener('pointercancel', up)
  }

  const onKey = (it: Item) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      activate(it)
      return
    }
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[
      e.key
    ]
    if (!dir) return
    e.preventDefault()
    const p = pos[it.id]
    // Nearest icon whose centre lies in the pressed direction.
    let best: Item | null = null
    let bestScore = Infinity
    for (const o of items) {
      if (o.id === it.id) continue
      const q = pos[o.id]
      const dc = q.c - p.c
      const dr = q.r - p.r
      const along = dc * dir[0] + dr * dir[1]
      if (along <= 0) continue
      const score = along * 10 + Math.abs(dc * dir[1] + dr * dir[0])
      if (score < bestScore) {
        bestScore = score
        best = o
      }
    }
    if (best) {
      setFocusId(best.id)
      setSel([best.id])
      els.current[best.id]?.focus()
    }
  }

  return (
    <div
      className={styles.icons}
      ref={box}
      role="group"
      aria-label="Desktop icons"
      onPointerDown={onBandDown}
    >
      {items.map((it, i) => {
        const p = pos[it.id]
        return (
          <m.button
            key={it.id}
            ref={(n) => {
              els.current[it.id] = n
            }}
            type="button"
            className={`${styles.dicon} ${dragId === it.id ? styles.dragging : ''}`}
            style={{ left: p.c * CELL, top: p.r * CELL }}
            initial={stagger ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: stagger ? 0.2 + i * 0.04 : 0,
              ease: [0.215, 0.61, 0.355, 1],
            }}
            aria-selected={sel.includes(it.id)}
            data-icon-app={it.app}
            tabIndex={focusId === it.id ? 0 : -1}
            onPointerDown={onIconDown(it)}
            onDoubleClick={() => activate(it)}
            onFocus={() => setFocusId(it.id)}
            onKeyDown={onKey(it)}
            aria-label={it.href ? `${it.label}, opens in a new tab` : it.label}
          >
            <Icon name={it.icon} size={48} />
            {it.href && (
              <span className={styles.badge}>
                <ShortcutBadge />
              </span>
            )}
            <span className={styles.cap}>{it.label.replace('.', '.\u200b')}</span>
          </m.button>
        )
      })}
      {band && (
        <div
          className={styles.band}
          style={{ left: band.x, top: band.y, width: band.w, height: band.h }}
        />
      )}
    </div>
  )
}
