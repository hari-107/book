import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import {
  scrapDocumentTexture,
  paperScrapTexture,
  themedScrapTexture,
  tapeTexture,
  shadowBlobTexture,
} from '../three/proceduralTextures.js'
import { GOLD } from '../constants.js'

/**
 * The scrapbook layer: what a person physically stuck onto THIS spread.
 * Each section contributes its own artifacts — graph-paper sketches for the
 * inventor pages, a blueprint fragment for projects, a redacted CLASSIFIED
 * strip for field reports, sticky notes, expedition ticket stubs, a taped
 * coin on the treasure spread, a red wax seal on the certificates. Pieces
 * sit above the page with drop shadows, bounce-drop in when the spread
 * settles, and idle with a faint peeling flutter. Raycasts pass through.
 */

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SPOTS = [
  [-1.02, 0.55], [1.05, -0.58], [-1.08, -0.5], [0.98, 0.6], [-0.35, -0.68], [0.4, 0.68],
]

// what each section's pages accumulate
const THEME_ITEMS = {
  explorer: ['scrapDoc', 'sticky'],
  inventor: ['graph', 'sticky'],
  journal: ['ticket', 'scrapDoc'],
  blueprint: ['blueprint', 'graph'],
  stamps: ['seal', 'scrapDoc'],
  treasure: ['coin', 'ticket'],
  reports: ['classified', 'scrapDoc'],
  scholar: ['graph', 'scrap'],
  chaos: ['sticky', 'scrap', 'graph'],
  letter: ['scrapDoc', 'sticky'],
}

function itemTexture(kind, seed) {
  if (kind === 'scrapDoc') return scrapDocumentTexture(seed)
  if (kind === 'scrap') return paperScrapTexture(seed % 7)
  return themedScrapTexture(kind, seed)
}

const ITEM_SIZE = {
  scrapDoc: [0.34, 0.43],
  scrap: [0.22, 0.27],
  graph: [0.3, 0.22],
  blueprint: [0.32, 0.24],
  classified: [0.3, 0.22],
  sticky: [0.2, 0.16],
  ticket: [0.3, 0.22],
}

export default function PageEphemera({ spread, visibleFaces, stackTopZ }) {
  const isOpen = useBookStore((s) => s.isOpen)
  const navOpen = useBookStore((s) => s.navOpen)
  const turning = useBookStore((s) => s.turning)
  const groupRef = useRef()
  const fade = useRef(0)

  const shadowTex = useMemo(() => shadowBlobTexture(), [])
  const tapeTex = useMemo(() => tapeTexture(), [])

  const items = useMemo(() => {
    const rnd = mulberry32(spread * 104729 + 7)
    const kinds = []
    for (const f of visibleFaces) {
      const list = THEME_ITEMS[f.theme]
      if (list) kinds.push(list[Math.floor(rnd() * list.length)])
    }
    // occasionally one extra generic scrap
    if (rnd() > 0.55) kinds.push(rnd() > 0.5 ? 'scrap' : 'scrapDoc')

    const used = new Set()
    return kinds.slice(0, 3).map((kind, i) => {
      let spotIdx = Math.floor(rnd() * SPOTS.length)
      while (used.has(spotIdx)) spotIdx = (spotIdx + 1) % SPOTS.length
      used.add(spotIdx)
      const spot = SPOTS[spotIdx]
      const is3D = kind === 'coin' || kind === 'seal'
      const [w, h] = ITEM_SIZE[kind] || [0.26, 0.26]
      return {
        kind,
        tex: is3D ? null : itemTexture(kind, Math.floor(rnd() * 100)),
        x: spot[0] + (rnd() - 0.5) * 0.16,
        y: spot[1] + (rnd() - 0.5) * 0.12,
        rot: (rnd() - 0.5) * 0.5,
        w,
        h,
        taped: kind !== 'coin' && kind !== 'seal' && rnd() > 0.3,
        phase: rnd() * Math.PI * 2,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread])

  // drop onto the page when a new spread settles
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.children.forEach((child, i) => {
      const zRest = 0.006 + i * 0.004
      gsap.killTweensOf(child.position)
      child.position.z = zRest + 0.28
      gsap.to(child.position, { z: zRest, duration: 0.5, delay: 0.15 + i * 0.12, ease: 'bounce.out' })
    })
  }, [items])

  useFrame(({ clock }, dt) => {
    const g = groupRef.current
    if (!g) return
    const t = clock.getElapsedTime()
    const target = isOpen && !navOpen && !turning ? 1 : 0
    fade.current += (target - fade.current) * Math.min(1, dt * 5)
    g.visible = fade.current > 0.02
    g.children.forEach((child, i) => {
      const it = items[i]
      if (it) child.rotation.z = it.rot + Math.sin(t * 1.1 + it.phase) * 0.012 // corner-peel flutter
    })
    g.traverse((o) => {
      if (o.material && o.userData.fades) o.material.opacity = o.userData.baseOpacity * fade.current
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, stackTopZ]}>
      {items.map((it, i) => (
        <group key={`${spread}-${i}`} position={[it.x, it.y, 0.006 + i * 0.004]} rotation={[0, 0, it.rot]}>
          {/* drop shadow onto the parchment */}
          <mesh position={[0.012, -0.018, -0.003]} raycast={() => null} userData={{ fades: true, baseOpacity: 0.55 }}>
            <planeGeometry args={[it.w * 1.35, it.h * 1.35]} />
            <meshBasicMaterial map={shadowTex} transparent opacity={0} depthWrite={false} />
          </mesh>

          {it.kind === 'coin' && (
            <>
              <mesh raycast={() => null} rotation={[Math.PI / 2, 0, 0]} userData={{ fades: false }}>
                <cylinderGeometry args={[0.095, 0.095, 0.014, 28]} />
                <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0, 0.008]} raycast={() => null} userData={{ fades: false }}>
                <ringGeometry args={[0.045, 0.075, 24]} />
                <meshStandardMaterial color="#8a6a2c" metalness={0.65} roughness={0.55} />
              </mesh>
              {[0.8, -0.8].map((r, k) => (
                <mesh key={k} position={[0, 0, 0.016]} rotation={[0, 0, r]} raycast={() => null} userData={{ fades: true, baseOpacity: 0.85 }}>
                  <planeGeometry args={[0.3, 0.07]} />
                  <meshBasicMaterial map={tapeTex} transparent opacity={0} depthWrite={false} />
                </mesh>
              ))}
            </>
          )}

          {it.kind === 'seal' && (
            <mesh raycast={() => null} rotation={[Math.PI / 2, 0, 0]} userData={{ fades: false }}>
              <cylinderGeometry args={[0.075, 0.085, 0.012, 22]} />
              <meshStandardMaterial color="#7e2318" metalness={0.15} roughness={0.55} />
            </mesh>
          )}

          {it.kind !== 'coin' && it.kind !== 'seal' && (
            <>
              <mesh raycast={() => null} userData={{ fades: true, baseOpacity: 1 }}>
                <planeGeometry args={[it.w, it.h]} />
                <meshBasicMaterial map={it.tex} transparent opacity={0} depthWrite={false} />
              </mesh>
              {it.taped && (
                <mesh position={[0, it.h / 2 - 0.008, 0.002]} rotation={[0, 0, 0.5]} raycast={() => null} userData={{ fades: true, baseOpacity: 0.9 }}>
                  <planeGeometry args={[0.12, 0.045]} />
                  <meshBasicMaterial map={tapeTex} transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </>
          )}
        </group>
      ))}
    </group>
  )
}
