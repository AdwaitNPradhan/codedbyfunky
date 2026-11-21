'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { META } from '../appmeta'
import { Icon } from '../icons'
import { useOS } from '../store'
import type { AppId } from '../types'
import { fuzzy, resumeFileName, social } from '../util'
import styles from '../os.module.css'

type Cmd = { id: string; label: string; hint: string; kind: string; run: () => void }

export function Palette({ onClose }: { onClose: () => void }) {
  const os = useOS()
  const { data, settings } = os
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const uid = useId()
  const back = useRef<HTMLElement | null>(null)

  useEffect(() => {
    back.current = document.activeElement as HTMLElement
    input.current?.focus()
    return () => back.current?.focus?.({ preventScroll: true })
  }, [])

  const all = useMemo<Cmd[]>(() => {
    const cmds: Cmd[] = []
    const app = (a: AppId, hint = '') =>
      cmds.push({
        id: `app-${a}`,
        label: META[a].label,
        hint,
        kind: 'app',
        run: () => os.open(a, a === 'files' ? { path: 'projects' } : {}),
      })
    ;(
      [
        'about',
        'files',
        'photos',
        'games',
        'lab',
        'skills',
        'terminal',
        'mail',
        'resume',
        'settings',
      ] as AppId[]
    ).forEach((a) => app(a))
    for (const p of data.projects)
      cmds.push({
        id: `p-${p.slug}`,
        label: p.title,
        hint: `${p.summary} ${p.stack.join(' ')}`,
        kind: 'project',
        run: () => os.open('preview', { slug: p.slug }),
      })
    for (const g of data.games)
      cmds.push({
        id: `g-${g.slug}`,
        label: g.title,
        hint: g.tagline,
        kind: 'game',
        run: () => os.open('game', { slug: g.slug }),
      })
    for (const h of data.hardware)
      cmds.push({
        id: `h-${h.slug}`,
        label: h.title,
        hint: `${h.summary} ${h.components.join(' ')}`,
        kind: 'lab',
        run: () => os.open('lab', { slug: h.slug }),
      })
    for (const ph of data.photos)
      cmds.push({
        id: `ph-${ph.id}`,
        label: ph.title,
        hint: `${ph.location} ${ph.series}`,
        kind: 'photo',
        run: () => os.open('photos', { photo: ph.id }),
      })
    for (const s of data.skills.filter((x) => x.featured))
      cmds.push({
        id: `s-${s.id}`,
        label: s.name,
        hint: s.category,
        kind: 'skill',
        run: () => os.open('skills'),
      })
    const gh = social(data, 'github')
    const li = social(data, 'linkedin')
    const ig = data.settings.instagram.url
    if (data.settings.resumeUrl) {
      const url = data.settings.resumeUrl
      cmds.push({
        id: 'a-resume',
        label: 'Download resume',
        hint: 'pdf',
        kind: 'action',
        run: () => {
          const a = document.createElement('a')
          a.href = url
          a.download = resumeFileName(url, data.settings.name)
          a.click()
        },
      })
    }
    cmds.push({
      id: 'a-hire',
      label: 'Hire me: send a message',
      hint: 'contact mail email',
      kind: 'action',
      run: () => os.open('mail'),
    })
    if (gh)
      cmds.push({
        id: 'a-gh',
        label: 'GitHub',
        hint: 'external link',
        kind: 'link',
        run: () => os.external(gh),
      })
    if (li)
      cmds.push({
        id: 'a-li',
        label: 'LinkedIn',
        hint: 'external link',
        kind: 'link',
        run: () => os.external(li),
      })
    if (ig)
      cmds.push({
        id: 'a-ig',
        label: `Instagram ${data.settings.instagram.handle}`,
        hint: 'photography external link',
        kind: 'link',
        run: () => os.external(ig),
      })
    cmds.push(
      {
        id: 'a-plain',
        label: 'Switch to plain page',
        hint: 'accessible text version',
        kind: 'action',
        run: os.plain,
      },
      {
        id: 'a-motion',
        label: settings.reduceMotion ? 'Turn reduced motion off' : 'Turn reduced motion on',
        hint: 'settings',
        kind: 'action',
        run: () => os.setSettings({ reduceMotion: !settings.reduceMotion }),
      },
      {
        id: 'a-sound',
        label: settings.sound ? 'Turn sound off' : 'Turn sound on',
        hint: 'settings',
        kind: 'action',
        run: () => os.setSettings({ sound: !settings.sound }),
      },
      {
        id: 'a-desk',
        label: 'Show desktop',
        hint: 'minimise all',
        kind: 'action',
        run: os.showDesktop,
      },
      { id: 'a-off', label: 'Shut down', hint: 'power off', kind: 'action', run: os.shutdown },
    )
    return cmds
  }, [data, os, settings.reduceMotion, settings.sound])

  const results = useMemo(() => {
    if (!q.trim()) {
      const apps = all.filter((c) => c.kind === 'app')
      const rest = all.filter((c) => c.kind === 'project').slice(0, 4)
      const act = all.filter((c) => c.kind === 'action').slice(0, 3)
      return [...apps, ...rest, ...act]
    }
    return all
      .map((c) => ({
        c,
        s: Math.max(fuzzy(q, c.label) * 2, fuzzy(q, `${c.label} ${c.hint} ${c.kind}`)),
      }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((x) => x.c)
  }, [q, all])

  useEffect(() => setI(0), [q])
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [i])

  const run = (c?: Cmd) => {
    if (!c) return
    back.current = null
    onClose()
    c.run()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setI((n) => Math.min(results.length - 1, n + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setI((n) => Math.max(0, n - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(results[i])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      e.preventDefault() // focus trap: the input is the only stop
    }
  }

  return (
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKey}
      >
        <div className={styles.palInput}>
          <Icon name="search" size={18} />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search apps, projects, photos, commands…"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={results[i] ? `${uid}-${results[i].id}` : undefined}
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <ul ref={list} id={`${uid}-list`} role="listbox" className={styles.palList}>
          {results.length === 0 && <li className={styles.palGroup}>No results for “{q}”</li>}
          {results.map((c, n) => (
            <li
              key={c.id}
              id={`${uid}-${c.id}`}
              role="option"
              aria-selected={n === i}
              className={styles.palItem}
              onPointerMove={() => setI(n)}
              onClick={() => run(c)}
            >
              <span>{c.label}</span>
              <span className={styles.kind}>{c.kind}</span>
            </li>
          ))}
        </ul>
        <div className={styles.palFoot}>
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
