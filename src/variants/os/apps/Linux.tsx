'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useOS } from '../store'
import type { AppProps } from '../types'
import {
  RAM_BYTES,
  SOFT_KEYS,
  TOTAL_BYTES,
  sendKey,
  sendText,
  startVm,
  tapKey,
  type V86Emu,
} from './linuxVm'
import ui from './apps.module.css'

type Phase = 'idle' | 'loading' | 'running' | 'stopped' | 'error'
// A minimised VM keeps its memory. After this long it is stopped for real.
const IDLE_STOP_MS = 30_000
const mb = (n: number) => (n / 1e6).toFixed(1)

/**
 * A real Linux (kernel 6.8, Buildroot) in the visitor's browser, through the v86 emulator.
 * Nothing loads until the visitor presses Boot. No network. The VM is destroyed on close.
 */
export default function Linux({ active, hidden }: AppProps) {
  const os = useOS()
  const [phase, setPhase] = useState<Phase>('idle')
  const [got, setGot] = useState(0)
  const [note, setNote] = useState('')
  const [focused, setFocused] = useState(false)
  const emu = useRef<V86Emu | null>(null)
  const abort = useRef<AbortController | null>(null)
  const screen = useRef<HTMLDivElement>(null)
  const proxy = useRef<HTMLInputElement>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const bytes = useRef(0)

  /** Stop the VM and let go of its memory. */
  const teardown = useCallback(() => {
    abort.current?.abort()
    abort.current = null
    clearTimeout(idleTimer.current)
    const e = emu.current
    emu.current = null
    if (e) void e.destroy().catch(() => {})
    screen.current?.replaceChildren()
  }, [])

  const stop = useCallback(
    (why: string) => {
      teardown()
      setNote(why)
      setPhase('stopped')
    },
    [teardown],
  )

  const boot = useCallback(async () => {
    const host = screen.current
    if (!host) return
    teardown()
    // v86 needs a container with a text div and a canvas. We build it here so React never touches it.
    const text = document.createElement('div')
    text.style.cssText = 'white-space:pre;font:14px monospace;line-height:14px;display:none'
    const canvas = document.createElement('canvas')
    host.replaceChildren(text, canvas)
    const ctl = new AbortController()
    abort.current = ctl
    bytes.current = 0
    setGot(0)
    setNote('')
    setPhase('loading')
    try {
      const vm = await startVm({
        screen: host,
        signal: ctl.signal,
        onBytes: (n) => {
          bytes.current += n
          setGot(bytes.current)
        },
      })
      if (ctl.signal.aborted) {
        void vm.destroy().catch(() => {})
        return
      }
      emu.current = vm
      setPhase('running')
      host.focus({ preventScroll: true })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      teardown()
      setNote((e as Error).message || 'Linux could not start.')
      setPhase('error')
    }
  }, [teardown])

  // Closing the window unmounts this component: destroy the VM.
  useEffect(() => teardown, [teardown])

  // Minimised: pause the CPU. Still minimised after a while: stop and free the memory.
  useEffect(() => {
    const e = emu.current
    if (!e || phase !== 'running') return
    if (hidden) {
      void e.stop().catch(() => {})
      idleTimer.current = setTimeout(
        () => stop('The VM was stopped to free memory while the window was minimised.'),
        IDLE_STOP_MS,
      )
      return () => clearTimeout(idleTimer.current)
    }
    if (!e.is_running()) void e.run().catch(() => {})
  }, [hidden, phase, stop])

  useEffect(() => {
    if (phase === 'running' && active && !hidden) screen.current?.focus({ preventScroll: true })
  }, [active, hidden, phase])

  // Keys typed on the screen go to Linux. Cmd shortcuts and Alt+Tab stay with FunkyOS.
  const onKey = (down: boolean) => (e: React.KeyboardEvent) => {
    const vm = emu.current
    if (!vm) return
    if (down && e.ctrlKey && e.altKey && e.code === 'Escape') {
      e.preventDefault() // FunkyOS must not read this Escape as "close the window"
      e.stopPropagation()
      screen.current?.blur() // the way out of the keyboard trap
      return
    }
    if (e.altKey && e.code === 'Tab') return
    if (sendKey(vm, e.nativeEvent, down)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // Phone keyboard: type into a real input and pass the text on.
  const onProxyInput = (e: React.FormEvent<HTMLInputElement>) => {
    const t = e.currentTarget.value
    if (t && emu.current) sendText(emu.current, t)
    e.currentTarget.value = ''
  }
  const onProxyKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const vm = emu.current
    const keys = ['Enter', 'Backspace', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    const k = keys.includes(e.key) ? e.key : ''
    if (vm && k) {
      e.preventDefault()
      tapKey(vm, k)
    }
  }

  const pct = Math.min(100, Math.round((got / TOTAL_BYTES) * 100))
  const running = phase === 'running'

  return (
    <div className={ui.linux}>
      <div className={ui.lxBar}>
        <span className={ui.lxBadge}>REAL LINUX</span>
        <span className={ui.lxSub}>
          runs in your browser · {RAM_BYTES / 1024 / 1024} MB RAM · no network
        </span>
        <span className={ui.grow} />
        {running && (
          <>
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => emu.current?.restart()}>
              Reboot
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => stop('The VM was stopped.')}>
              Stop
            </button>
          </>
        )}
      </div>

      <div className={ui.lxBody}>
        <div
          ref={screen}
          className={ui.lxScreen}
          data-live={running}
          tabIndex={running ? 0 : -1}
          role="application"
          aria-label="Linux console. Keys you type go to Linux. Press Control Alt Escape to leave."
          onKeyDown={onKey(true)}
          onKeyUp={onKey(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPointerDown={() => screen.current?.focus({ preventScroll: true })}
        />

        {phase === 'idle' && (
          <div className={ui.lxPanel}>
            <h2 className={ui.lxTitle}>Boot a real Linux</h2>
            <div className={ui.lxCompare}>
              <section>
                <h3>FunkyOS shell</h3>
                <p>The Terminal app. A pretend shell that knows this site: projects, resume, jokes.</p>
              </section>
              <section data-real="true">
                <h3>Real Linux (this app)</h3>
                <p>
                  An actual Linux kernel and shell, run by an x86 emulator inside your browser tab. Try{' '}
                  <code>ls</code>, <code>uname -a</code>, <code>cat /proc/cpuinfo</code>.
                </p>
              </section>
            </div>
            <p className={ui.dim}>
              Loads about {mb(TOTAL_BYTES)} MB once (your browser keeps it), boots in 5 to 10 seconds, has {RAM_BYTES / 1024 / 1024} MB
              of RAM and no network. Nothing you type leaves your device. Closing the window destroys the machine.
            </p>
            {os.mobile && <p className={ui.lxHint}>Best on desktop: Linux needs a real keyboard. A small input appears below the screen on phones.</p>}
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void boot()}>
              Boot Linux
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className={ui.lxPanel} role="status">
            <h2 className={ui.lxTitle}>Downloading Linux…</h2>
            <progress className={ui.lxProgress} max={TOTAL_BYTES} value={got} aria-label="Download progress" />
            <p className={ui.lxBytes}>
              {mb(got)} / {mb(TOTAL_BYTES)} MB ({pct}%)
            </p>
            <p className={ui.dim}>Next: the machine starts and the Linux boot messages appear.</p>
            <button type="button" className={`${ui.btn} ${ui.btnSm}`} onClick={() => stop('Download cancelled.')}>
              Cancel
            </button>
          </div>
        )}

        {(phase === 'stopped' || phase === 'error') && (
          <div className={ui.lxPanel} role="status">
            <h2 className={ui.lxTitle}>{phase === 'error' ? 'Linux could not start' : 'Linux is off'}</h2>
            {note && <p>{note}</p>}
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => void boot()}>
              {phase === 'error' ? 'Try again' : 'Boot again'}
            </button>
          </div>
        )}

        {running && !focused && !os.mobile && <p className={ui.lxFocus}>Click the screen to type</p>}
      </div>

      {running && (
        <div className={ui.lxFoot}>
          <p className={ui.lxHint}>
            {os.mobile
              ? 'Best on desktop. Tap the box below to type.'
              : 'The keyboard goes to Linux while the screen has focus. Control+Alt+Escape gives it back.'}
          </p>
          {os.mobile && (
            <div className={ui.lxPhone}>
              <input
                ref={proxy}
                className={ui.lxProxy}
                aria-label="Type into Linux"
                placeholder="Tap here to type"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="send"
                onInput={onProxyInput}
                onKeyDown={onProxyKey}
              />
              {SOFT_KEYS.map((k) => (
                <button key={k.label} type="button" aria-label={k.aria} onClick={() => emu.current && k.press(emu.current)}>
                  {k.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
