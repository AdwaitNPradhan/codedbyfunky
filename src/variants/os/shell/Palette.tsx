'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { META, needsSpotify } from '../appmeta'
import { Icon } from '../icons'
import { useOS } from '../store'
import type { AppId } from '../types'
import { fuzzy, resumeFileName, social } from '../util'
import { VERSION_FILES } from '../versions'
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
        'notes',
        'blog',
        'spotify',
        'guestbook',
        'linux',
        'settings',
      ] as AppId[]
    )
      .filter((a) => needsSpotify(a, data))
      .forEach((a) => app(a))
    for (const p of data.projects)
      cmds.push({
        id: `p-${p.slug}`,
        label: p.title,
        hint: `${p.summary} ${p.stack.join(' ')}`,
        kind: 'project',
        run: () => os.open('preview', { slug: p.slug }),
      })
    for (const p of data.posts)
      cmds.push({
        id: `post-${p.slug}`,
        label: p.title,
        hint: `${p.excerpt} ${p.tags.join(' ')}`,
        kind: p.kind === 'note' ? 'note' : 'blog',
        run: () => os.open(p.kind === 'note' ? 'notes' : 'blog', { slug: p.slug }),
      })
    for (const v of VERSION_FILES)
      cmds.push({
        id: `v-${v.file}`,
        label: v.file,
        hint: `old version website ${v.key} ${v.title} ${v.note}`,
        kind: 'old version',
        run: () => os.open('browser', { v: v.key }),
      })
    cmds.push({
      id: 'f-versions',
      label: 'Old Versions folder',
      hint: 'previous designs of this website personal website v1 final',
      kind: 'folder',
      run: () => os.open('files', { path: 'versions' }),
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
    for (const h of data.hardware)
      cmds.push({
        id: `m-${h.slug}`,
        label: `${h.title} in 3D`,
        hint: 'model viewer board',
        kind: '3d',
        run: () => os.open('model', { slug: h.slug }),
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
    for (const p of data.projects)
      cmds.push({
        id: `app-${p.slug}`,
        label: `${p.title} (app)`,
        hint: `launch install application ${p.stack.join(' ')}`,
        kind: 'application',
        run: () => os.open('product', { slug: p.slug }),
      })
    const act = os.wins.find((w) => w.id === os.activeId)
    if (act)
      cmds.push({
        id: 'a-share',
        label: 'Share link to this window',
        hint: 'copy link deep link',
        kind: 'action',
        run: () => os.share(act.app, act.props),
      })
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
