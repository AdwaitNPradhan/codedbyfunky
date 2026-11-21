'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { META } from '../appmeta'
import { useClock } from '../hooks'
import { useOS } from '../store'
import { resumeFileName, social } from '../util'
import styles from '../os.module.css'

export type MenuItem =
  | { sep: true }
  | {
      label: string
      key?: string
      onSelect?: () => void
      href?: string
      download?: string
      external?: boolean
      disabled?: boolean
      check?: boolean
    }

/** Dropdown list with menu semantics: arrows move, Home/End jump, Esc closes, typing is not needed. */
export function MenuList({
  items,
  onClose,
  className,
}: {
  items: MenuItem[]
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onKey = (e: React.KeyboardEvent) => {
    const els = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    )
    const i = els.indexOf(document.activeElement as HTMLElement)
    const go = (n: number) => {
      e.preventDefault()
      els[(n + els.length) % els.length]?.focus()
    }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i < 0 ? els.length - 1 : i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(els.length - 1)
  }
  return (
    <div ref={ref} role="menu" className={className} onKeyDown={onKey}>
      {items.map((it, i) => {
        if ('sep' in it) return <div key={`s${i}`} className={styles.msep} role="separator" />
        const inner = (
          <>
            <span>
              {it.check !== undefined ? (it.check ? '✓ ' : ' ') : ''}
              {it.label}
            </span>
            {it.key && <span className={styles.mkey}>{it.key}</span>}
          </>
        )
        if (it.href) {
          return (
            <a
              key={it.label}
              role="menuitem"
              className={styles.mitem}
              href={it.href}
              download={it.download}
              target={it.external ? '_blank' : undefined}
              rel={it.external ? 'noopener noreferrer' : undefined}
              onClick={onClose}
            >
              {inner}
            </a>
          )
        }
        return (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            className={styles.mitem}
            disabled={it.disabled}
            onClick={() => {
              onClose()
              it.onSelect?.()
            }}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}

function Menu({
  id,
  open,
  setOpen,
  label,
  items,
  right,
  children,
}: {
  id: string
  open: string | null
  setOpen: (v: string | null) => void
  label: string
  items: MenuItem[]
  right?: boolean
  children?: ReactNode
}) {
  const isOpen = open === id
  const wrap = useRef<HTMLDivElement>(null)
  const focusFirst = () =>
    requestAnimationFrame(() =>
      wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(),
    )
  return (
    <div className={styles.menuWrap} ref={wrap}>
      <button
        type="button"
        className={styles.mbtn}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpen(isOpen ? null : id)}
        onPointerEnter={() => open && open !== id && setOpen(id)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(id)
            focusFirst()
          }
        }}
      >
        {children ?? label}
      </button>
      {isOpen && (
        <MenuList
          items={items}
          className={`${styles.dropdown} ${right ? styles.dropRight : ''}`}
          onClose={() => {
            setOpen(null)
            wrap.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
          }}
        />
      )}
    </div>
  )
}

export function MenuBar() {
  const os = useOS()
  const { data, settings } = os
  const [open, setOpen] = useState<string | null>(null)
  const bar = useRef<HTMLElement>(null)
  const clock = useClock({
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const active = os.wins.find((w) => w.id === os.activeId)
  const { settings: s, setSettings } = os
  const resume = data.settings.resumeUrl
  const gh = social(data, 'github')
  const li = social(data, 'linkedin')
  const ig = data.settings.instagram.url || social(data, 'instagram')

  const closeAll = useCallback(() => setOpen(null), [])
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) closeAll()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeAll()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const ids = ['fos', 'file', 'view', 'go']
        const i = ids.indexOf(open)
        if (i >= 0 && !(e.target as HTMLElement).closest('[role="menu"]')) return
        const next = ids[(i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length]
        setOpen(next)
      }
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('keydown', key)
    }
  }, [open, closeAll])

  const openApp = (a: Parameters<typeof os.open>[0]) => () => os.open(a)

  const fos: MenuItem[] = [
    { label: 'About this desktop', onSelect: openApp('about') },
    { label: 'Settings…', onSelect: openApp('settings') },
    { label: 'Command palette', key: '⌘K', onSelect: () => os.setPaletteOpen(true) },
    { sep: true },
    { label: 'Switch to plain page', onSelect: os.plain },
    { sep: true },
    { label: 'Shut down…', onSelect: os.shutdown },
  ]
  const file: MenuItem[] = [
    { label: 'New terminal', onSelect: openApp('terminal') },
    {
      label: 'Close window',
      key: 'Esc',
      disabled: !active,
      onSelect: () => active && os.close(active.id),
    },
    { label: 'Close all windows', disabled: os.wins.length === 0, onSelect: os.closeAll },
    { sep: true },
    ...(resume
      ? ([
          {
            label: 'Download resume',
            href: resume,
            download: resumeFileName(resume, data.settings.name),
          },
        ] as MenuItem[])
      : []),
  ]
  const view: MenuItem[] = [
    { label: 'Show desktop', onSelect: os.showDesktop },
    { label: 'Cascade windows', onSelect: os.cascade },
    { sep: true },
    {
      label: 'Reduce motion',
      check: s.reduceMotion,
      onSelect: () => setSettings({ reduceMotion: !s.reduceMotion }),
    },
    { label: 'Sound', check: s.sound, onSelect: () => setSettings({ sound: !s.sound }) },
  ]
  const go: MenuItem[] = [
    { label: 'Projects', onSelect: () => os.open('files', { path: 'projects' }) },
    { label: 'Photos', onSelect: openApp('photos') },
    { label: 'Games', onSelect: openApp('games') },
    { label: 'Lab', onSelect: openApp('lab') },
    { label: 'Skills', onSelect: openApp('skills') },
    { label: 'Mail', onSelect: openApp('mail') },
    { label: 'Old Versions', onSelect: () => os.open('files', { path: 'versions' }) },
    ...(gh || li || ig ? ([{ sep: true }] as MenuItem[]) : []),
    ...(gh ? ([{ label: 'GitHub ↗', href: gh, external: true }] as MenuItem[]) : []),
    ...(li ? ([{ label: 'LinkedIn ↗', href: li, external: true }] as MenuItem[]) : []),
    ...(ig ? ([{ label: `Instagram ↗`, href: ig, external: true }] as MenuItem[]) : []),
  ]

  return (
    <header ref={bar} className={styles.menubar} aria-label="Menu bar">
      <Menu id="fos" open={open} setOpen={setOpen} label="FunkyOS" items={fos}>
        <span className={styles.logoMark}>FunkyOS</span>
      </Menu>
      <span className={styles.appName} aria-live="polite">
        {active ? META[active.app].title(active.props, data) || META[active.app].label : 'Desktop'}
      </span>
      <Menu id="file" open={open} setOpen={setOpen} label="File" items={file} />
      <Menu id="view" open={open} setOpen={setOpen} label="View" items={view} />
      <Menu id="go" open={open} setOpen={setOpen} label="Go" items={go} />
      <span className={styles.spacer} />
      <button
        type="button"
        className={styles.mbtn}
        aria-pressed={settings.sound}
        aria-label={settings.sound ? 'Sound on. Turn off' : 'Sound off. Turn on'}
        onClick={() => setSettings({ sound: !settings.sound })}
      >
        {settings.sound ? 'Sound on' : 'Sound off'}
      </button>
      <span className={styles.clock} suppressHydrationWarning>
        {clock}
      </span>
      {resume && (
        <a
          className={styles.mlink}
          href={resume}
          download={resumeFileName(resume, data.settings.name)}
        >
          Resume
        </a>
      )}
      <button
        type="button"
        className={styles.hire}
        onClick={() => os.open('mail', { subject: "Let's talk" })}
      >
        Hire me
      </button>
    </header>
  )
}
