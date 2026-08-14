import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBookStore } from '../store/useBookStore.js'
import {
  paperScrapTexture,
  woodTexture,
  deskMapTexture,
  scrapDocumentTexture,
  letterTexture,
  compassFaceTexture,
} from '../three/proceduralTextures.js'
import { DESK_Y } from '../constants.js'

const AGED_BRASS = '#6e5832'

/**
 * The environment: a midnight study, kept quiet and believable so the huge
 * journal owns the frame. A dark wood desk with a couple of flat aged papers
 * at its edges, slow dust hanging in the light, the rare paper scrap
 * drifting far behind the book, and a warm lamp-light flicker from beyond
 * the frame that makes the shadows breathe. No glowing words, no gears, no
 * toy props. Subtle counter-parallax follows the pointer, and the Fun Zone
 * easter egg still detonates its brief spark burst.
 */

function Dust({ count = 110 }) {
  const ref = useRef()
  const seeds = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const speed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10
      arr[i * 3 + 1] = (Math.random() - 0.5) * 5.5
      arr[i * 3 + 2] = -1 - Math.random() * 5
      speed[i] = 0.015 + Math.random() * 0.05
    }
    return { arr, speed }
  }, [count])

  useFrame(({ clock }) => {
    const pos = ref.current.geometry.attributes.position
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += seeds.speed[i] * 0.014
      pos.array[i * 3] += Math.sin(t * 0.4 + i) * 0.0006
      if (pos.array[i * 3 + 1] > 3) pos.array[i * 3 + 1] = -3
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[seeds.arr, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color="#cbb695" transparent opacity={0.34} depthWrite={false} sizeAttenuation />
    </points>
  )
}

function DriftingScraps({ count = 5 }) {
  const groupRef = useRef()
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        tex: paperScrapTexture(i),
        base: new THREE.Vector3((Math.random() - 0.5) * 8.5, (Math.random() - 0.3) * 4, -2.6 - Math.random() * 3),
        spin: new THREE.Vector3(0.1 + Math.random() * 0.25, 0.08 + Math.random() * 0.2, 0.06 + Math.random() * 0.2),
        phase: Math.random() * Math.PI * 2,
      })),
    [count]
  )

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime()
    groupRef.current.children.forEach((mesh, i) => {
      const it = items[i]
      mesh.rotation.x += it.spin.x * dt
      mesh.rotation.y += it.spin.y * dt
      mesh.rotation.z += it.spin.z * dt * 0.5
      mesh.position.x = it.base.x + Math.sin(t * 0.16 + it.phase) * 0.45
      mesh.position.y = it.base.y + Math.sin(t * 0.22 + it.phase * 2) * 0.3
    })
  })

  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} position={it.base.toArray()}>
          <planeGeometry args={[0.26, 0.33]} />
          <meshBasicMaterial map={it.tex} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Warm lamp-light from beyond the frame — breathing intensity moves the shadows. */
function LampFlicker() {
  const ref = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ref.current) {
      ref.current.intensity =
        0.5 + Math.sin(t * 8.7) * 0.045 + Math.sin(t * 21.3) * 0.035 + Math.sin(t * 2.6) * 0.05
    }
  })
  return <pointLight ref={ref} position={[-2.6, 0.4, 1.6]} intensity={0.75} color="#ffb45e" distance={8} decay={1.6} />
}

