'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { m } from 'motion/react'
import { DESKTOP_APPS, META, needsSpotify } from '../appmeta'
import { Icon, ShortcutBadge, type IconName } from '../icons'
import { useOS } from '../store'
import type { AppId, WinProps } from '../types'
import { clamp, safeParse, store } from '../util'
import { VERSION_FILES } from '../versions'
import styles from '../os.module.css'

const CELL = 96
// v2: the old key could hold cells from the broken drag code.
const KEY = 'funkyos.icons.v2'
/** The desktop menu sends "cleanup" or "sort" to the icons with this event. */
export const ICON_EVENT = 'funkyos:icons'

type Item = {
  id: string
  label: string
  icon: IconName
  app?: AppId
  props?: WinProps
  href?: string
  /** Starts in the right-hand column, like files dropped on a messy desktop. */
  right?: boolean
}
type Pos = { c: number; r: number }

/**
 * Put every icon in its own cell inside a cols x rows grid. Icons in `last` are placed after all the others,
 * so they are the ones pushed to the nearest free cell when a wanted cell is taken.
 */
function solve(
  order: string[],
  want: Record<string, Pos | undefined>,
  cols: number,
  rows: number,
  last: ReadonlySet<string> = new Set(),
): Record<string, Pos> {
  const taken = new Set<string>()
  const out: Record<string, Pos> = {}
  const ids = [...order.filter((id) => !last.has(id)), ...order.filter((id) => last.has(id))]
  for (const id of ids) {
    const w = want[id] ?? { c: 0, r: 0 }
    const t = { c: clamp(Math.round(w.c), 0, cols - 1), r: clamp(Math.round(w.r), 0, rows - 1) }
    let best = t
    if (taken.has(`${t.c},${t.r}`)) {
      let bd = Infinity
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++) {
          if (taken.has(`${c},${r}`)) continue
          const d = (c - t.c) ** 2 + (r - t.r) ** 2
          if (d < bd) {
            bd = d
            best = { c, r }
          }
        }
      // A full grid overlaps rather than losing an icon.
    }
    taken.add(`${best.c},${best.r}`)
    out[id] = best
  }
  return out
}

