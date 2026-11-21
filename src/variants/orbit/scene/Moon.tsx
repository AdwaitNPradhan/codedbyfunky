'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { HardwareProject } from '@/lib/types'
import { flightHardware } from '../lib/items'
import { rng } from '../lib/util'
import { hwCenter } from '../lib/world'
import { COLOR, damp, hdr, StationGroup, useHit, useScene, useShader } from './shared'

const chipBox = new THREE.BoxGeometry(1.7, 0.3, 1.7)
const chipEdges = new THREE.EdgesGeometry(chipBox)
const hubBox = new THREE.BoxGeometry(2.6, 0.34, 2.6)
const hubEdges = new THREE.EdgesGeometry(hubBox)
const decorBox = new THREE.BoxGeometry(0.9, 0.16, 0.45)

const R = 8.4
const CHIP_R = 5.3

type Trace = { pts: [number, number][]; item: number; dashed: boolean }

/** Manhattan route: x first, then y. */
function route(a: [number, number], b: [number, number], flip: boolean): [number, number][] {
  return flip ? [a, [a[0], b[1]], b] : [a, [b[0], a[1]], b]
}

function buildTraces(items: HardwareProject[], mobile: boolean) {
  const r = rng(21)
  const traces: Trace[] = []
  const chipPos: [number, number][] = items.map((_, i) => {
    const a = (i / Math.max(items.length, 1)) * Math.PI * 2 + 0.4
    return [Math.cos(a) * CHIP_R, Math.sin(a) * CHIP_R]
  })
  items.forEach((h, i) => traces.push({ pts: route([0, 0], chipPos[i], i % 2 === 0), item: i, dashed: h.status === 'planned' }))
  const decor = mobile ? 16 : 34
  for (let i = 0; i < decor; i++) {
    const a = r() * Math.PI * 2
    const ra = 1.8 + r() * (R - 2.6)
    const start: [number, number] = [Math.cos(a) * ra, Math.sin(a) * ra]
    const a2 = a + (r() - 0.5) * 1.4
    const rb = 1.8 + r() * (R - 2.6)
    const end: [number, number] = [Math.cos(a2) * rb, Math.sin(a2) * rb]
    traces.push({ pts: route(start, end, r() > 0.5), item: -1, dashed: false })
  }
  // geometry: LineSegments pairs with distance-along-path attributes
  const pos: number[] = []
  const aT: number[] = []
  const aD: number[] = []
  const aItem: number[] = []
  const aDash: number[] = []
  for (const t of traces) {
    let total = 0
    for (let i = 1; i < t.pts.length; i++) total += Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])
    let acc = 0
    for (let i = 1; i < t.pts.length; i++) {
      const [x0, y0] = t.pts[i - 1]
      const [x1, y1] = t.pts[i]
      const seg = Math.hypot(x1 - x0, y1 - y0)
      pos.push(x0, y0, 0, x1, y1, 0)
      aT.push(acc / total, (acc + seg) / total)
      aD.push(acc, acc + seg)
      aItem.push(t.item, t.item)
      aDash.push(t.dashed ? 1 : 0, t.dashed ? 1 : 0)
      acc += seg
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1))
  g.setAttribute('aD', new THREE.Float32BufferAttribute(aD, 1))
  g.setAttribute('aItem', new THREE.Float32BufferAttribute(aItem, 1))
  g.setAttribute('aDash', new THREE.Float32BufferAttribute(aDash, 1))
  const decorChips: [number, number, number][] = []
  for (let i = 0; i < (mobile ? 8 : 16); i++) {
    const a = r() * Math.PI * 2
    const ra = 1.6 + r() * (R - 2.4)
    decorChips.push([Math.cos(a) * ra, Math.sin(a) * ra, r() > 0.5 ? 0 : Math.PI / 2])
  }
  return { geo: g, chipPos, decorChips }
}

const traceVert = /* glsl */ `
  attribute float aT; attribute float aD; attribute float aItem; attribute float aDash;
  varying float vT; varying float vD; varying float vItem; varying float vDash;
  void main(){ vT = aT; vD = aD; vItem = aItem; vDash = aDash; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const traceFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uPulse; uniform float uActive;
  varying float vT; varying float vD; varying float vItem; varying float vDash;
  void main(){
    float dash = vDash > 0.5 ? step(0.5, fract(vD * 0.8)) : 1.0;
    float d = abs(vT - uPulse); d = min(d, 1.0 - d);
    float pulse = smoothstep(0.16, 0.0, d);
    float act = 1.0 - step(0.5, abs(vItem - uActive));
    float a = (0.28 + 0.72 * pulse + 0.55 * act) * dash;
    vec3 c = uColor * (0.7 + 1.7 * pulse + 1.1 * act);
    gl_FragColor = vec4(c, a);
    #include <colorspace_fragment>
  }`