/** Spark burst for the DO NOT PRESS button. */
function EggBurst() {
  const eggToken = useBookStore((s) => s.eggToken)
  const ref = useRef()
  const count = 42
  const seeds = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = []
    for (let i = 0; i < count; i++) vel.push(new THREE.Vector3())
    return { pos, vel }
  }, [])
  const state = useRef({ t: 1e9 })

  useEffect(() => {
    if (eggToken === 0) return
    for (let i = 0; i < count; i++) {
      seeds.pos[i * 3] = 0
      seeds.pos[i * 3 + 1] = 0
      seeds.pos[i * 3 + 2] = 0.6
      const a = Math.random() * Math.PI * 2
      const up = Math.random() * 2.4 + 1
      seeds.vel[i].set(Math.cos(a) * (0.6 + Math.random() * 1.6), up, Math.sin(a) * (0.5 + Math.random()))
    }
    state.current.t = 0
    if (ref.current) ref.current.geometry.attributes.position.needsUpdate = true
  }, [eggToken, seeds])

  useFrame((_, dt) => {
    const s = state.current
    if (s.t > 2) return
    s.t += dt
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      seeds.vel[i].y -= dt * 3.2
      pos.array[i * 3] += seeds.vel[i].x * dt
      pos.array[i * 3 + 1] += seeds.vel[i].y * dt
      pos.array[i * 3 + 2] += seeds.vel[i].z * dt
    }
    pos.needsUpdate = true
    ref.current.material.opacity = Math.max(0, 1 - s.t / 1.6)
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[seeds.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffca6a" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

/**
 * The explorer's desk dressing — maps, letters, brass instruments, ink, a
 * candle — all muted, dim and pushed to the periphery so the journal owns
 * the frame. One map corner flutters occasionally; the candle flame quivers
 * and its light makes every shadow breathe.
 */
function DeskObjects() {
  const flutterRef = useRef()
  const flameRef = useRef()
  const lightRef = useRef()
  const mapTex = useMemo(() => deskMapTexture(), [])
  const docTex = useMemo(() => scrapDocumentTexture(42), [])
  const letterTex = useMemo(() => letterTexture(), [])
  const compassTex = useMemo(() => compassFaceTexture(), [])
  const dim = '#9c8c72'

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // an old map's corner lifts in the draught now and then
    if (flutterRef.current) {
      const gust = Math.max(0, Math.sin(t * 0.31)) ** 6
      flutterRef.current.rotation.x = -Math.PI / 2 + gust * (0.16 + Math.sin(t * 9) * 0.05)
    }
    // candle: quivering flame, breathing light
    const flick = 0.85 + Math.sin(t * 9.3) * 0.05 + Math.sin(t * 23.7) * 0.045 + Math.sin(t * 3.1) * 0.05
    if (lightRef.current) lightRef.current.intensity = flick
    if (flameRef.current) {
      flameRef.current.scale.set(1 + Math.sin(t * 17) * 0.12, 1 + Math.sin(t * 13.3) * 0.2, 1)
      flameRef.current.position.x = Math.sin(t * 11.7) * 0.004
    }
  })

  return (
    <group>
      {/* scattered documents */}
      <mesh rotation={[-Math.PI / 2, 0, 0.35]} position={[-2.35, DESK_Y + 0.002, 0.45]}>
        <planeGeometry args={[1.05, 0.78]} />
        <meshStandardMaterial map={mapTex} roughness={0.95} color={dim} />
      </mesh>
      <mesh ref={flutterRef} rotation={[-Math.PI / 2, 0, -1.1]} position={[2.6, DESK_Y + 0.004, -0.7]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshStandardMaterial map={mapTex} roughness={0.95} color="#8c7c64" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.7]} position={[2.35, DESK_Y + 0.002, 0.35]}>
        <planeGeometry args={[0.52, 0.66]} />
        <meshStandardMaterial map={docTex} transparent roughness={0.95} color={dim} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.9]} position={[-2.05, DESK_Y + 0.003, 1.15]}>
        <planeGeometry args={[0.56, 0.38]} />
        <meshStandardMaterial map={letterTex} roughness={0.95} color={dim} />
      </mesh>

      {/* compass */}
      <group position={[2.0, DESK_Y + 0.024, 1.1]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.042, 24]} />
          <meshStandardMaterial color={AGED_BRASS} metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0.6]}>
          <circleGeometry args={[0.086, 24]} />
          <meshStandardMaterial map={compassTex} roughness={0.6} color="#b8ab90" />
        </mesh>
      </group>

      {/* magnifying glass */}
      <group position={[-2.15, DESK_Y + 0.018, 0.95]} rotation={[-Math.PI / 2, 0, 2.4]}>
        <mesh>
          <torusGeometry args={[0.095, 0.013, 8, 24]} />
          <meshStandardMaterial color={AGED_BRASS} metalness={0.5} roughness={0.55} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.09, 20]} />
          <meshStandardMaterial color="#aebeb8" transparent opacity={0.13} roughness={0.2} />
        </mesh>
        <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.013, 0.017, 0.19, 8]} />
          <meshStandardMaterial color="#2e1d10" roughness={0.7} />
        </mesh>
      </group>

      {/* ink bottle + pencils */}
      <group position={[2.45, DESK_Y, -1.25]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.055, 0.065, 0.1, 14]} />
          <meshStandardMaterial color="#12161e" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.115, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.028, 8]} />
          <meshStandardMaterial color="#3a2515" roughness={0.75} />
        </mesh>
      </group>
      <mesh position={[1.75, DESK_Y + 0.011, -0.85]} rotation={[0, 0.9, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.32, 6]} />
        <meshStandardMaterial color="#5e451f" roughness={0.85} />
      </mesh>
      <mesh position={[1.9, DESK_Y + 0.011, -0.72]} rotation={[0, 1.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.28, 6]} />
        <meshStandardMaterial color="#41300e" roughness={0.85} />
      </mesh>

      {/* scattered coins */}
      {[[-1.8, 0.6], [-1.68, 0.74], [2.42, 1.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, DESK_Y + 0.007, z]} rotation={[-Math.PI / 2, 0, i * 1.3]}>
          <cylinderGeometry args={[0.032, 0.032, 0.007, 16]} />
          <meshStandardMaterial color={AGED_BRASS} metalness={0.55} roughness={0.6} />
        </mesh>
      ))}

      {/* candle — wax, quivering flame, breathing light */}
      <group position={[-2.55, DESK_Y, -1.0]}>
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.048, 0.056, 0.17, 12]} />
          <meshStandardMaterial color="#cfc2a2" roughness={0.65} />
        </mesh>
        <mesh ref={flameRef} position={[0, 0.2, 0]}>
          <coneGeometry args={[0.016, 0.055, 7]} />
          <meshBasicMaterial color="#ffc466" toneMapped={false} transparent opacity={0.92} />
        </mesh>
        <pointLight ref={lightRef} position={[0, 0.3, 0]} intensity={0.85} color="#ffb45e" distance={6} decay={1.7} />
      </group>
    </group>
  )
}

export default function BackgroundWorld() {
  const groupRef = useRef()
  const wood = useMemo(() => woodTexture(), [])
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, dt) => {
    // counter-parallax: the environment moves noticeably more than the book,
    // selling the depth between them
    const g = groupRef.current
    if (!g) return
    const k = Math.min(1, dt * 3)
    g.position.x += (-pointer.current.x * 0.34 - g.position.x) * k
    g.position.y += (pointer.current.y * 0.22 - g.position.y) * k
  })

  return (
    <>
      <group ref={groupRef}>
        <Dust count={typeof window !== 'undefined' && window.innerWidth < 820 ? 55 : 110} />
        <DriftingScraps count={typeof window !== 'undefined' && window.innerWidth < 820 ? 3 : 5} />
      </group>
      <LampFlicker />
      <EggBurst />
      <DeskObjects />
      {/* the desk the book rests on — dark, half-swallowed by the gloom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y - 0.002, -0.6]}>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial map={wood} roughness={0.94} metalness={0.02} color="#a89478" />
      </mesh>
    </>
  )
}
