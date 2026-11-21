'use client'

import { useEffect, useMemo } from 'react'
import { m, useMotionValue, useSpring, useTransform } from 'motion/react'
import styles from '../os.module.css'

/** Stepped (pixel) skyline path. Integer coordinates so server and client agree. */
function skyline(seed: number, base: number, amp: number, step: number, w: number, h: number) {
  let d = `M0 ${h}`
  for (let x = 0; x < w; x += step) {
    const n =
      Math.sin(x * 0.006 + seed) * 0.55 +
      Math.sin(x * 0.017 + seed * 2.3) * 0.3 +
      Math.sin(x * 0.041 + seed * 4.1) * 0.15
    const y = Math.round((base - amp * (0.5 + 0.5 * n)) / step) * step
    d += `V${y}H${x + step}`
  }
  return `${d}V${h}Z`
}

export function Wallpaper({ parallax }: { parallax: boolean }) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 60, damping: 20, mass: 1 })
  const sy = useSpring(py, { stiffness: 60, damping: 20, mass: 1 })
  const dx = useTransform(sx, (v) => v * 6)
  const dy = useTransform(sy, (v) => v * 6)
  const fx = useTransform(sx, (v) => v * -3)
  const mx = useTransform(sx, (v) => v * -6)
  const nx = useTransform(sx, (v) => v * -10)

  useEffect(() => {
    if (!parallax) return
    const on = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * 2)
      py.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [parallax, px, py])

  const paths = useMemo(
    () => ({
      far: skyline(1.3, 300, 120, 16, 1600, 400),
      mid: skyline(4.7, 340, 110, 16, 1600, 400),
      near: skyline(9.1, 380, 90, 16, 1600, 400),
    }),
    [],
  )

  return (
    <div className={styles.wall} aria-hidden="true">
      <div className={styles.sun} />
      {(['far', 'mid', 'near'] as const).map((k) => (
        <m.div
          key={k}
          className={styles.wallLayer}
          style={{ x: parallax ? (k === 'far' ? fx : k === 'mid' ? mx : nx) : 0 }}
        >
          <svg
            viewBox="0 0 1600 400"
            preserveAspectRatio="xMidYMax slice"
            shapeRendering="crispEdges"
          >
            <path
              d={paths[k]}
              className={
                k === 'far' ? styles.hillFar : k === 'mid' ? styles.hillMid : styles.hillNear
              }
            />
          </svg>
        </m.div>
      ))}
      <m.div className={styles.dither} style={{ x: parallax ? dx : 0, y: parallax ? dy : 0 }} />
      <div className={styles.scan} />
    </div>
  )
}
