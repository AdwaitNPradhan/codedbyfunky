'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sunPos } from '../lib/world'
import { COLOR, damp, hdr, StationGroup, useHit, useScene } from './shared'

/** Station 1 · dock: wireframe sun, two thin rings and a hot core. Click it to start the flight. */
export function Sun() {
  const { api, quality } = useScene()
  const [x, y, z] = sunPos(quality.mobile)
  const root = useRef<THREE.Group>(null)
  const sphere = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const ringA = useRef<THREE.Mesh>(null)
  const ringB = useRef<THREE.Mesh>(null)
  const scale = useRef(1)
  const coreColor = useMemo(() => hdr(COLOR.solar, 2.6), [])
  const { hovered, handlers } = useHit('FLY', () => api.toStation(1))

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (sphere.current) {
      sphere.current.rotation.y = t * 0.08
      sphere.current.rotation.x = t * 0.03
    }
    if (ringA.current) ringA.current.rotation.z = t * 0.05
    if (ringB.current) ringB.current.rotation.z = -t * 0.035
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06)
    scale.current = damp(scale.current, hovered.current ? 1.06 : 1, 8, Math.min(dt, 0.05))
    if (root.current) {
      root.current.scale.setScalar(scale.current * (quality.mobile ? 0.8 : 1))
      root.current.position.y = y + Math.sin(t * 0.4) * 0.12
    }
  })

  return (
    <StationGroup i={0} span={1.0}>
      <group ref={root} position={[x, y, z]}>
        <mesh ref={sphere}>
          <icosahedronGeometry args={[4.2, quality.mobile ? 2 : 3]} />
          <meshBasicMaterial color={COLOR.solar} wireframe transparent opacity={0.4} depthWrite={false} />
        </mesh>
        <mesh ref={core}>
          <icosahedronGeometry args={[1.05, 3]} />
          <meshBasicMaterial color={coreColor} toneMapped={false} />
        </mesh>
        <mesh ref={ringA} rotation={[1.25, 0.2, 0]}>
          <torusGeometry args={[7.6, 0.018, 6, 220]} />
          <meshBasicMaterial color={COLOR.ice} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh ref={ringB} rotation={[0.72, 0.55, 0]}>
          <torusGeometry args={[10.4, 0.014, 6, 260]} />
          <meshBasicMaterial color={COLOR.ice} transparent opacity={0.35} depthWrite={false} />
        </mesh>
        {/* generous invisible hit target */}
        <mesh {...handlers} visible={false}>
          <sphereGeometry args={[5, 12, 12]} />
        </mesh>
      </group>
    </StationGroup>
  )
}
