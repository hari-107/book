import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBookStore } from '../store/useBookStore.js'
import { paperScrapTexture, woodTexture, deskMapTexture, scrapDocumentTexture } from '../three/proceduralTextures.js'
import { DESK_Y } from '../constants.js'

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
      <pointsMaterial size={0.018} color="#cbb695" transparent opacity={0.26} depthWrite={false} sizeAttenuation />
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
          <meshBasicMaterial map={it.tex} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
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
  return <pointLight ref={ref} position={[-2.6, 0.4, 1.6]} intensity={0.5} color="#ffb45e" distance={7} decay={1.7} />
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

/** Flat aged papers half-lost in the gloom at the desk's edges. */
function DeskPapers() {
  const mapTex = useMemo(() => deskMapTexture(), [])
  const docTex = useMemo(() => scrapDocumentTexture(42), [])
  const dim = '#6e6252'
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0.35]} position={[-2.3, DESK_Y + 0.002, 0.4]}>
        <planeGeometry args={[1.0, 0.74]} />
        <meshStandardMaterial map={mapTex} roughness={0.95} color={dim} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.7]} position={[2.35, DESK_Y + 0.002, 0.15]}>
        <planeGeometry args={[0.52, 0.66]} />
        <meshStandardMaterial map={docTex} transparent roughness={0.95} color={dim} />
      </mesh>
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
    // counter-parallax: the world drifts opposite the pointer, gently
    const g = groupRef.current
    if (!g) return
    const k = Math.min(1, dt * 3)
    g.position.x += (-pointer.current.x * 0.18 - g.position.x) * k
    g.position.y += (pointer.current.y * 0.11 - g.position.y) * k
  })

  return (
    <>
      <group ref={groupRef}>
        <Dust />
        <DriftingScraps />
      </group>
      <LampFlicker />
      <EggBurst />
      <DeskPapers />
      {/* the desk the book rests on — dark, half-swallowed by the gloom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y - 0.002, -0.6]}>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial map={wood} roughness={0.94} metalness={0.02} color="#8a7a68" />
      </mesh>
    </>
  )
}
