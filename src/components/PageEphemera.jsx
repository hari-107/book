import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import {
  scrapDocumentTexture,
  paperScrapTexture,
  themedScrapTexture,
  postageStampTexture,
  postcardTexture,
  newspaperClippingTexture,
  handwrittenNoteTexture,
  mapFragmentTexture,
  sketchCardTexture,
  letterTexture,
  tapeTexture,
  shadowBlobTexture,
} from '../three/proceduralTextures.js'
import { GOLD } from '../constants.js'

/**
 * The scrapbook composer — what a person physically stuck onto THIS spread.
 * A library of reusable physical objects (torn documents, handwritten notes,
 * sketches, map fragments, postage stamps, postcards, newspaper clippings,
 * tickets, sticky notes, envelopes, coins, wax seals) composed differently
 * per section, with a density that progresses through the book:
 *
 *   title → clean · index → a note · about → photos + handwriting ·
 *   skills → sketches · projects → heavily layered evidence ·
 *   field reports → very messy · fun zone → absolute chaos · contact → letter
 *
 * Pieces overlap each other and the page edges, sit above the paper with
 * drop shadows, bounce-drop in when a spread settles, and idle with a faint
 * corner-peel flutter. Raycasts pass through everything.
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

// anchor spots across the spread — margins, corners, gutter foot
const SPOTS = [
  [-1.05, 0.56], [1.06, -0.56], [-1.1, -0.48], [1.0, 0.58], [-0.38, -0.68], [0.42, 0.68],
  [-0.75, 0.1], [0.82, 0.12], [-0.15, 0.66], [0.12, -0.7], [1.18, 0.3], [-1.18, -0.15],
]

// section compositions: [minCount, maxCount], object kinds to draw from
const THEME_COMP = {
  welcome: { n: [1, 1], kinds: ['mapfrag'] },
  title: { n: [0, 0], kinds: [] }, // the title page stays clean
  index: { n: [1, 1], kinds: ['handnote'] },
  end: { n: [1, 1], kinds: ['poststamp'] },
  explorer: { n: [2, 3], kinds: ['handnote', 'sticky', 'torn', 'postcard'] },
  inventor: { n: [2, 3], kinds: ['sketch', 'graph', 'sticky', 'handnote'] },
  journal: { n: [2, 2], kinds: ['ticket', 'handnote', 'torn'] },
  blueprint: { n: [4, 5], kinds: ['blueprint', 'graph', 'newspaper', 'mapfrag', 'sticky', 'sketch'] },
  stamps: { n: [2, 2], kinds: ['seal', 'scrapDoc', 'poststamp'] },
  treasure: { n: [3, 3], kinds: ['coin', 'poststamp', 'ticket', 'seal'] },
  reports: { n: [3, 4], kinds: ['classified', 'newspaper', 'torn', 'sticky', 'scrapDoc'] },
  scholar: { n: [2, 2], kinds: ['handnote', 'sketch', 'graph'] },
  chaos: { n: [5, 6], kinds: ['sticky', 'scrap', 'sketch', 'poststamp', 'ticket', 'newspaper', 'handnote'] },
  letter: { n: [2, 3], kinds: ['envelope', 'postcard', 'poststamp'] },
}

function itemTexture(kind, seed) {
  switch (kind) {
    case 'scrapDoc':
    case 'torn':
      return scrapDocumentTexture(seed)
    case 'scrap':
      return paperScrapTexture(seed % 7)
    case 'poststamp':
      return postageStampTexture(seed)
    case 'postcard':
      return postcardTexture(seed)
    case 'newspaper':
      return newspaperClippingTexture(seed)
    case 'handnote':
      return handwrittenNoteTexture(seed)
    case 'mapfrag':
      return mapFragmentTexture(seed)
    case 'sketch':
      return sketchCardTexture(seed)
    case 'envelope':
      return letterTexture()
    default:
      return themedScrapTexture(kind, seed) // graph · blueprint · classified · sticky · ticket
  }
}

const ITEM_SIZE = {
  scrapDoc: [0.34, 0.43],
  torn: [0.3, 0.38],
  scrap: [0.22, 0.27],
  graph: [0.3, 0.22],
  blueprint: [0.32, 0.24],
  classified: [0.3, 0.22],
  sticky: [0.2, 0.16],
  ticket: [0.3, 0.22],
  poststamp: [0.16, 0.19],
  postcard: [0.36, 0.24],
  newspaper: [0.28, 0.33],
  handnote: [0.32, 0.21],
  mapfrag: [0.3, 0.28],
  sketch: [0.27, 0.2],
  envelope: [0.36, 0.24],
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
      const comp = THEME_COMP[f.theme]
      if (!comp) continue
      const n = comp.n[0] + Math.floor(rnd() * (comp.n[1] - comp.n[0] + 1))
      for (let i = 0; i < n; i++) kinds.push(comp.kinds[Math.floor(rnd() * comp.kinds.length)])
    }
    // overlap is allowed — duplicate spots just stack; cap for performance
    return kinds.slice(0, 6).map((kind) => {
      const spot = SPOTS[Math.floor(rnd() * SPOTS.length)]
      const is3D = kind === 'coin' || kind === 'seal'
      const [w, h] = ITEM_SIZE[kind] || [0.26, 0.26]
      return {
        kind,
        tex: is3D ? null : itemTexture(kind, Math.floor(rnd() * 100)),
        x: spot[0] + (rnd() - 0.5) * 0.24,
        y: spot[1] + (rnd() - 0.5) * 0.18,
        rot: (rnd() - 0.5) * 0.6,
        w,
        h,
        taped: !is3D && rnd() > 0.3,
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
      const zRest = 0.006 + i * 0.0045
      gsap.killTweensOf(child.position)
      child.position.z = zRest + 0.3
      gsap.to(child.position, { z: zRest, duration: 0.45 + Math.random() * 0.2, delay: 0.15 + i * 0.1, ease: 'bounce.out' })
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
        <group key={`${spread}-${i}`} position={[it.x, it.y, 0.006 + i * 0.0045]} rotation={[0, 0, it.rot]}>
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
                <>
                  <mesh position={[-it.w / 2 + 0.03, it.h / 2 - 0.008, 0.002]} rotation={[0, 0, 0.6]} raycast={() => null} userData={{ fades: true, baseOpacity: 0.9 }}>
                    <planeGeometry args={[0.11, 0.042]} />
                    <meshBasicMaterial map={tapeTex} transparent opacity={0} depthWrite={false} />
                  </mesh>
                  <mesh position={[it.w / 2 - 0.03, it.h / 2 - 0.008, 0.002]} rotation={[0, 0, -0.6]} raycast={() => null} userData={{ fades: true, baseOpacity: 0.9 }}>
                    <planeGeometry args={[0.11, 0.042]} />
                    <meshBasicMaterial map={tapeTex} transparent opacity={0} depthWrite={false} />
                  </mesh>
                </>
              )}
            </>
          )}
        </group>
      ))}
    </group>
  )
}
