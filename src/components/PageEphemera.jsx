import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import {
  scrapDocumentTexture,
  paperScrapTexture,
  tapeTexture,
  shadowBlobTexture,
} from '../three/proceduralTextures.js'
import { GOLD } from '../constants.js'

/**
 * Physical scrapbook layering: loose artifacts that sit slightly ABOVE the
 * page surface with real drop shadows — a taped torn document, stray paper
 * scraps, and (on the treasure spread) an old coin taped down with crossed
 * strips, reference-style. Each spread gets its own seeded arrangement and
 * the pieces drop onto the page when the spread settles. Non-interactive:
 * raycasts pass through to the page beneath.
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
    const out = []
    const count = 1 + Math.floor(rnd() * 2)
    for (let i = 0; i < count; i++) {
      const spot = SPOTS[Math.floor(rnd() * SPOTS.length)]
      const isDoc = rnd() > 0.45
      out.push({
        kind: isDoc ? 'doc' : 'scrap',
        tex: isDoc ? scrapDocumentTexture(Math.floor(rnd() * 100)) : paperScrapTexture(Math.floor(rnd() * 7)),
        x: spot[0] + (rnd() - 0.5) * 0.16,
        y: spot[1] + (rnd() - 0.5) * 0.12,
        rot: (rnd() - 0.5) * 0.5,
        w: isDoc ? 0.34 : 0.22,
        h: isDoc ? 0.43 : 0.27,
        taped: rnd() > 0.35,
      })
    }
    // the taped coin artifact on the treasure spread
    if (visibleFaces.some((f) => f.theme === 'treasure')) {
      out.push({ kind: 'coin', x: 0.88, y: -0.42, rot: rnd() * Math.PI, w: 0.2, h: 0.2, taped: true })
    }
    return out
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

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    const target = isOpen && !navOpen && !turning ? 1 : 0
    fade.current += (target - fade.current) * Math.min(1, dt * 5)
    g.visible = fade.current > 0.02
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

          {it.kind === 'coin' ? (
            <>
              <mesh raycast={() => null} rotation={[Math.PI / 2, 0, 0]} userData={{ fades: false }}>
                <cylinderGeometry args={[0.095, 0.095, 0.014, 28]} />
                <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.5} />
              </mesh>
              {/* embossed-ish center */}
              <mesh position={[0, 0, 0.008]} raycast={() => null} userData={{ fades: false }}>
                <ringGeometry args={[0.045, 0.075, 24]} />
                <meshStandardMaterial color="#8a6a2c" metalness={0.65} roughness={0.55} />
              </mesh>
              {/* crossed tape strips, reference-style */}
              {[0.8, -0.8].map((r, k) => (
                <mesh key={k} position={[0, 0, 0.016]} rotation={[0, 0, r]} raycast={() => null} userData={{ fades: true, baseOpacity: 0.85 }}>
                  <planeGeometry args={[0.3, 0.07]} />
                  <meshBasicMaterial map={tapeTex} transparent opacity={0} depthWrite={false} />
                </mesh>
              ))}
            </>
          ) : (
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
