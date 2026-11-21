'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Skill } from '@/lib/types'
import { SKILL_ORDER } from '../lib/items'
import { rng, yearOf } from '../lib/util'
import { Z } from '../lib/world'
import { COLOR, damp, hdr, StationGroup, useScene } from './shared'

type Node = { skill: Skill; pos: THREE.Vector3; group: number; r: number }

function layout(skills: Skill[], mobile: boolean) {
  const spread = mobile ? 0.5 : 0.78
  const cats = SKILL_ORDER.filter((c) => skills.some((s) => s.category === c))
  const centers = cats.map((_, i) => {
    // fibonacci sphere, squashed so the cloud reads wide
    const t = (i + 0.5) / cats.length
    const phi = Math.acos(1 - 2 * t)
    const th = Math.PI * (1 + Math.sqrt(5)) * i
    return new THREE.Vector3(Math.cos(th) * Math.sin(phi) * 8.2 * spread, Math.cos(phi) * 4.6 * (mobile ? 0.9 : 1), Math.sin(th) * Math.sin(phi) * 5 * spread)
  })
  const maxLevel = Math.max(5, ...skills.map((s) => s.level))
  const nodes: Node[] = []
  cats.forEach((c, gi) => {
    skills
      .filter((s) => s.category === c)
      .forEach((skill, i) => {
        const r = rng(gi * 97 + i * 13 + 5)
        const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar((0.8 + r() * 1.7) * (mobile ? 0.55 : 0.85))
        nodes.push({ skill, pos: centers[gi].clone().add(v), group: gi, r: (0.12 + (skill.level / maxLevel) * 0.1) * (mobile ? 0.8 : 1) })
      })
  })
  return { cats, nodes, centers }
}

/** Station 6 · skills: a node per skill, joined by thin lines; hover a group in the page and its nodes light up. */
export function Constellation() {
  const { data, store, api, quality } = useScene()
  const L = useMemo(() => layout(data.skills, quality.mobile), [data.skills, quality.mobile])
  const exp = data.experience
  const mesh = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const lineMat = useRef<THREE.LineBasicMaterial>(null)
  const lit = useRef(-1)
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color(), base: new THREE.Color(COLOR.ice), hot: hdr(COLOR.solar, 2.2) }), [])

  const lines = useMemo(() => {
    if (quality.mobile) return null
    const p: number[] = []
    const group: number[] = []
    const push = (a: THREE.Vector3, b: THREE.Vector3, g: number) => {
      p.push(a.x, a.y, a.z, b.x, b.y, b.z)
      group.push(g, g)
    }
    L.cats.forEach((_, gi) => {
      const ns = L.nodes.filter((n) => n.group === gi)
      ns.forEach((a, i) => {
        // join each node to its two nearest siblings
        const near = ns
          .filter((b) => b !== a)
          .sort((x, y) => x.pos.distanceTo(a.pos) - y.pos.distanceTo(a.pos))
          .slice(0, 2)
        near.forEach((b) => (i < ns.indexOf(b) || near.length < 2) && push(a.pos, b.pos, gi))
      })
    })
    L.centers.forEach((c, i) => push(c, L.centers[(i + 1) % L.centers.length], -1))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(p.length), 3))
    g.userData.group = group
    return g
  }, [L, quality.mobile])

  useEffect(() => () => lines?.dispose(), [lines])

  const paint = (g: number) => {
    const m = mesh.current
    if (m) {
      L.nodes.forEach((n, i) => {
        tmp.c.copy(g >= 0 && n.group === g ? tmp.hot : tmp.base).multiplyScalar(g >= 0 && n.group !== g ? 0.35 : 1)
        m.setColorAt(i, tmp.c)
      })
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    if (lines) {
      const col = lines.getAttribute('color') as THREE.BufferAttribute
      const grp = lines.userData.group as number[]
      for (let i = 0; i < grp.length; i++) {
        const on = g >= 0 && grp[i] === g
        const k = on ? 1.6 : g >= 0 ? 0.12 : 0.4
        const c = on ? tmp.hot : tmp.base
        col.setXYZ(i, c.r * k, c.g * k, c.b * k)
      }
      col.needsUpdate = true
    }
  }

  useEffect(() => {
    const m = mesh.current
    if (!m) return
    L.nodes.forEach((n, i) => {
      tmp.o.position.copy(n.pos)
      tmp.o.scale.setScalar(n.r)
      tmp.o.updateMatrix()
      m.setMatrixAt(i, tmp.o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    lit.current = -2
  }, [L, tmp])

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (g) {
      g.rotation.y = clock.elapsedTime * 0.05 + store.local[5] * 1.1
      g.rotation.x = damp(g.rotation.x, 0.12 + store.local[5] * 0.1, 2, Math.min(dt, 0.05))
    }
    const target = store.skillGroup ? L.cats.indexOf(store.skillGroup as (typeof SKILL_ORDER)[number]) : -1
    if (lit.current !== target) {
      lit.current = target
      paint(target)
    }
  })

  // timeline rail under the cloud
  const years = exp.map((e) => yearOf(e.start) ?? 2020)
  const y0 = Math.min(...years, 2020)
  const y1 = Math.max(...years, new Date().getUTCFullYear())
  const ticks = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = ticks.current
    if (!m) return
    exp.forEach((e, i) => {
      const x = -9 + (((yearOf(e.start) ?? y0) - y0) / Math.max(1, y1 - y0)) * 18
      tmp.o.position.set(x, -6.4, 0)
      tmp.o.scale.set(1, 1, 1)
      tmp.o.updateMatrix()
      m.setMatrixAt(i, tmp.o.matrix)
      m.setColorAt(i, tmp.base)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [exp, tmp, y0, y1])
  useFrame(() => {
    const m = ticks.current
    if (!m || !exp.length) return
    exp.forEach((_, i) => {
      tmp.c.copy(store.expHover === i ? tmp.hot : tmp.base)
      m.setColorAt(i, tmp.c)
    })
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  if (!L.nodes.length) return null
  return (
    <StationGroup i={5} span={0.95}>
      <group position={[0, 0, Z.skills]}>
        <group ref={group}>
          <instancedMesh
            ref={mesh}
            args={[undefined, undefined, L.nodes.length]}
            onPointerMove={(e) => {
              if (quality.mobile || e.instanceId === undefined) return
              const n = L.nodes[e.instanceId]
              e.stopPropagation()
              store.cursor(n.skill.name)
              api.setSkillGroup(L.cats[n.group])
            }}
            onPointerOut={() => {
              store.cursor(null)
              api.setSkillGroup(null)
            }}
          >
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial toneMapped={false} />
          </instancedMesh>
          {lines && (
            <lineSegments geometry={lines}>
              <lineBasicMaterial ref={lineMat} vertexColors transparent opacity={0.9} depthWrite={false} />
            </lineSegments>
          )}
        </group>
        {exp.length > 0 && (
          <group position={[0, 0, 4]}>
            <mesh position={[0, -6.4, 0]}>
              <planeGeometry args={[19, 0.02]} />
              <meshBasicMaterial color={COLOR.mist} transparent opacity={0.45} />
            </mesh>
            <instancedMesh ref={ticks} args={[undefined, undefined, exp.length]}>
              <boxGeometry args={[0.07, 0.6, 0.07]} />
              <meshBasicMaterial toneMapped={false} />
            </instancedMesh>
          </group>
        )}
      </group>
    </StationGroup>
  )
}