function Chip({ i, h, pos }: { i: number; h: HardwareProject; pos: [number, number] }) {
  const { store, api } = useScene()
  const g = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const st = useRef({ lift: 0, lit: 0 })
  const planned = h.status === 'planned'
  const base = useMemo(() => hdr(h.status === 'in-progress' ? COLOR.amber : COLOR.teal, 1.8), [h.status])
  const { hovered, handlers } = useHit('VIEW', () => api.toItem('hw', i))
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const s = st.current
    const active = store.idx.hw === i
    const hot = hovered.current || store.hover === `hw:${i}`
    s.lift = damp(s.lift, hot ? 0.5 : active ? 0.3 : 0, 7, dt)
    s.lit = damp(s.lit, active || hot ? 1 : 0.2, 6, dt)
    if (g.current) g.current.position.z = 0.16 + s.lift
    if (mat.current) mat.current.color.copy(base).multiplyScalar(0.12 + s.lit * 0.88)
  })
  return (
    <group ref={g} position={[pos[0], pos[1], 0.16]} {...handlers}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={chipBox} attach="geometry" />
        <meshBasicMaterial ref={mat} color="#000" toneMapped={false} transparent opacity={planned ? 0.25 : 1} wireframe={planned} />
      </mesh>
      <lineSegments rotation={[Math.PI / 2, 0, 0]} geometry={chipEdges}>
        <lineBasicMaterial color={COLOR.bone} transparent opacity={planned ? 0.35 : 0.6} />
      </lineSegments>
    </group>
  )
}

/** Station 5 · hardware: a tilted PCB with traces, pulses every 3s and one chip per build. */
export function Moon() {
  const { data, store, quality } = useScene()
  const items = useMemo(() => flightHardware(data), [data])
  const built = useMemo(() => buildTraces(items, quality.mobile), [items, quality.mobile])
  const [cx, cy, cz] = hwCenter(quality.mobile)
  const uniforms = useMemo(() => ({ uColor: { value: hdr(COLOR.teal, 1) }, uPulse: { value: 0 }, uActive: { value: 0 } }), [])
  const traceMat = useShader(traceVert, traceFrag, uniforms, { transparent: true, depthWrite: false })
  const decor = useRef<THREE.InstancedMesh>(null)
  const board = useRef<THREE.Group>(null)

  useEffect(() => {
    const m = decor.current
    if (!m) return
    const o = new THREE.Object3D()
    built.decorChips.forEach(([x, y, rot], i) => {
      o.position.set(x, y, 0.1)
      o.rotation.set(Math.PI / 2, 0, rot)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [built])
  useEffect(() => () => built.geo.dispose(), [built])
  useEffect(
    () => () => {
      for (const g of [chipBox, chipEdges, hubBox, hubEdges, decorBox]) g.dispose()
    },
    [],
  )

  useFrame(({ clock }, dt) => {
    uniforms.uPulse.value = (clock.elapsedTime % 3) / 3
    uniforms.uActive.value = store.idx.hw
    if (board.current) board.current.rotation.z = damp(board.current.rotation.z, store.local[4] * 0.9, 2.5, Math.min(dt, 0.05))
  })
  if (!items.length) return null
  return (
    <StationGroup i={4} span={0.95}>
      <group position={[cx, cy, cz]} rotation={[-0.62, quality.mobile ? 0 : -0.3, 0]}>
        <group ref={board}>
          <mesh>
            <circleGeometry args={[R, 96]} />
            <meshBasicMaterial color="#0a1a1d" />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <ringGeometry args={[R - 0.06, R, 128]} />
            <meshBasicMaterial color={COLOR.teal} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <ringGeometry args={[R * 0.55, R * 0.555, 96]} />
            <meshBasicMaterial color={COLOR.teal} transparent opacity={0.18} />
          </mesh>
          <lineSegments geometry={built.geo} position={[0, 0, 0.05]}>
            <primitive object={traceMat} attach="material" />
          </lineSegments>
          {/* hub */}
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <primitive object={hubBox} attach="geometry" />
            <meshBasicMaterial color="#10262a" />
          </mesh>
          <lineSegments position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} geometry={hubEdges}>
            <lineBasicMaterial color={COLOR.teal} />
          </lineSegments>
          <instancedMesh ref={decor} args={[undefined, undefined, built.decorChips.length]}>
            <primitive object={decorBox} attach="geometry" />
            <meshBasicMaterial color="#16363a" />
          </instancedMesh>
          {items.map((h, i) => (
            <Chip key={h.id} i={i} h={h} pos={built.chipPos[i]} />
          ))}
        </group>
      </group>
    </StationGroup>
  )
}
