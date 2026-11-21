import { getState } from './store'

/** Raw WebAudio chip-tune blips. Off by default, only plays after the visitor switches SOUND on. */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !getState().sound) return null
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  gain = 0.05,
  at = 0,
  type: OscillatorType = 'square',
) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + at
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export const sfx = {
  press: () => tone(440, 880, 0.07),
  coin: () => {
    tone(988, 988, 0.07, 0.05)
    tone(1319, 1319, 0.16, 0.05, 0.07)
  },
  pop: () => tone(300, 700, 0.09, 0.04, 0, 'triangle'),
  jingle: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.12, 0.05, i * 0.09)),
}
