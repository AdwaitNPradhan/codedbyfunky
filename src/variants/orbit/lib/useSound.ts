'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Store } from './store'

type Engine = { ctx: AudioContext; filter: BiquadFilterNode; osc: OscillatorNode; gain: GainNode; timer: number }

/** Raw WebAudio drone + arrival blip. OFF by default, never autoplays; a saved "on" only resumes on the first gesture. */
export function useSound(store: Store, station: number) {
  const [on, setOn] = useState(false)
  const eng = useRef<Engine | null>(null)
  const lastStation = useRef(station)

  const stop = useCallback(() => {
    const e = eng.current
    if (!e) return
    window.clearInterval(e.timer)
    try {
      e.osc.stop()
      void e.ctx.close()
    } catch {
      /* already closed */
    }
    eng.current = null
  }, [])

  const start = useCallback(() => {
    if (eng.current) return
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 55
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220
    const gain = ctx.createGain()
    gain.gain.value = 0.0001
    osc.connect(filter).connect(gain).connect(ctx.destination)
    osc.start()
    gain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.4)
    const timer = window.setInterval(() => {
      filter.frequency.setTargetAtTime(220 + Math.abs(store.vel) * 0.6, ctx.currentTime, 0.1)
    }, 80)
    eng.current = { ctx, filter, osc, gain, timer }
  }, [store])

  const toggle = useCallback(() => {
    setOn((v) => {
      const n = !v
      try {
        localStorage.setItem('orbit:sound', n ? '1' : '0')
      } catch {
        /* private mode */
      }
      if (n) start()
      else stop()
      return n
    })
  }, [start, stop])

  // saved preference → resume on the first user gesture (browsers block audio before one)
  useEffect(() => {
    let pref = false
    try {
      pref = localStorage.getItem('orbit:sound') === '1'
    } catch {
      /* ignore */
    }
    if (!pref) return
    const go = () => {
      setOn(true)
      start()
    }
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
  }, [start])

  useEffect(() => {
    const vis = () => {
      const e = eng.current
      if (!e) return
      void (document.hidden ? e.ctx.suspend() : e.ctx.resume())
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      stop()
    }
  }, [stop])

  // blip on station arrival
  useEffect(() => {
    if (lastStation.current === station) return
    lastStation.current = station
    const e = eng.current
    if (!e) return
    const o = e.ctx.createOscillator()
    const g = e.ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.05, e.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, e.ctx.currentTime + 0.08)
    o.connect(g).connect(e.ctx.destination)
    o.start()
    o.stop(e.ctx.currentTime + 0.09)
  }, [station])

  return { on, toggle }
}
