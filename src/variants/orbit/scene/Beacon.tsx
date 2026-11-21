'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../lib/util'
import { contactWindow } from '../lib/world'
import { COLOR, damp, StationGroup, useHit, useScene, useShader } from './shared'

const glassFrag = /* glsl */ `
  uniform float uTime; uniform float uGlow; varying vec2 vUv;
  void main(){
    vec3 top = vec3(1.0, 0.70, 0.28);
    vec3 bot = vec3(1.0, 0.43, 0.24);
    vec3 c = mix(bot, top, vUv.y);
    float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
    float flick = 0.96 + 0.04 * sin(uTime * 2.3) * sin(uTime * 7.1);
    c *= (1.15 + 0.5 * uGlow) * flick * mix(0.55, 1.0, edge);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`
const plainVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const spillFrag = /* glsl */ `
  uniform float uGlow; varying vec2 vUv;
  void main(){
    vec2 p = vUv - vec2(0.5, 1.0);
    float d = length(p * vec2(1.0, 0.8));
    float a = smoothstep(0.75, 0.0, d) * (0.32 + 0.3 * uGlow);
    gl_FragColor = vec4(vec3(1.0, 0.55, 0.25) * a, a);
    #include <colorspace_fragment>
  }`

const W = 5.4
const H = 7.0
const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const boxEdges = new THREE.EdgesGeometry(boxGeo)

/** Station 7 · contact: a warm lit window. Pulses when the form sends. Click to start writing. */
export function Beacon() {
  const { store, quality } = useScene()
  const [wx, wy, wz] = contactWindow
  const root = useRef<THREE.Group>(null)
  const dust = useRef<THREE.Points>(null)
  const uGlass = useMemo(() => ({ uTime: { value: 0 }, uGlow: { value: 0 } }), [])
  const uSpill = useMemo(() => ({ uGlow: { value: 0 } }), [])
  const glassMat = useShader(plainVert, glassFrag, uGlass)
  const spillMat = useShader(plainVert, spillFrag, uSpill, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const glow = useRef(0)
  const { hovered, handlers } = useHit('WRITE', () => document.getElementById('orbit-name')?.focus())

  const dustGeo = useMemo(() => {
    const n = quality.mobile ? 50 : 130
    const r = rng(33)
    const p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      p[i * 3] = (r() - 0.5) * 9
      p[i * 3 + 1] = r() * 8 - 2
      p[i * 3 + 2] = r() * 12
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [quality.mobile])
  useEffect(() => () => dustGeo.dispose(), [dustGeo])

  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 0.05)
    const t = clock.elapsedTime
    const since = (performance.now() - store.pulse) / 900
    // 1 → 1.4 → 1 over 0.9s (sine in/out)
    const pulse = since >= 0 && since <= 1 ? 1 + 0.4 * Math.sin(Math.PI * since) : 1
    glow.current = damp(glow.current, hovered.current ? 0.7 : since >= 0 && since <= 1 ? 1 : 0, 6, dt)
    uGlass.uTime.value = t
    uGlass.uGlow.value = glow.current
    uSpill.uGlow.value = glow.current
    if (root.current) root.current.scale.setScalar(pulse)
    const d = dust.current
    if (d) {
      const p = (d.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] += dt * 0.12
        p[i] += Math.sin(t * 0.3 + i) * dt * 0.05
        if (p[i + 1] > 6) p[i + 1] = -2
      }
      ;(d.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    }
  })

  const frame = (key: string, pos: [number, number, number], size: [number, number, number], edges = false) => (
    <group key={key} position={pos} scale={size}>
      <mesh geometry={boxGeo}>
        <meshBasicMaterial color="#0d0f19" />
      </mesh>
      {edges && (
        <lineSegments geometry={boxEdges}>
          <lineBasicMaterial color={COLOR.bone} transparent opacity={0.35} />
        </lineSegments>
      )}
    </group>
  )

  return (
    <StationGroup i={6} span={0.95}>
      <group position={[wx, wy, wz]}>
        <group ref={root} {...handlers}>
          <mesh>
            <planeGeometry args={[W, H]} />
            <primitive object={glassMat} attach="material" />
          </mesh>
          {/* mullions */}
          {frame('mv', [0, 0, 0.05], [0.16, H, 0.12], true)}
          {frame('mh1', [0, H / 6, 0.05], [W, 0.14, 0.12], true)}
          {frame('mh2', [0, -H / 6, 0.05], [W, 0.14, 0.12], true)}
          {/* wall frame */}
          {frame('wt', [0, H / 2 + 6, 0], [60, 12, 1.2])}
          {frame('wb', [0, -H / 2 - 6, 0], [60, 12, 1.2])}
          {frame('wl', [-W / 2 - 15, 0, 0], [30, H + 0.02, 1.2])}
          {frame('wr', [W / 2 + 15, 0, 0], [30, H + 0.02, 1.2])}
        </group>
        {/* light spilling onto the floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -wy - 1.4 + 0, 11]} renderOrder={2}>
          <planeGeometry args={[16, 22]} />
          <primitive object={spillMat} attach="material" />
        </mesh>
        <points ref={dust} geometry={dustGeo} position={[0, -1, 1]} renderOrder={3}>
          <pointsMaterial color={COLOR.amber} size={0.09} sizeAttenuation transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>
    </StationGroup>
  )
}

