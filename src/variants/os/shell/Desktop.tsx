'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { ACCENTS, WALLS } from '../types'
import { isTypingTarget } from '../util'
import { useOS } from '../store'
import { MenuList, MenuBar, type MenuItem } from './MenuBar'
import { Dock } from './Dock'
import { DesktopIcons } from './DesktopIcons'
import { Palette } from './Palette'
import { Wallpaper } from './Wallpaper'
import { Window, type SnapSide } from './Window'
import styles from '../os.module.css'

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
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null)
  const [showConfetti, setShowConfetti] = useState(0)
  const lastConfetti = useRef(0)

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
        if (ctx) return setCtx(null)
        if (os.paletteOpen) return os.setPaletteOpen(false)
        if (os.activeId) os.close(os.activeId)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [os, ctx])

  useEffect(() => {
    if (!ctx) return
    const close = () => setCtx(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('blur', close)
    }
  }, [ctx])

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
        setCtx({
          x: Math.min(e.clientX, window.innerWidth - 240),
          y: Math.min(e.clientY, window.innerHeight - 220),
        })
      }}
    >
      <Wallpaper parallax={!os.reduced && !os.mobile} />
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
      {ctx && (
        <div
          className={styles.ctx}
          style={{ left: ctx.x, top: ctx.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MenuList items={ctxItems} className={styles.dropdown} onClose={() => setCtx(null)} />
        </div>
      )}
      {os.paletteOpen && <Palette onClose={() => os.setPaletteOpen(false)} />}
      {showConfetti > 0 && <Confetti n={showConfetti} />}
    </div>
  )
}