export function DesktopIcons({ stagger }: { stagger: boolean }) {
  const os = useOS()
  const { data } = os
  const box = useRef<HTMLDivElement>(null)
  const igUrl =
    data.settings.instagram.url ||
    data.settings.socials.find((s) => s.platform === 'instagram')?.url ||
    ''

  const items = useMemo<Item[]>(() => {
    const base: Item[] = DESKTOP_APPS.filter((a) => needsSpotify(a, data)).map((a) => ({
      id: a,
      label: META[a].label,
      icon: META[a].icon,
      app: a,
    }))
    if (igUrl)
      base.push({ id: 'instagram', label: 'Instagram.url', icon: 'instagram', href: igUrl })
    base.push(
      {
        id: 'applications',
        label: 'Applications',
        icon: 'apps',
        app: 'files',
        props: { path: 'applications' },
        right: true,
      },
      {
        id: 'media',
        label: 'Media',
        icon: 'image',
        app: 'files',
        props: { path: 'media' },
        right: true,
      },
    )
    base.push({
      id: 'old-versions',
      label: 'Old Versions',
      icon: 'folder',
      app: 'files',
      props: { path: 'versions' },
      right: true,
    })
    for (const v of VERSION_FILES.filter((x) => x.desktop))
      base.push({
        id: v.file,
        label: v.file,
        icon: v.icon,
        app: 'browser',
        props: { v: v.key },
        right: true,
      })
    return base
  }, [igUrl, data])

  // The grid stops above the dock, so an icon can never sit under the dock or the menu bar.
  const cols = Math.max(1, Math.floor(os.area.w / CELL))
  const rows = Math.max(3, Math.floor(os.area.h / CELL))
  const order = useMemo(() => items.map((it) => it.id), [items])

  /** Where each icon starts: the left group fills columns top to bottom, the right group starts at the right edge. */
  const defaults = useMemo(() => {
    const o: Record<string, Pos> = {}
    const left = items.filter((it) => !it.right)
    left.forEach((it, i) => (o[it.id] = { c: Math.floor(i / rows), r: i % rows }))
    const maxC = Math.max(cols - 1, Math.ceil(left.length / rows))
    items
      .filter((it) => it.right)
      .forEach((it, i) => (o[it.id] = { c: maxC - Math.floor(i / rows), r: i % rows }))
    return o
  }, [items, rows, cols])

  // Cells the visitor chose. This is the intent: it survives a resize, and it is kept for later visits.
  const [saved, setSaved] = useState<Record<string, Pos>>(() => {
    const raw = safeParse<Record<string, Pos>>(store.get('local', KEY), {})
    const ok: Record<string, Pos> = {}
    for (const [id, p] of Object.entries(raw ?? {}))
      if (p && Number.isFinite(p.c) && Number.isFinite(p.r) && p.c >= 0 && p.r >= 0) ok[id] = p
    return ok
  })
  // The real layout: every icon in a free cell inside the grid, whatever the screen size is now.
  const pos = useMemo(
    () => solve(order, { ...defaults, ...saved }, cols, rows),
    [order, defaults, saved, cols, rows],
  )

  const [sel, setSel] = useState<string[]>([])
  const [focusId, setFocusId] = useState(items[0]?.id)
  const [band, setBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null)
  const els = useRef<Record<string, HTMLButtonElement | null>>({})
  // A drag ends with a click event on the same icon. That click must not open the item.
  const ignoreClick = useRef(false)

  useEffect(() => {
    store.set('local', KEY, JSON.stringify(saved))
  }, [saved])

  // Desktop menu: "Clean up icons" and "Sort icons by name".
  const { showToast } = os
  useEffect(() => {
    const on = (e: Event) => {
      const kind = (e as CustomEvent<string>).detail
      if (kind === 'cleanup') {
        setSaved({})
        showToast('Icons cleaned up')
      } else if (kind === 'sort') {
        const sorted = [...items].sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
        )
        setSaved(
          Object.fromEntries(sorted.map((it, i) => [it.id, { c: Math.floor(i / rows), r: i % rows }])),
        )
        showToast('Icons sorted by name')
      }
    }
    window.addEventListener(ICON_EVENT, on)
    return () => window.removeEventListener(ICON_EVENT, on)
  }, [items, rows, showToast])

  // A click anywhere outside the icons clears the selection, so it is never stuck.
  useEffect(() => {
    const on = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setSel([])
    }
    window.addEventListener('pointerdown', on)
    return () => window.removeEventListener('pointerdown', on)
  }, [])

  const activate = (it: Item) => {
    setSel([])
    if (it.app) os.open(it.app, it.props ?? (it.app === 'files' ? { path: 'projects' } : {}))
    else if (it.href) os.external(it.href)
  }

  const onIconDown = (it: Item) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    const group = additive
      ? sel.includes(it.id)
        ? sel
        : [...sel, it.id]
      : sel.includes(it.id) && sel.length > 1
        ? sel
        : [it.id]
    setSel(additive && sel.includes(it.id) ? sel.filter((x) => x !== it.id) : group)
    setFocusId(it.id)
    ignoreClick.current = additive // Shift or Ctrl click only selects
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const sx = e.clientX
    const sy = e.clientY
    const base = pos
    // Keep every dragged icon inside the grid.
    const cs = group.map((id) => base[id].c)
    const rs = group.map((id) => base[id].r)
    const lim = {
      x0: -Math.min(...cs) * CELL,
      x1: (cols - 1 - Math.max(...cs)) * CELL,
      y0: -Math.min(...rs) * CELL,
      y1: (rows - 1 - Math.max(...rs)) * CELL,
    }
    const threshold = e.pointerType === 'touch' ? 8 : 4
    let moved = false
    const delta = (ev: PointerEvent) => ({
      dx: clamp(ev.clientX - sx, lim.x0, lim.x1),
      dy: clamp(ev.clientY - sy, lim.y0, lim.y1),
    })
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < threshold) return
      moved = true
      setDrag({ ids: group, ...delta(ev) })
    }
    const end = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
    }
    const cancel = () => {
      end()
      setDrag(null)
    }
    const up = (ev: PointerEvent) => {
      end()
      if (!moved) return setDrag(null) // a click: the click handler opens the item
      ignoreClick.current = true
      setTimeout(() => (ignoreClick.current = false), 0)
      const { dx, dy } = delta(ev)
      // Snap by how far the icon moved, so the cell nearest to where it is now wins.
      const want = Object.fromEntries(
        group.map((id) => [
          id,
          { c: base[id].c + Math.round(dx / CELL), r: base[id].r + Math.round(dy / CELL) },
        ]),
      )
      // The other icons stay put. A dragged icon that lands on one is pushed to the nearest free cell.
      const next = solve(order, { ...base, ...want }, cols, rows, new Set(group))
      setSaved((s) => ({ ...s, ...Object.fromEntries(group.map((id) => [id, next[id]])) }))
      setDrag(null)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
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
        const off = drag?.ids.includes(it.id) ? drag : null
        return (
          <m.button
            key={it.id}
            ref={(n) => {
              els.current[it.id] = n
            }}
            type="button"
            className={`${styles.dicon} ${off ? styles.dragging : ''}`}
            style={
              {
                translate: `${p.c * CELL + (off?.dx ?? 0)}px ${p.r * CELL + (off?.dy ?? 0)}px`,
                '--i': i,
              } as React.CSSProperties
            }
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
            onClick={() => {
              if (ignoreClick.current) return
              activate(it)
            }}
            onPointerMove={(e) => {
              // 3D tilt toward the pointer. CSS applies it only for a mouse and when motion is allowed.
              if (e.pointerType !== 'mouse' || drag) return
              const r = e.currentTarget.getBoundingClientRect()
              const nx = (e.clientX - r.left) / r.width - 0.5
              const ny = (e.clientY - r.top) / r.height - 0.5
              const s = e.currentTarget.style
              s.setProperty('--ry', `${(nx * 22).toFixed(1)}deg`)
              s.setProperty('--rx', `${(-ny * 22).toFixed(1)}deg`)
              s.setProperty('--tz', '8px')
            }}
            onPointerLeave={(e) => {
              const s = e.currentTarget.style
              s.removeProperty('--ry')
              s.removeProperty('--rx')
              s.removeProperty('--tz')
            }}
            onFocus={() => setFocusId(it.id)}
            onKeyDown={onKey(it)}
            onContextMenu={(e) => {
              if (!it.app) return
              e.preventDefault()
              e.stopPropagation()
              setSel([it.id])
              const props = it.props ?? (it.app === 'files' ? { path: 'projects' } : {})
              os.openMenu(e.clientX, e.clientY, [
                { label: 'Open', onSelect: () => activate(it) },
                { label: 'Share link', onSelect: () => os.share(it.app!, props) },
              ])
            }}
            aria-label={it.href ? `${it.label}, opens in a new tab` : it.label}
          >
            <Icon name={it.icon} size={48} />
            {it.href && (
              <span className={styles.badge}>
                <ShortcutBadge />
              </span>
            )}
            <span className={styles.cap}>{it.label.replace(/([._])/g, '$1\u200b')}</span>
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
