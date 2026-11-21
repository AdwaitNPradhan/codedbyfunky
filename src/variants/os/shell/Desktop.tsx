'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import dynamic from 'next/dynamic'
import { ACCENTS, WALLS } from '../types'
import { canRunWallpaper3D } from '../hooks'
import { ICON_EVENT } from './DesktopIcons'
import { isTypingTarget } from '../util'
import { useOS } from '../store'
import { MenuList, MenuBar, type MenuItem } from './MenuBar'
import { Dock } from './Dock'
import { DesktopIcons } from './DesktopIcons'
import { Palette } from './Palette'
import { Wallpaper } from './Wallpaper'
import { Window, type SnapSide } from './Window'
import styles from '../os.module.css'

const Wallpaper3D = dynamic(() => import('./Wallpaper3D'), { ssr: false })

const CONFETTI = ['#ff6b35', '#ffd166', '#a8ff9e', '#ece7da', '#5ee0a0']

function Confetti({ n }: { n: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        x: `${(i * 37 + n * 13) % 100}%`,
        s: `${6 + ((i * 5) % 3) * 4}px`,
        c: CONFETTI[i % CONFETTI.length],
        d: `${(i % 8) * 0.04}s`,
        dx: `${((i * 53) % 160) - 80}px`,
        r: `${((i * 71) % 360) - 180}deg`,
      })),
    [n],
  )
  return (
    <div className={styles.confetti} aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={`${n}-${i}`}
          style={
            {
              '--x': b.x,
              '--s': b.s,
              '--c': b.c,
              '--d': b.d,
              '--dx': b.dx,
              '--r': b.r,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

export function Desktop({ stagger }: { stagger: boolean }) {
  const os = useOS()
  const [snap, setSnap] = useState<SnapSide>(null)
  const [showConfetti, setShowConfetti] = useState(0)
  const lastConfetti = useRef(0)

  // 3D wallpaper: only after first paint and a short idle, only when the device can take it.
  const want3d = os.settings.wall3d && !os.reduced && !os.mobile
  const [wall3d, setWall3d] = useState(false)
  useEffect(() => {
    if (!want3d) return setWall3d(false)
    const t = setTimeout(() => setWall3d(canRunWallpaper3D()), 1800)
    return () => clearTimeout(t)
  }, [want3d])
  const covered = os.wins.some((w) => w.maximized && !w.minimized)

  useEffect(() => {
    if (os.confetti && os.confetti !== lastConfetti.current && !os.reduced) {
      lastConfetti.current = os.confetti
      setShowConfetti(os.confetti)
      const t = setTimeout(() => setShowConfetti(0), 1500)
      return () => clearTimeout(t)
    }
  }, [os.confetti, os.reduced])

  // Global keys: palette, Esc closes the focused window, Alt+Tab cycles.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        os.setPaletteOpen(!os.paletteOpen)
        return
      }
      if (e.key === '/' && !isTypingTarget(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        os.setPaletteOpen(true)
        return
      }
      if (e.altKey && (e.key === 'Tab' || e.code === 'Backquote')) {
        e.preventDefault()
        os.cycle()
        return
      }
      if (e.key === 'Escape' && !e.defaultPrevented) {
        if (os.menu) return os.closeMenu()
        if (os.paletteOpen) return os.setPaletteOpen(false)
        if (os.activeId) os.close(os.activeId)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [os])

  const hasMenu = Boolean(os.menu)
  const { closeMenu } = os
  useEffect(() => {
    if (!hasMenu) return
    const close = () => closeMenu()
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('blur', close)
    }
  }, [hasMenu, closeMenu])

  const ctxItems: MenuItem[] = [
    {
      label: 'Change wallpaper',
      onSelect: () =>
        os.setSettings({ wall: WALLS[(WALLS.indexOf(os.settings.wall) + 1) % WALLS.length] }),
    },
    {
      label: 'Change accent',
      onSelect: () =>
        os.setSettings({
          accent: ACCENTS[(ACCENTS.indexOf(os.settings.accent) + 1) % ACCENTS.length],
        }),
    },
    { sep: true },
    {
      label: 'Clean up icons',
      onSelect: () => window.dispatchEvent(new CustomEvent(ICON_EVENT, { detail: 'cleanup' })),
    },
    {
      label: 'Sort icons by name',
      onSelect: () => window.dispatchEvent(new CustomEvent(ICON_EVENT, { detail: 'sort' })),
    },
    { sep: true },
    { label: 'Open Terminal', onSelect: () => os.open('terminal') },
    { label: 'About this desktop', onSelect: () => os.open('about') },
    { label: 'Command palette', key: '⌘K', onSelect: () => os.setPaletteOpen(true) },
  ]

  const area = os.area
  const snapGeo =
    snap === 'l'
      ? { left: 0, top: 0, width: area.w / 2, height: area.h }
      : snap === 'r'
        ? { left: area.w / 2, top: 0, width: area.w / 2, height: area.h }
        : snap === 'max'
          ? { left: 0, top: 0, width: area.w, height: area.h }
          : null

  return (
    <div
      className={`${styles.stage} ${styles.fadeIn}`}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('[data-win],header,nav')) return
        e.preventDefault()
        os.openMenu(e.clientX, e.clientY, ctxItems)
      }}
    >
      <Wallpaper parallax={!os.reduced && !os.mobile} flat3d={wall3d && want3d}>
        {wall3d && want3d && <Wallpaper3D paused={covered} />}
      </Wallpaper>
      {/* DOM order is the Tab order: menu bar, icons, dock, windows. */}
      <MenuBar />
      <DesktopIcons stagger={stagger && !os.reduced} />
      <Dock />
      <div className={styles.layer} style={{ bottom: 0 }}>
        {snapGeo && <div className={styles.snapPrev} style={snapGeo} />}
        <AnimatePresence initial>
          {os.wins.map((w) => (
            <Window key={w.id} win={w} active={w.id === os.activeId} onSnapPreview={setSnap} />
          ))}
        </AnimatePresence>
      </div>
      {os.menu && (
        <div
          className={styles.ctx}
          style={{ left: os.menu.x, top: os.menu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MenuList items={os.menu.items} className={styles.dropdown} onClose={os.closeMenu} />
        </div>
      )}
      {os.paletteOpen && <Palette onClose={() => os.setPaletteOpen(false)} />}
      {showConfetti > 0 && <Confetti n={showConfetti} />}
    </div>
  )
}
