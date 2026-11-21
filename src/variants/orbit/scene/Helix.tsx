'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Photo } from '@/lib/types'
import { flightPhotos } from '../lib/items'
import { clamp, imgUrl } from '../lib/util'
import { photoZ } from '../lib/world'
import { COLOR, damp, StationGroup, useHit, useReach, useScene, useTextures } from './shared'

const unit = new THREE.PlaneGeometry(1, 1)
const unitEdges = new THREE.EdgesGeometry(unit)

function Frame({ j, photo, tex, n, layout }: { j: number; photo: Photo; tex: THREE.Texture | null; n: number; layout: Layout }) {
  const { store, api } = useScene()
  const g = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const edge = useRef<THREE.LineBasicMaterial>(null)
  const s = useRef({ scale: 1, bright: 0.5, fade: 0 })
  const { hovered, handlers } = useHit('VIEW', () => (Math.round(store.local[2] * (n - 1)) === j ? api.openPhoto(j) : api.toItem('photo', j)))
  const aspect = photo.image.width / photo.image.height
  const w = aspect > layout.box[0] / layout.box[1] ? layout.box[0] : layout.box[1] * aspect
  const h = w / aspect
  const look = useMemo(() => new THREE.Vector3(), [])
  // adding a map after first compile needs a shader rebuild
  useEffect(() => {
    if (mat.current) mat.current.needsUpdate = true
  }, [tex])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const o = g.current
    if (!o) return
    const a = store.local[2] * (n - 1) // float active index
    const d = Math.abs(j - a)
    const wgt = Math.pow(Math.max(0, 1 - d), 2) // 1 for the active frame
    const ang = layout.theta0 + (j - a) * layout.dTheta
    const px = THREE.MathUtils.lerp(layout.R * Math.cos(ang), layout.spot[0], wgt)
    const py = THREE.MathUtils.lerp(layout.R * Math.sin(ang) * 0.78, layout.spot[1], wgt)
    o.position.set(px, py, photoZ(j))
    look.set(px * 0.25, py * 0.25, photoZ(j) + 14)
    o.lookAt(look)
    const hot = hovered.current || store.hover === `photo:${j}`
    const st = s.current
    st.scale = damp(st.scale, (wgt > 0.5 ? 1.12 : 1) * (hot ? 1.06 : 1), 7, dt)
    st.bright = damp(st.bright, clamp(0.55 + wgt * 0.45 + (hot ? 0.2 : 0)), 6, dt)
    st.fade = damp(st.fade, tex ? 1 : 0, 3, dt)
    o.scale.set(w * st.scale, h * st.scale, 1)
    if (mat.current) mat.current.color.setScalar(st.bright * st.fade)
    if (edge.current) edge.current.opacity = 0.25 + wgt * 0.6
  })

  return (
    <group ref={g} {...handlers}>
      <mesh geometry={unit}>
        <meshBasicMaterial ref={mat} map={tex} color="#000000" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={unitEdges} scale={[1.012, 1.012, 1]}>
        <lineBasicMaterial ref={edge} color={COLOR.bone} transparent opacity={0.4} />
      </lineSegments>
    </group>
  )
}

type Layout = { R: number; dTheta: number; theta0: number; spot: [number, number]; box: [number, number] }

/** The aperture: rings the camera flies through, tied to scroll. */
function Iris() {
  const { store } = useScene()
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const q = store.local[2]
    if (a.current) a.current.rotation.z = q * 3.2
    if (b.current) b.current.rotation.z = -q * 2.2
  })
  return (
    <group position={[0, 0, photoZ(0) + 8]}>
      <mesh ref={a}>
        <torusGeometry args={[8.2, 0.025, 6, 140]} />
        <meshBasicMaterial color={COLOR.bone} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={b}>
        <torusGeometry args={[6.4, 0.018, 6, 140]} />
        <meshBasicMaterial color={COLOR.ice} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Station 3 · photography: frames spiral around the flight axis; the active one is lifted into view. */
export function Helix() {
  const { data, quality } = useScene()
  const photos = useMemo(() => flightPhotos(data), [data])
  const n = photos.length
  const on = useReach(2)
  const urls = useMemo(() => photos.map((p) => imgUrl(p.image, quality.mobile ? 'thumb' : 'card')), [photos, quality.mobile])
  const texs = useTextures(urls, on)
  const layout: Layout = useMemo(
    () =>
      quality.mobile
        ? { R: 2.9, dTheta: (Math.PI * 2) / Math.max(n, 6), theta0: -1.2, spot: [0, 0.1], box: [3.9, 2.8] }
        : { R: 5.4, dTheta: (Math.PI * 2) / Math.max(n, 8), theta0: Math.PI + 0.3, spot: [-3.5, -0.5], box: [5.4, 3.7] },
    [n, quality.mobile],
  )
  useEffect(
    () => () => {
      unit.dispose()
      unitEdges.dispose()
    },
    [],
  )
  if (!n) return null
  return (
    <StationGroup i={2} span={0.95}>
      <Iris />
      {photos.map((p, j) => (
        <Frame key={p.id} j={j} photo={p} tex={texs[j] ?? null} n={n} layout={layout} />
      ))}
    </StationGroup>
  )
}
