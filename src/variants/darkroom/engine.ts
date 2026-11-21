/**
 * Tiny module-level stores shared by the darkroom components.
 * Kept outside React so scroll velocity, the intro gate and the shutter sound never cause re-renders.
 */

/* ---------- scroll velocity (px/s), written by the root ticker ---------- */
export const scrollVel = { v: 0 }

/* ---------- intro gate: hero animation waits until the veil lifts ---------- */
let revealed = false
const waiters = new Set<() => void>()
export const resetReveal = () => {
  revealed = false
  waiters.clear()
}
export const doReveal = () => {
  if (revealed) return
  revealed = true
  waiters.forEach((fn) => fn())
  waiters.clear()
}
export const onReveal = (fn: () => void) => {
  if (revealed) {
    fn()
    return () => {}
  }
  waiters.add(fn)
  return () => void waiters.delete(fn)
}

/* ---------- analytics hook (no endpoint yet: a DOM event the owner can listen to) ---------- */
export const track = (name: string, detail: Record<string, unknown> = {}) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('portfolio:event', { detail: { name, variant: 'darkroom', ...detail } }),
  )
}

/* ---------- sound: raw WebAudio, OFF by default, never autoplays ---------- */
const SOUND_KEY = 'darkroomSound'
let ctx: AudioContext | null = null
let enabled = false

export const soundOn = () => enabled
export function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}
export function setSound(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {}
  if (on) {
    ctx ??= new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )()
    void ctx.resume()
  }
}
/** A stored "on" needs a user gesture before the context may start. */
export function armSound() {
  if (!enabled) return
  ctx ??= new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )()
  void ctx.resume()
}
export function hydrateSound() {
  enabled = readSoundPref()
}

function burst(ms: number, gain: number, freq?: number) {
  if (!enabled || !ctx || ctx.state !== 'running') return
  const len = Math.max(1, Math.floor((ctx.sampleRate * ms) / 1000))
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = gain
  if (freq) {
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    src.connect(f).connect(g)
  } else src.connect(g)
  g.connect(ctx.destination)
  src.start()
}
export const shutter = () => burst(60, 0.08, 1200)
export const tick = () => burst(4, 0.02)
