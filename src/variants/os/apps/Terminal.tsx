'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useOS } from '../store'
import { sfx } from '../sound'
import type { AppProps } from '../types'
import { COMMANDS, commonPrefix, complete, parse, promptPath, type Ctx } from '../terminal/commands'
import ui from './apps.module.css'

type Line = { id: number; node: ReactNode }
const MAX_HISTORY = 50
const MAX_LINES = 500
const CHIPS = ['help', 'projects', 'contact', 'resume']

export default function Terminal({ active, hidden }: AppProps) {
  const os = useOS()
  const { data } = os
  const host = `${data.settings.handle || 'guest'}@funkyos`
  const [lines, setLines] = useState<Line[]>([])
  const [cwd, setCwd] = useState<string[]>([])
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  const history = useRef<string[]>([])
  const hIdx = useRef(-1)
  const draft = useRef('')
  const cancelled = useRef(false)

  const push = useCallback((node: ReactNode) => {
    setLines((l) => [...l, { id: ++idRef.current, node }].slice(-MAX_LINES))
  }, [])

  const osRef = useRef(os)
  osRef.current = os
  const cwdRef = useRef(cwd)
  cwdRef.current = cwd

  const ctx = useCallback(
    (): Ctx => ({
      data,
      os: osRef.current,
      cwd: cwdRef.current,
      setCwd,
      history: history.current,
      clear: () => setLines([]),
      exec: (line) => void run(line),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  )

  const run = useCallback(
    async (line: string) => {
      const text = line.trim()
      const where = promptPath(cwdRef.current)
      push(
        <div className={ui.tEcho}>
          <span className={ui.tUser}>{host}</span>:<span className={ui.tPath}>{where}</span>$ {text}
        </div>,
      )
      if (!text) return
      if (history.current[history.current.length - 1] !== text) history.current = [...history.current, text].slice(-MAX_HISTORY)
      hIdx.current = -1
      const [name, ...args] = parse(text)
      const cmd = COMMANDS[name?.toLowerCase()]
      if (!cmd) {
        sfx.error()
        push(<span className={ui.tErr}>command not found: {name}. Try &apos;help&apos;.</span>)
        return
      }
      cancelled.current = false
      setBusy(true)
      try {
        const out = await cmd.run(args, ctx())
        if (!cancelled.current && out !== undefined && out !== null && out !== '') push(out as ReactNode)
      } catch (e) {
        push(<span className={ui.tErr}>{name}: {(e as Error).message}</span>)
      } finally {
        setBusy(false)
      }
    },
    [ctx, host, push],
  )

  // Welcome banner once.
  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    greeted.current = true
    push(
      <div className={ui.tOut}>
        <div className={ui.tHead}>FunkyOS Terminal 1.0</div>
        <div>
          Type <code>help</code> to list commands, or click one: {CHIPS.map((c) => (
            <button key={c} type="button" className={ui.tLink} onClick={() => run(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>,
    )
  }, [push, run])

  useEffect(() => {
    const el = log.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  useEffect(() => {
    if (active && !hidden) input.current?.focus({ preventScroll: true })
  }, [active, hidden])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = value
      setValue('')
      void run(v)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const h = history.current
      if (!h.length) return
      if (hIdx.current === -1) draft.current = value
      hIdx.current = Math.min(h.length - 1, hIdx.current + 1)
      setValue(h[h.length - 1 - hIdx.current])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (hIdx.current < 0) return
      hIdx.current -= 1
      setValue(hIdx.current < 0 ? draft.current : history.current[history.current.length - 1 - hIdx.current])
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const opts = complete(value, ctx())
      if (opts.length === 0) return
      const parts = value.split(/(\s+)/)
      const endsSpace = /\s$/.test(value)
      const word = endsSpace ? '' : (parts[parts.length - 1] ?? '')
      const head = endsSpace ? value : value.slice(0, value.length - word.length)
      if (opts.length === 1) setValue(head + opts[0] + (opts[0].endsWith('/') ? '' : ' '))
      else {
        const p = commonPrefix(opts)
        if (p.length > word.length) setValue(head + p)
        else push(<div className={ui.tLs}>{opts.join('  ')}</div>)
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      setLines([])
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      cancelled.current = true
      setBusy(false)
      push(<span className={ui.tDim}>{host}:{promptPath(cwd)}$ {value}^C</span>)
      setValue('')
    }
  }

  const prompt = useMemo(() => `${host}:${promptPath(cwd)}$`, [host, cwd])

  return (
    <div
      className={ui.term}
      onPointerUp={() => {
        if (!window.getSelection()?.toString()) input.current?.focus({ preventScroll: true })
      }}
    >
      <div ref={log} className={ui.tLog} role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((l) => (
          <div key={l.id} className={ui.tLine}>
            {l.node}
          </div>
        ))}
      </div>
      <div className={ui.tInputRow}>
        <label htmlFor="os-term-in" className={ui.tPrompt}>
          {prompt}
        </label>
        <input
          ref={input}
          id="os-term-in"
          className={ui.tInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-busy={busy}
        />
      </div>
      {os.mobile && (
        <div className={ui.tChips} role="group" aria-label="Quick commands">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => void run(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
