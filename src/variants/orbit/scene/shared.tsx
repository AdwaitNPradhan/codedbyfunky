'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SiteData } from '@/lib/types'
import type { Quality } from '../lib/config'
import type { OrbitApi, Store } from '../lib/store'

export type SceneCtx = { data: SiteData; store: Store; api: OrbitApi; quality: Quality }
export const SceneContext = createContext<SceneCtx | null>(null)
export function useScene() {
  const c = useContext(SceneContext)
  if (!c) throw new Error('useScene outside <Scene>')
  return c
}

export const COLOR = {
  void: '#0A0B12',
  deep: '#11131E',
  bone: '#ECE8DF',
  mist: '#A7A9B8',
  solar: '#FF7A3D',
  ice: '#8FB8FF',
  mint: '#7CFFB2',
  teal: '#5FD0C5',
  amber: '#FFB347',
} as const

/** HDR colour: >1 channels survive (toneMapped=false) so Bloom can pick them up. */
export const hdr = (hex: string, k = 1) => {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return c
}

export const damp = THREE.MathUtils.damp

/** Show a set piece only while the camera is near its station (draw-call budget). */
export function StationGroup({ i, children, span = 1.35, ...rest }: { i: number; children: ReactNode; span?: number } & Omit<React.ComponentProps<'group'>, 'ref'>) {
  const { store } = useScene()
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const v = Math.abs(store.pos - i) < span
    if (g.visible !== v) g.visible = v
  })
  return (
    <group ref={ref} {...rest}>
      {children}
    </group>
  )
}

/** True once the camera is close enough to start loading this station's textures (previous station reached). */
export function useReach(station: number) {
  const { store } = useScene()
  const [on, setOn] = useState(station <= 1)
  useFrame(() => {
    if (!on && store.pos >= station - 1.25) setOn(true)
  })
  return on
}

/** Plain TextureLoader (no Suspense, no shared cache) so unmount really disposes. */
export function useTextures(urls: (string | null)[], enabled: boolean) {
  const [texs, setTexs] = useState<(THREE.Texture | null)[]>(() => urls.map(() => null))
  const key = urls.join('|')
  useEffect(() => {
    setTexs(urls.map(() => null))
    if (!enabled) return
    const loader = new THREE.TextureLoader()
    let dead = false
    const made: THREE.Texture[] = []
    urls.forEach((u, i) => {
      if (!u) return
      loader.load(u, (t) => {
        if (dead) {
          t.dispose()
          return
        }
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        made.push(t)
        setTexs((p) => {
          const n = p.slice()
          n[i] = t
          return n
        })
      })
    })
    return () => {
      dead = true
      made.forEach((t) => t.dispose())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key])
  return texs
}

/** Crop a texture to "cover" a plane of the given aspect (no stretching). */
export function coverCrop(t: THREE.Texture, planeAspect: number) {
  const img = t.image as { width: number; height: number } | undefined
  if (!img?.width) return
  const ia = img.width / img.height
  if (ia > planeAspect) {
    t.repeat.set(planeAspect / ia, 1)
    t.offset.set((1 - planeAspect / ia) / 2, 0)
  } else {
    t.repeat.set(1, ia / planeAspect)
    t.offset.set(0, (1 - ia / planeAspect) / 2)
  }
  t.needsUpdate = true
}

/** Canvas-drawn stand-in when a CMS item has no cover image. */
export function labelTexture(label: string, hex: string, w = 256, h = 384) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = COLOR.deep
  g.fillRect(0, 0, w, h)
  const grad = g.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, hex)
  grad.addColorStop(1, COLOR.deep)
  g.globalAlpha = 0.55
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  g.globalAlpha = 1
  g.fillStyle = COLOR.bone
  g.font = '700 28px system-ui, sans-serif'
  g.textBaseline = 'bottom'
  const words = label.split(' ')
  let line = ''
  const lines: string[] = []
  for (const wd of words) {
    if (g.measureText(line + ' ' + wd).width > w - 40 && line) {
      lines.push(line)
      line = wd
    } else line = line ? line + ' ' + wd : wd
  }
  lines.push(line)
  lines.forEach((l, i) => g.fillText(l, 20, h - 20 - (lines.length - 1 - i) * 32))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * ShaderMaterial built imperatively. <shaderMaterial uniforms={…}> in r3f does not keep your uniform
 * object, so per-frame updates to it never reach the shader; this guarantees the same object.
 */
export function useShader(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, { value: unknown }>,
  opts: THREE.ShaderMaterialParameters = {},
) {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, ...opts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uniforms],
  )
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

/** One set of hover handlers + cursor label for any clickable 3D object. */
export function useHit(label: string, onClick: () => void) {
  const { store } = useScene()
  const hovered = useRef(false)
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  return {
    hovered,
    handlers: {
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation()
        if (coarse) return
        hovered.current = true
        store.cursor(label)
      },
      onPointerOut: () => {
        if (!hovered.current) return
        hovered.current = false
        store.cursor(null)
      },
      onClick: (e: { stopPropagation: () => void }) => {
        e.stopPropagation()
        onClick()
      },
    },
  }
}
