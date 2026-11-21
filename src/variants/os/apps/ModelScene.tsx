'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'

/** Arduino Uno by M Ferrieu, CC BY (credit in docs/CREDITS.md). Meshopt + WebP, no Draco or KTX2. */
export const BOARD_MODEL = '/models/arduino-uno-v1.glb'
const SIZE = 4.2 // the long side of the board, in scene units

function Board() {
  // useDraco = false, useMeshopt = true: both decoders ship in the bundle, nothing loads from a CDN.
  const gltf = useGLTF(BOARD_MODEL, false, true)
  const { scene, k, at } = useMemo(() => {
    const s = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(s)
    const size = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    return { scene: s, k: SIZE / Math.max(size.x, size.z, 1e-6), at: c }
  }, [gltf.scene])
  return (
    <group scale={k}>
      <primitive object={scene} position={[-at.x, -at.y, -at.z]} />
    </group>
  )
}

/** Step back on a tall, narrow canvas (a phone) so the whole board is in view. */
function Fit() {
  const { camera, size } = useThree()
  useEffect(() => {
    const a = size.width / size.height
    camera.position.setLength(a >= 1.3 ? 8 : 8 + (1.3 - a) * 7)
  }, [camera, size.width, size.height])
  return null
}

/** A real 3D model of a dev board that the visitor can turn and zoom. */
export default function ModelScene({ autoRotate, simple }: { autoRotate: boolean; simple: boolean }) {
  return (
    <Canvas
      role="img"
      aria-label="3D model of an Arduino Uno board. Drag to turn it, scroll or pinch to zoom."
      dpr={simple ? 1 : [1, 1.75]}
      frameloop={autoRotate ? 'always' : 'demand'}
      gl={{ antialias: !simple, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [4.6, 4.2, 6], fov: 36 }}
      style={{ touchAction: 'none' }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#cfe8ff', '#2a2a30', 0.7]} />
      <directionalLight position={[5, 8, 4]} intensity={1.7} />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} />
      <Fit />
      <Suspense fallback={null}>
        <Board />
      </Suspense>
      <OrbitControls
        enableDamping
        enablePan={false}
        minDistance={3}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
      />
    </Canvas>
  )
}
