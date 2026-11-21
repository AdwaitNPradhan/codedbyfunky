/** Optional WebAudio blips. Off by default, never autoplays, created lazily after a user gesture. */
let ctx: AudioContext | null = null
let enabled = false

export const setSoundEnabled = (on: boolean) => {
  enabled = on
}

function audio() {
  if (!enabled || typeof window === 'undefined') return null
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  c: AudioContext,
  freq: number,
  at: number,
  dur: number,
  gain: number,
  type: OscillatorType = 'triangle',
) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, c.currentTime + at)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur)
  osc.connect(g).connect(c.destination)
  osc.start(c.currentTime + at)
  osc.stop(c.currentTime + at + dur + 0.02)
}

export const sfx = {
  /** Boot chime: C5 then G5, 180ms each. */
  chime() {
    const c = audio()
    if (!c) return
    tone(c, 523.25, 0, 0.18, 0.06)
    tone(c, 783.99, 0.18, 0.18, 0.06)
  },
  /** 20ms click on window actions. */
  click() {
    const c = audio()
    if (c) tone(c, 880, 0, 0.02, 0.03, 'square')
  },
  /** Error blip on an unknown terminal command. */
  error() {
    const c = audio()
    if (c) tone(c, 140, 0, 0.12, 0.05, 'square')
  },
}
