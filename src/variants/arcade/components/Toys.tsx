'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { addCoins, award, bump, getState, setNativeCursor, setToy, useArcade, type ToyMode } from '../lib/store'
import { isGravity, registerStamp, setGravity, wakeInView } from '../lib/physics'
import { sfx } from '../lib/sound'
import { rng, useFine, useReduced } from '../lib/misc'
import { Icon, StickerArt, STICKER_KINDS, type StickerKind } from './art'

type Stamp = { id: number; x: number; y: number; rot: number; size: number; kind: StickerKind; tone: 'pink' | 'yellow' | 'blue' | 'mint' | 'orange' | 'lilac'; leaving?: boolean }
const TONES = ['pink', 'yellow', 'blue', 'mint', 'orange', 'lilac'] as const
const MAX_STAMPS = 30
// Anything that already means something on click: toys never fight these.
const IGNORE = 'a,button,input,textarea,select,summary,label,dialog,[role=button],[data-toy-ignore],[data-native-cursor],[aria-label$="mini game"]'
const NATIVE = 'input,textarea,select,dialog,[data-native-cursor],[aria-label$="mini game"],.ar-cab__screen'

const MODES: Array<{ id: ToyMode; label: string; key: string; hint: string }> = [
  { id: 'pointer', label: 'Pointer', key: '1', hint: 'The default arrow.' },
  { id: 'stamper', label: 'Stamper', key: '2', hint: 'Click to stamp stickers.' },
  { id: 'gravity', label: 'Gravity', key: '3', hint: 'Click to toggle gravity.' },
]

