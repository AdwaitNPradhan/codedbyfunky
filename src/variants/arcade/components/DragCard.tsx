'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  animate,
  m,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'motion/react'
import { addCoins, award, bump } from '../lib/store'
import { registerCard } from '../lib/physics'
import { clamp, cx, isIntroDone, useCoarse, useReduced, whenIntroDone } from '../lib/misc'

let zTop = 20
const SPRING = { type: 'spring', stiffness: 260, damping: 18, mass: 0.9 } as const

export type DragCardProps = {
  id: string
  as?: 'div' | 'li'
  className?: string
  style?: CSSProperties
  /** Resting rotation in degrees. */
  rest?: number
  /** Controlled resting rotation (pile shuffle animates this). */
  restMV?: MotionValue<number>
  x?: MotionValue<number>
  y?: MotionValue<number>
  /** Where the card sits when gravity is switched off. */
  home?: () => { x: number; y: number }
  constraints?: RefObject<HTMLElement | null>
  drag?: boolean
  /** Allow free dragging on touch screens (small items only; big ones would trap page scroll). */
  touchDrag?: boolean
  layout?: boolean
  /** Index for the hero fly-in after the PRESS START veil. */
  throwIn?: number
  children: ReactNode
}

/**
 * Draggable toy card: spring release, velocity tilt, keyboard nudges, gravity-aware.
 * A drag never counts as a click: children's clicks are swallowed right after a drag.
 */
export function DragCard({
  id,
  as = 'div',
  className,
  style,
  rest = 0,
  restMV,
  x: xProp,
  y: yProp,
  home,
  constraints,
  drag = true,
  touchDrag = false,
  layout,
  throwIn,
  children,
}: DragCardProps) {
  const reduced = useReduced()
  const coarse = useCoarse()
  const ownX = useMotionValue(0)
  const ownY = useMotionValue(0)
  const x = xProp ?? ownX
  const y = yProp ?? ownY
  const ownRest = useMotionValue(rest)
  const restRot = restMV ?? ownRest
  const z = useMotionValue(1)
  const ref = useRef<HTMLElement | null>(null)
  const dragged = useRef(false)
  const reg = useRef<ReturnType<typeof registerCard> | null>(null)
  const [dragging, setDragging] = useState(false)
  const enabled = drag && (!coarse || touchDrag)

  const vx = useVelocity(x)
  const tiltRaw = useTransform(vx, (v) => (reduced ? 0 : clamp(v / 60, -12, 12)))
  const tilt = useSpring(tiltRaw, { stiffness: 260, damping: 20 })
  // rotation = velocity tilt + resting rotation, combined by hand (a plain subscription is easier to reason about than a derived value here)
  const rotate = useMotionValue(rest)
  useEffect(() => {
    const sync = () => rotate.set(tilt.get() + restRot.get())
    sync()
    const offA = tilt.on('change', sync)
    const offB = restRot.on('change', sync)
    return () => {
      offA()
      offB()
    }
  }, [tilt, restRot, rotate])

  const reducedRef = useRef(reduced)
  reducedRef.current = reduced
  const homeRef = useRef(home)
  homeRef.current = home

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = registerCard({ id, el, x, y, home: () => homeRef.current?.() ?? { x: 0, y: 0 } })
    reg.current = r
    return r.unregister
  }, [id, x, y])

  // Hero fly-in: start off-screen at a random angle, spring home once the intro veil lifts.
  useEffect(() => {
    if (throwIn == null || reduced || isIntroDone()) return
    const a = Math.random() * Math.PI * 2
    const d = Math.max(innerWidth, innerHeight) * 0.9
    const spin = (Math.random() - 0.5) * 360
    x.set(Math.cos(a) * d)
    y.set(Math.sin(a) * d)
    restRot.set(rest + spin)
    return whenIntroDone(() => {
      if (reducedRef.current) {
        // reduced motion flipped on after the first render: land upright with no flight
        x.set(0)
        y.set(0)
        restRot.set(0)
        return
      }
      const t = { ...SPRING, delay: throwIn * 0.07 }
      animate(x, 0, t)
      animate(y, 0, t)
      animate(restRot, rest, t)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reduced motion: no resting tilt (cards render as a clean, upright grid).
  useEffect(() => {
    if (reduced) restRot.set(0)
  }, [reduced, restRot])

  const Comp = (as === 'li' ? m.li : m.div) as typeof m.div

  const nudge = (e: React.KeyboardEvent) => {
    if (!enabled || (e.target as HTMLElement).closest('input,textarea,select')) return
    const s = e.shiftKey ? 32 : 8
    const d = (
      { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] } as Record<
        string,
        number[]
      >
    )[e.key]
    if (!d) return
    e.preventDefault()
    const t = { type: 'spring', stiffness: 400, damping: 24 } as const
    animate(x, x.get() + d[0], t)
    animate(y, y.get() + d[1], t)
  }

  return (
    <Comp
      ref={ref as never}
      id={`dc-${id}`}
      data-draggable={enabled ? '' : undefined}
      data-toy-ignore=""
      className={cx('ar-drag', dragging && 'is-dragging', className)}
      style={{ ...style, x, y, rotate, zIndex: z }}
      layout={layout}
      transition={layout ? { layout: { type: 'spring', stiffness: 300, damping: 26 } } : undefined}
      drag={enabled}
      dragConstraints={constraints}
      dragElastic={0.12}
      dragMomentum
      dragTransition={
        reduced
          ? { power: 0 }
          : { power: 0.3, timeConstant: 320, bounceStiffness: 500, bounceDamping: 22 }
      }
      whileDrag={reduced ? undefined : { scale: 1.04 }}
      onPointerDown={() => {
        dragged.current = false
        z.set(++zTop)
      }}
      onDragStart={() => {
        dragged.current = true
        setDragging(true)
        if (reg.current) reg.current.body.dragging = true
      }}
      onDragEnd={(_, info) => {
        setDragging(false)
        reg.current?.release(info.velocity.x, info.velocity.y)
        const n = bump('drags')
        if (n <= 20) addCoins(1)
        if (n >= 5) award('card-shark')
      }}
      onDragStartCapture={(e: React.DragEvent) => e.preventDefault()}
      onKeyDown={nudge}
      onClickCapture={(e) => {
        if (dragged.current) {
          e.preventDefault()
          e.stopPropagation()
          dragged.current = false
        }
      }}
    >
      {children}
    </Comp>
  )
}
