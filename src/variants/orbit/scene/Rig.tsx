'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { TINTS } from '../lib/config'
import { clamp, rng } from '../lib/util'
import type { Route } from '../lib/world'
import { COLOR, damp, useScene, useShader } from './shared'

/** Camera on a Catmull-Rom spline. `store.u` (written by scroll) picks the point; look target has its own spline. */
export function CameraRig({ route, onReady }: { route: Route; onReady: () => void }) {
  const { store, quality } = useScene()
  const { camera, size } = useThree()
  const curves = useMemo(() => {
    const mk = (pick: 'cam' | 'look') => new THREE.CatmullRomCurve3(route.shots.map((s) => new THREE.Vector3(...s[pick])), false, 'centripetal', 0.5)
    return { cam: mk('cam'), look: mk('look'), n: route.shots.length }
  }, [route])
  const k = useRef({ u: 0, look: new THREE.Vector3(), mx: 0, my: 0, frames: 0, init: false, lookInit: false, ready: false })
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3() }), [])

  // portrait screens need a wider lens; phones also push the subject into the area above the sheet
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    cam.fov = clamp((2 * Math.atan(Math.tan((32 * Math.PI) / 180) / aspect) * 180) / Math.PI, 50, 68)
    if (quality.mobile) cam.setViewOffset(size.width, size.height, 0, size.height * 0.2, size.width, size.height)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
  }, [camera, size, quality.mobile])

  useFrame((_, dt) => {
    const s = k.current
    dt = Math.min(dt, 0.1)
    if (!s.init) {
      s.u = store.u
      s.init = true
    }
    s.u = damp(s.u, store.u, 4.2, dt)
    const t = clamp(s.u / (curves.n - 1))
    curves.cam.getPoint(t, tmp.p)
    curves.look.getPoint(t, tmp.l)
    tmp.p.z += store.intro * 26
    camera.position.copy(tmp.p)
    if (!s.lookInit) {
      s.look.copy(tmp.l)
      s.lookInit = true
    } else {
      s.look.x = damp(s.look.x, tmp.l.x, 6, dt)
      s.look.y = damp(s.look.y, tmp.l.y, 6, dt)
      s.look.z = damp(s.look.z, tmp.l.z, 6, dt)
    }
    camera.lookAt(s.look)
    // mouse parallax (desktop only; max 0.12 rad, damped)
    if (!quality.mobile) {
      s.mx = damp(s.mx, store.mouse.x, 3.6, dt)
      s.my = damp(s.my, store.mouse.y, 3.6, dt)
      camera.rotateY(-s.mx * 0.12)
      camera.rotateX(-s.my * 0.07)
    }
    if (!s.ready && ++s.frames > 3) {
      s.ready = true
      onReady()
    }
  })
  return null
}

/** Fog + background tint follow the station tint (void → 6% tint). */
export function FogRig() {
  const { store, quality } = useScene()
  // "6% tint" is judged in sRGB, not linear light (linear lerp would turn the void brown)
  const tints = useMemo(() => {
    const v = new THREE.Color(COLOR.void).convertLinearToSRGB()
    return TINTS.map((h) => v.clone().lerp(new THREE.Color(h).convertLinearToSRGB(), 0.06).convertSRGBToLinear())
  }, [])
  const col = useRef(new THREE.Color(COLOR.void))
  const target = useMemo(() => new THREE.Color(), [])
  useFrame(({ scene }, dt) => {
    const p = clamp(store.pos, 0, tints.length - 1)
    const i = Math.floor(p)
    target.copy(tints[i]).lerp(tints[Math.min(i + 1, tints.length - 1)], p - i)
    col.current.r = damp(col.current.r, target.r, 3, dt)
    col.current.g = damp(col.current.g, target.g, 3, dt)
    col.current.b = damp(col.current.b, target.b, 3, dt)
    const bg = scene.background as THREE.Color
    bg.copy(col.current)
    const fog = scene.fog as THREE.FogExp2
    fog.color.copy(col.current)
  })
  return (
    <>
      <color attach="background" args={[COLOR.void]} />
      <fogExp2 attach="fog" args={[COLOR.void, quality.mobile ? 0.016 : 0.0135]} />
    </>
  )
}

const STREAK_VERT = /* glsl */ `
            uniform vec3 uDir; uniform float uLen; attribute float aEnd; varying float vEnd;
            void main(){ vEnd = aEnd; vec3 p = position + uDir * uLen * aEnd; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`
const STREAK_FRAG = /* glsl */ `
            uniform float uOpacity; varying float vEnd;
            void main(){ gl_FragColor = vec4(vec3(0.93,0.91,0.87), uOpacity * (1.0 - vEnd) * 0.8); }`

/** Star points along the whole route, plus velocity streaks stretched along the view axis. */
export function Stars() {
  const { store, quality } = useScene()
  const streak = useRef<THREE.LineSegments>(null)
  const uniforms = useMemo(() => ({ uDir: { value: new THREE.Vector3(0, 0, -1) }, uLen: { value: 0 }, uOpacity: { value: 0.0 } }), [])
  const len = useRef(0)
  const streakMat = useShader(STREAK_VERT, STREAK_FRAG, uniforms, { transparent: true, depthWrite: false })
  const dir = useMemo(() => new THREE.Vector3(), [])

  const { points, lines } = useMemo(() => {
    const n = quality.stars
    const r = rng(7)
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r() - 0.5) * 120
      pos[i * 3 + 1] = (r() - 0.5) * 64
      pos[i * 3 + 2] = 40 - r() * 540
      // keep a clear lane for the camera
      if (Math.abs(pos[i * 3]) < 3 && Math.abs(pos[i * 3 + 1]) < 3) pos[i * 3] += 5
    }
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const lp = new Float32Array(n * 6)
    const end = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      lp.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], i * 6)
      end[i * 2 + 1] = 1
    }
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    lg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))
    return { points: pg, lines: lg }
  }, [quality.stars])

  useEffect(
    () => () => {
      points.dispose()
      lines.dispose()
    },
    [points, lines],
  )

  useFrame(({ camera }, dt) => {
    const target = clamp(Math.abs(store.vel) * 0.0009, 0, 0.6)
    len.current = damp(len.current, target, 7.5, Math.min(dt, 0.05))
    const l = streak.current
    if (!l) return
    const on = len.current > 0.015
    if (l.visible !== on) l.visible = on
    if (!on) return
    camera.getWorldDirection(dir)
    uniforms.uDir.value.copy(dir)
    // moving forward → trails extend away from the camera; backwards → toward it
    uniforms.uLen.value = len.current * 24 * Math.sign(store.vel || 1)
    uniforms.uOpacity.value = Math.min(1, len.current * 2.2)
  })

  return (
    <>
      <points geometry={points} frustumCulled={false}>
        <pointsMaterial color={COLOR.bone} size={0.15} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
      </points>
      <lineSegments ref={streak} geometry={lines} frustumCulled={false} visible={false}>
        <primitive object={streakMat} attach="material" />
      </lineSegments>
    </>
  )
}
