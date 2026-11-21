/** Tiny synthesized sound effects (WebAudio, no assets). Muted by default; the HUD has a toggle. */
const KEY = 'codedbyfunky:game:sound'
let ac: AudioContext | null = null
let muted = true
let loaded = false

function load() {
  if (loaded) return
  loaded = true
  try {
    muted = localStorage.getItem(KEY) !== 'on'
  } catch {
    muted = true
  }
}

export function isMuted() {
  load()
  return muted
}

export function setMuted(m: boolean) {
  load()
  muted = m
  try {
    localStorage.setItem(KEY, m ? 'off' : 'on')
  } catch {
    /* ignore */
  }
  if (!m) audio()
}

function audio(): AudioContext | null {
  if (!ac) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ac = new AC()
    } catch {
      return null
    }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {})
  return ac
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.07,
  slide = 0,
  delay = 0,
) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

export type SfxName =
  | 'pop'
  | 'hit'
  | 'good'
  | 'bad'
  | 'jump'
  | 'win'
  | 'lose'
  | 'tick'
  | 'click'
  | 'shutter'
  | 'drop'
  | 'launch'

const BANK: Record<SfxName, () => void> = {
  pop: () => tone(520, 0.09, 'triangle', 0.08, 360),
  hit: () => tone(180, 0.12, 'square', 0.06, -90),
  good: () => {
    tone(660, 0.09, 'triangle', 0.07)
    tone(990, 0.12, 'triangle', 0.06, 0, 0.07)
  },
  bad: () => tone(160, 0.22, 'sawtooth', 0.06, -80),
  jump: () => tone(300, 0.16, 'square', 0.05, 380),
  win: () => {
    tone(523, 0.1, 'triangle', 0.07)
    tone(659, 0.1, 'triangle', 0.07, 0, 0.09)
    tone(784, 0.18, 'triangle', 0.07, 0, 0.18)
  },
  lose: () => {
    tone(330, 0.18, 'sawtooth', 0.06, -140)
    tone(220, 0.3, 'sawtooth', 0.06, -120, 0.14)
  },
  tick: () => tone(900, 0.04, 'square', 0.03),
  click: () => tone(420, 0.05, 'triangle', 0.05, 120),
  shutter: () => {
    tone(1800, 0.03, 'square', 0.04)
    tone(900, 0.06, 'square', 0.04, 0, 0.05)
  },
  drop: () => tone(140, 0.14, 'sine', 0.1, -60),
  launch: () => tone(200, 0.3, 'sawtooth', 0.04, 500),
}

export function sfx(name: SfxName) {
  load()
  if (muted) return
  BANK[name]()
}
