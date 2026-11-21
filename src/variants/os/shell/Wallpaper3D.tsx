'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

type Pal = { far: THREE.Color; near: THREE.Color; sky: THREE.Color; accent: THREE.Color }

const readPal = (): Pal => {
  const cs = getComputedStyle(document.querySelector('[data-os-root]') ?? document.body)
  const c = (v: string, d: string) => new THREE.Color(cs.getPropertyValue(v).trim() || d)
  return { far: c('--desk-3', '#4b8a8a'), near: c('--desk-1', '#123'), sky: c('--desk-2', '#2c5b63'), accent: c('--accent', '#ff6b35') }
}

/** Smooth ridged noise from a few sines. Deterministic, so no random seed to sync. */
const ridge = (x: number, z: number) =>
  Math.abs(Math.sin(x * 0.35 + 1.3) * 0.6 + Math.sin(x * 0.9 + z * 0.4) * 0.3 + Math.sin(z * 0.5 - x * 0.2) * 0.25)

function Terrain({ pal }: { pal: Pal }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(64, 34, 96, 52)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const col = new Float32Array(pos.count * 3)
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // Valley in the middle front, mountains rising toward the back and the sides.
      const back = THREE.MathUtils.smoothstep(-z, -6, 16)
      const side = THREE.MathUtils.smoothstep(Math.abs(x), 6, 26)
      const h = ridge(x, z) * (1.2 + back * 7 + side * 3) - 0.8
      pos.setY(i, h)
      const t = THREE.MathUtils.clamp((h + 0.8) / 6, 0, 1)
      tmp.copy(pal.near).lerp(pal.far, t).lerp(pal.sky, back * 0.55)
      col.set([tmp.r, tmp.g, tmp.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [pal])
  return (
    <mesh geometry={geo} position={[0, -1, 0]}>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  )
}

function Crystals({ pal }: { pal: Pal }) {
  const group = useRef<THREE.Group>(null)
  const spots = useMemo<[number, number, number, number][]>(
    () => [
      [-7, 5.4, -14, 0.8],
      [3, 6.6, -16, 0.6],
      [9, 5.2, -13, 0.9],
    ],
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    group.current?.children.forEach((m, i) => {
      m.rotation.y = t * (0.25 + i * 0.07)
      m.position.y = spots[i][1] + Math.sin(t * 0.6 + i * 1.7) * 0.35
    })
  })
  return (
    <group ref={group}>
      {spots.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={s}>
          <octahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={i % 2 ? pal.accent : '#ffd166'} flatShading emissive={i % 2 ? pal.accent : '#ffd166'} emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/** Camera drifts a little by itself and follows the cursor. */
function Rig() {
  const mouse = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const on = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [])
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime
    const tx = mouse.current.x * 2.2 + Math.sin(t * 0.15) * 0.8
    const ty = 3.4 - mouse.current.y * 0.7
    camera.position.x += (tx - camera.position.x) * 0.04
    camera.position.y += (ty - camera.position.y) * 0.04
    camera.lookAt(0, 1.8, -4)
  })
  return null
}

/** A low-poly landscape that follows the cursor. Drawn at low resolution so it matches the pixel look. */
export default function Wallpaper3D({ paused }: { paused: boolean }) {
  const pal = useMemo(readPal, [])
  return (
    <Canvas
      aria-hidden="true"
      frameloop={paused ? 'never' : 'always'}
      dpr={0.55}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 3.4, 12], fov: 48, near: 0.1, far: 80 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', imageRendering: 'pixelated' }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 9, 4]} intensity={1.7} />
      <Terrain pal={pal} />
      <Crystals pal={pal} />
      <Rig />
    </Canvas>
  )
}
