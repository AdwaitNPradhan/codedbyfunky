'use client'

import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import type { SiteData } from '@/lib/types'
import type { Quality } from '../lib/config'
import type { OrbitApi, Store } from '../lib/store'
import type { Route } from '../lib/world'
import { Beacon } from './Beacon'
import { Cabinets } from './Cabinets'
import { Constellation } from './Constellation'
import { Helix } from './Helix'
import { Monoliths } from './Monoliths'
import { Moon } from './Moon'
import { CameraRig, FogRig, Stars } from './Rig'
import { SceneContext } from './shared'
import { Sun } from './Sun'

type Props = {
  data: SiteData
  store: Store
  api: OrbitApi
  quality: Quality
  route: Route
  onReady: () => void
}

/**
 * The whole 3D world. This module (three + r3f + drei + postprocessing) is the lazy chunk.
 * Quality steps down on its own: PerformanceMonitor lowers DPR first, then drops post-processing.
 */
export default function Scene({ data, store, api, quality, route, onReady }: Props) {
  const maxDpr = quality.dpr[1]
  const [dpr, setDpr] = useState(() => Math.min(maxDpr, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))
  const [post, setPost] = useState(quality.post)
  const ctx = useMemo(() => ({ data, store, api, quality }), [data, store, api, quality])

  // pointer ring is the cursor; hide any leftover label when the scene goes away
  useEffect(() => () => store.cursor(null), [store])

  return (
    <Canvas
      dpr={dpr}
      frameloop="always"
      gl={{ antialias: !quality.post, alpha: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 50, near: 0.1, far: 240, position: [0, 0.4, 40] }}
      style={{ position: 'absolute', inset: 0 }}
      resize={{ scroll: false, debounce: 80 }}
    >
      <SceneContext.Provider value={ctx}>
        <PerformanceMonitor
          bounds={() => [45, 58]}
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
          onFallback={() => {
            setDpr(1)
            setPost(false)
          }}
        />
        <FogRig />
        <CameraRig route={route} onReady={onReady} />
        <Stars />
        <Sun />
        <Monoliths />
        <Helix />
        <Cabinets />
        <Moon />
        <Constellation />
        <Beacon />
        {post && (
          <EffectComposer multisampling={0}>
            <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.6} mipmapBlur />
            <Noise opacity={0.04} />
            <Vignette offset={0.3} darkness={0.6} />
          </EffectComposer>
        )}
      </SceneContext.Provider>
    </Canvas>
  )
}
