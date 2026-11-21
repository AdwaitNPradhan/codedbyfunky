'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Game } from '@/lib/types'
import { flightGames } from '../lib/items'
import { imgUrl } from '../lib/util'
import { cabinetX, Z } from '../lib/world'
import { COLOR, coverCrop, damp, hdr, StationGroup, useHit, useReach, useScene, useShader, useTextures } from './shared'

const bodyGeo = new THREE.BoxGeometry(2.1, 3.7, 1.6)
const bodyEdges = new THREE.EdgesGeometry(bodyGeo)
const screenGeo = new THREE.PlaneGeometry(1.62, 1.22)
const marqueeGeo = new THREE.PlaneGeometry(1.9, 0.4)
const panelGeo = new THREE.BoxGeometry(2.0, 0.18, 0.8)
const panelEdges = new THREE.EdgesGeometry(panelGeo)

const screenVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const screenFrag = /* glsl */ `
  uniform sampler2D uTex; uniform float uHasTex; uniform vec3 uColor; uniform float uTime; uniform float uLit; uniform vec4 uCrop;
  varying vec2 vUv;
  void main(){
    vec3 base = uHasTex > 0.5 ? texture2D(uTex, vUv * uCrop.xy + uCrop.zw).rgb : uColor * 0.35;
    float scan = 0.86 + 0.14 * sin(vUv.y * 240.0 + uTime * 5.0);
    float flick = 0.975 + 0.025 * sin(uTime * 37.0);
    float vig = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    vec3 col = base * scan * flick * (0.5 + 0.7 * uLit) + uColor * 0.1 * uLit;
    gl_FragColor = vec4(col * mix(0.6, 1.0, vig), 1.0);
    #include <colorspace_fragment>
  }`

function Cabinet({ k, n, game, tex }: { k: number; n: number; game: Game; tex: THREE.Texture | null }) {
  const { store, api } = useScene()
  const x = cabinetX(k, n)
  const z = Z.games - Math.abs(x) * 0.16
  const accent = game.accent ?? COLOR.mint
  const root = useRef<THREE.Group>(null)
  const edge = useRef<THREE.LineBasicMaterial>(null)
  const marquee = useRef<THREE.MeshBasicMaterial>(null)
  const st = useRef({ lift: 0, scale: 1, lit: 0.2 })
  const color = useMemo(() => new THREE.Color(accent), [accent])
  const marqueeColor = useMemo(() => hdr(accent, 1.7), [accent])
  const uniforms = useMemo(
    () => ({ uTex: { value: null as THREE.Texture | null }, uHasTex: { value: 0 }, uColor: { value: color }, uTime: { value: 0 }, uLit: { value: 0.2 }, uCrop: { value: new THREE.Vector4(1, 1, 0, 0) } }),
    [color],
  )
  const screenMat = useShader(screenVert, screenFrag, uniforms)
  const { hovered, handlers } = useHit('PLAY', () => (store.idx.game === k ? api.playGame(k) : api.toItem('game', k)))

  useEffect(() => {
    uniforms.uTex.value = tex
    uniforms.uHasTex.value = tex ? 1 : 0
    if (tex) {
      coverCrop(tex, 1.62 / 1.22)
      uniforms.uCrop.value.set(tex.repeat.x, tex.repeat.y, tex.offset.x, tex.offset.y)
      // the custom shader samples by hand; keep the texture's own transform out of it
      tex.repeat.set(1, 1)
      tex.offset.set(0, 0)
    }
  }, [tex, uniforms])

  useFrame(({ clock }, dt) => {
    dt = Math.min(dt, 0.05)
    const s = st.current
    const active = store.idx.game === k
    const hot = hovered.current || store.hover === `game:${k}`
    s.lift = damp(s.lift, hot ? 0.18 : active ? 0.08 : 0, 7, dt)
    s.scale = damp(s.scale, hot ? 1.06 : 1, 7, dt)
    s.lit = damp(s.lit, active || hot ? 1 : 0.15, 5, dt)
    if (root.current) {
      root.current.position.y = s.lift
      root.current.scale.setScalar(s.scale)
    }
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uLit.value = s.lit
    if (edge.current) edge.current.opacity = 0.3 + s.lit * 0.6
    if (marquee.current) marquee.current.color.copy(marqueeColor).multiplyScalar(0.25 + s.lit * 0.75)
  })

  return (
    <group position={[x, 0, z]} rotation={[0, Math.atan2(-x, Z.games + 18 - z), 0]}>
      <group ref={root} {...handlers}>
        <mesh geometry={bodyGeo} position={[0, 1.85, 0]}>
          <meshBasicMaterial color="#12162a" />
        </mesh>
        <lineSegments geometry={bodyEdges} position={[0, 1.85, 0]}>
          <lineBasicMaterial ref={edge} color={accent} transparent opacity={0.5} />
        </lineSegments>
        <mesh geometry={screenGeo} position={[0, 2.5, 0.81]}>
          <primitive object={screenMat} attach="material" />
        </mesh>
        <mesh geometry={marqueeGeo} position={[0, 3.38, 0.81]}>
          <meshBasicMaterial ref={marquee} color={marqueeColor} toneMapped={false} />
        </mesh>
        <group position={[0, 1.3, 1.0]} rotation={[-0.35, 0, 0]}>
          <mesh geometry={panelGeo}>
            <meshBasicMaterial color="#0d1020" />
          </mesh>
          <lineSegments geometry={panelEdges}>
            <lineBasicMaterial color={accent} transparent opacity={0.45} />
          </lineSegments>
        </group>
      </group>
      {/* floor glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.4]}>
        <ringGeometry args={[1.3, 1.34, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Station 4 · games: an arc of wire cabinets whose screens show each game's cover. */
export function Cabinets() {
  const { data, quality } = useScene()
  const games = useMemo(() => flightGames(data), [data])
  const on = useReach(3)
  const urls = useMemo(() => games.map((g) => (g.cover ? imgUrl(g.cover, quality.mobile ? 'thumb' : 'card') : null)), [games, quality.mobile])
  const texs = useTextures(urls, on)
  useEffect(
    () => () => {
      for (const g of [bodyGeo, bodyEdges, screenGeo, marqueeGeo, panelGeo, panelEdges]) g.dispose()
    },
    [],
  )
  if (!games.length) return null
  return (
    <StationGroup i={3} span={0.95}>
      {games.map((g, k) => (
        <Cabinet key={g.id} k={k} n={games.length} game={g} tex={texs[k] ?? null} />
      ))}
    </StationGroup>
  )
}