/** Cursor toys (desktop, fine pointer, no reduced motion): pointer, stamper, gravity. */
export function Toys({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const fine = useFine()
  const reduced = useReduced()
  const enabled = fine && !reduced
  const toy = useArcade((s) => s.toy)
  const nativeCursor = useArcade((s) => s.nativeCursor)
  const [open, setOpen] = useState(false)
  const [stamps, setStamps] = useState<Stamp[]>([])
  const [grav, setGrav] = useState(false)
  const cursor = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  const used = useRef<Set<ToyMode>>(new Set(['pointer']))
  const customCursor = enabled && !nativeCursor

  const choose = useCallback((m: ToyMode) => {
    setToy(m)
    used.current.add(m)
    if (used.current.size >= 3) award('toy-tester')
    if (m !== 'gravity') {
      setGravity(false)
      setGrav(false)
    }
    sfx.pop()
  }, [])

  // Hide the native cursor on the whole site (never over fields, dialogs, games).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.toggle('ar-cursor-on', customCursor)
    return () => root.classList.remove('ar-cursor-on')
  }, [customCursor, rootRef])

  // Pointer follower + squish.
  useEffect(() => {
    if (!customCursor) return
    const el = cursor.current
    if (!el) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      el.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`
      el.dataset.show = '1'
      el.dataset.native = (e.target as Element | null)?.closest?.(NATIVE) ? '1' : ''
    }
    const down = () => {
      el.dataset.down = '1'
      setTimeout(() => (el.dataset.down = ''), 90)
    }
    const leave = () => (el.dataset.show = '')
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [customCursor])

  // Stamper + gravity clicks.
  useEffect(() => {
    if (!enabled || toy === 'pointer') return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (!t || t.closest(IGNORE) || !rootRef.current?.contains(t)) return
      if (toy === 'stamper') {
        const g = rng(Date.now() & 0xffff)
        const id = ++idRef.current
        const s: Stamp = {
          id,
          x: e.pageX,
          y: e.pageY,
          rot: (g() - 0.5) * 50,
          size: 40 + Math.round(g() * 32),
          kind: STICKER_KINDS[Math.floor(g() * STICKER_KINDS.length)],
          tone: TONES[Math.floor(g() * TONES.length)],
        }
        setStamps((prev) => {
          let next = [...prev, s]
          const live = next.filter((x) => !x.leaving)
          if (live.length > MAX_STAMPS) {
            const old = live[0].id
            next = next.map((x) => (x.id === old ? { ...x, leaving: true } : x))
            setTimeout(() => setStamps((p) => p.filter((x) => x.id !== old)), 420)
          }
          return next
        })
        sfx.pop()
        const n = bump('stamps')
        if (n <= 30) addCoins(1)
        if (n >= 10) award('sticker-bomb')
      } else if (toy === 'gravity') {
        const next = !isGravity()
        setGravity(next)
        setGrav(next)
        sfx.pop()
        bump('gravity')
      }
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [enabled, toy, rootRef])

  // Gravity: wake new cards as the page scrolls.
  useEffect(() => {
    if (!enabled) return
    let t = 0
    const onScroll = () => {
      window.clearTimeout(t)
      t = window.setTimeout(wakeInView, 140)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(t)
    }
  }, [enabled])

  // Keys: 1 2 3 pick a toy, Esc clears stickers and switches toys off.
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      const typing = !!t?.closest('input,textarea,select,[contenteditable],[aria-label$="mini game"]')
      if (e.key === 'Escape') {
        if (document.querySelector('[data-variant="arcade"] dialog[open]')) return
        setStamps([])
        setGravity(false)
        setGrav(false)
        setOpen(false)
        if (getState().toy !== 'pointer') setToy('pointer')
        return
      }
      if (typing) return
      const m = MODES.find((x) => x.key === e.key)
      if (m) choose(m.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, choose])

  useEffect(() => () => setGravity(false), [])

  if (!enabled) return null
  const mode = MODES.find((m) => m.id === toy)!

  return (
    <>
      <div className="ar-stamps" aria-hidden="true">
        {stamps.map((s) => (
          <StampEl key={s.id} s={s} />
        ))}
      </div>

      <div className="ar-toybox" data-toy-ignore="">
        {open && (
          <div className="ar-toybox__panel" role="group" aria-label="Cursor toys">
            {MODES.map((m) => (
              <button key={m.id} type="button" className="ar-pill" aria-pressed={toy === m.id} onClick={() => choose(m.id)}>
                <kbd>{m.key}</kbd> {m.label}
              </button>
            ))}
            <p className="ar-toybox__hint">
              {mode.hint} <kbd>Esc</kbd> clears everything.
            </p>
            <button type="button" className="ar-pill" aria-pressed={nativeCursor} onClick={() => setNativeCursor(!nativeCursor)}>
              Plain cursor: {nativeCursor ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
        <button type="button" className="ar-toybox__btn" aria-expanded={open} aria-label="Toy box: cursor toys" onClick={() => setOpen((o) => !o)}>
          <Icon name="die" size={26} />
          <span>{toy === 'pointer' ? 'TOYS' : toy === 'stamper' ? 'STAMP' : grav ? 'GRAV ON' : 'GRAV'}</span>
        </button>
      </div>

      {customCursor && (
        <div ref={cursor} className="ar-cursor" aria-hidden="true">
          <div className="ar-cursor__inner">
            <svg width="26" height="30" viewBox="0 0 26 30">
              <path d="M5 5 L5 25 L10.5 20 L14.5 28 L18.5 26 L14.5 18.5 L22 18.5 Z" className="ar-cursor__shadow" />
              <path d="M2 2 L2 22 L7.5 17 L11.5 25 L15.5 23 L11.5 15.5 L19 15.5 Z" className="ar-cursor__arrow" />
            </svg>
            {toy !== 'pointer' && <span className="ar-cursor__tag">{toy === 'stamper' ? 'STAMP' : 'GRAVITY'}</span>}
          </div>
        </div>
      )}
    </>
  )
}

function StampEl({ s }: { s: Stamp }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    return registerStamp(el, s.y - s.size / 2)
  }, [s.y, s.size])
  return (
    <div ref={ref} className="ar-stamp-phys" style={{ left: s.x - s.size / 2, top: s.y - s.size / 2, width: s.size, height: s.size }}>
      <div className={`ar-stamp-pop${s.leaving ? ' is-leaving' : ''}`} style={{ transform: `rotate(${s.rot}deg)` }}>
        <StickerArt kind={s.kind} tone={s.tone} />
      </div>
    </div>
  )
}
