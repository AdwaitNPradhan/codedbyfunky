'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Project } from '@/lib/types'
import { flightProjects } from '../lib/items'
import { imgUrl } from '../lib/util'
import { slabPos } from '../lib/world'
import { COLOR, coverCrop, damp, labelTexture, StationGroup, useHit, useReach, useScene, useTextures } from './shared'

const W = 3.5
const H = 5.3
const bodyGeo = new THREE.BoxGeometry(3.9, 5.7, 0.3)
const edgeGeo = new THREE.EdgesGeometry(bodyGeo)
const planeGeo = new THREE.PlaneGeometry(W, H)
const ringGeo = new THREE.RingGeometry(1.5, 1.54, 64)

function Slab({ k, project, tex }: { k: number; project: Project; tex: THREE.Texture | null }) {
  const { store, api, quality } = useScene()
  const [x, y, z] = slabPos(k)
  const root = useRef<THREE.Group>(null)
  const img = useRef<THREE.MeshBasicMaterial>(null)
  const edge = useRef<THREE.LineBasicMaterial>(null)
  const st = useRef({ lift: 0, scale: 1, bright: 0.55, fade: 0 })
  const { hovered, handlers } = useHit('OPEN', () => (store.idx.project === k ? api.openProject(project.slug) : api.toItem('project', k)))
  const fallback = useMemo(() => (project.cover ? null : labelTexture(project.title, project.accent ?? COLOR.solar)), [project])
  const map = tex ?? fallback

  useEffect(() => {
    if (tex) coverCrop(tex, W / H)
  }, [tex])
  // adding a map after first compile needs a shader rebuild
  useEffect(() => {
    if (img.current) img.current.needsUpdate = true
  }, [map])
  useEffect(() => () => fallback?.dispose(), [fallback])

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const s = st.current
    const active = store.idx.project === k
    const hot = hovered.current || store.hover === `project:${k}`
    s.lift = damp(s.lift, hot ? 0.15 : 0, 7, dt)
    s.scale = damp(s.scale, hot ? 1.06 : active ? 1.02 : 1, 7, dt)
    s.bright = damp(s.bright, active || hot ? 1 : 0.5, 5, dt)
    s.fade = damp(s.fade, map ? 1 : 0, 3, dt)
    if (root.current) {
      root.current.position.y = y + s.lift
      root.current.scale.setScalar(s.scale)
    }
    if (img.current) {
      img.current.color.setScalar(s.bright * s.fade)
    }
    if (edge.current) edge.current.opacity = 0.25 + s.bright * 0.55
  })

  const yaw = k % 2 ? -0.55 : 0.55
  return (
    <group ref={root} position={[x, y, z]} rotation={[0, yaw, 0]} {...handlers}>
      <mesh geometry={bodyGeo}>
        <meshBasicMaterial color="#141728" />
      </mesh>
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial ref={edge} color={COLOR.ice} transparent opacity={0.5} />
      </lineSegments>
      <mesh geometry={planeGeo} position={[0, 0, 0.16]}>
        <meshBasicMaterial ref={img} map={map} color="#000000" toneMapped={false} />
      </mesh>
      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.9 - 0.0, 0.2]}>
        <meshBasicMaterial color={COLOR.amber} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Station 2 · work: a field of tall cover-image slabs in two rows; the camera weaves between them. */
export function Monoliths() {
  const { data, quality } = useScene()
  const projects = useMemo(() => flightProjects(data), [data])
  const on = useReach(1)
  const urls = useMemo(() => projects.map((p) => (p.cover ? imgUrl(p.cover, quality.mobile ? 'thumb' : 'card') : null)), [projects, quality.mobile])
  const texs = useTextures(urls, on)
  return (
    <StationGroup i={1} span={0.95}>
      {projects.map((p, k) => (
        <Slab key={p.id} k={k} project={p} tex={texs[k] ?? null} />
      ))}
    </StationGroup>
  )
}
