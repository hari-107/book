import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import {
  paperScrapTexture,
  wordTexture,
  gearTexture,
  woodTexture,
  deskMapTexture,
  letterTexture,
  compassFaceTexture,
  scrapDocumentTexture,
} from '../three/proceduralTextures.js'
import { DESK_Y, GOLD } from '../constants.js'

/**
 * The living, chaotic environment behind the book: drifting dust, ember
 * sparks, tumbling paper scraps (one occasionally flies past the camera),
 * glowing handwritten words and hacker glyphs that fade in and out, huge
 * slow gears in the gloom, and the desk the book rests on. Everything is
 * muted and behind the book — the book stays the hero. Subtle parallax
 * follows the pointer, and the Fun Zone easter egg detonates a spark burst.
 */

const WORDS = [
  ['adventure', '#e8c87a'],
  ['explore', '#e8c87a'],
  ['build cool things', '#e8c87a'],
  ['sudo make cool', '#7ad0c8'],
  ['{ }', '#7ad0c8'],
  ['// TODO: everything', '#7ad0c8'],
  ['→ ? ←', '#e8c87a'],
  ['404', '#c88a7a'],
  ['✗ marks the spot', '#e8c87a'],
  ['while(alive){learn()}', '#7ad0c8'],
]

function Dust({ count = 140 }) {
  const ref = useRef()
  const seeds = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const speed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 11
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6
      arr[i * 3 + 2] = -1 - Math.random() * 5
      speed[i] = 0.02 + Math.random() * 0.06
    }
    return { arr, speed }
  }, [count])

  useFrame(({ clock }) => {
    const pos = ref.current.geometry.attributes.position
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += seeds.speed[i] * 0.016
      pos.array[i * 3] += Math.sin(t * 0.5 + i) * 0.0008
      if (pos.array[i * 3 + 1] > 3.2) pos.array[i * 3 + 1] = -3.2
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[seeds.arr, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#d8c9a3" transparent opacity={0.35} depthWrite={false} sizeAttenuation />
    </points>
  )
}

function Sparks({ count = 46 }) {
  const ref = useRef()
  const seeds = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 9
      arr[i * 3 + 1] = (Math.random() - 0.5) * 5
      arr[i * 3 + 2] = -1.5 - Math.random() * 4
    }
    return arr
  }, [count])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += 0.0025 + Math.sin(t + i * 3.7) * 0.0012
      pos.array[i * 3] += Math.cos(t * 0.8 + i * 1.3) * 0.0012
      if (pos.array[i * 3 + 1] > 2.8) pos.array[i * 3 + 1] = -2.8
    }
    pos.needsUpdate = true
    ref.current.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.15
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[seeds, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#e8b45a" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

function TumblingPapers({ count = 9 }) {
  const groupRef = useRef()
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        tex: paperScrapTexture(i),
        base: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 4.4, -1.8 - Math.random() * 3.4),
        spin: new THREE.Vector3(0.2 + Math.random() * 0.5, 0.15 + Math.random() * 0.4, 0.1 + Math.random() * 0.5),
        phase: Math.random() * Math.PI * 2,
        flying: false,
      })),
    [count]
  )

  // occasionally one scrap flies past the camera
  useEffect(() => {
    let alive = true
    let timer
    const launch = () => {
      if (!alive) return
      const idle = items.filter((it) => !it.flying)
      if (idle.length && groupRef.current) {
        const it = idle[Math.floor(Math.random() * idle.length)]
        const mesh = groupRef.current.children[items.indexOf(it)]
        if (mesh) {
          it.flying = true
          const side = Math.random() > 0.5 ? 1 : -1
          mesh.position.set(-side * 6, (Math.random() - 0.5) * 2.5, -2.5)
          gsap.to(mesh.position, {
            x: side * 7,
            y: (Math.random() - 0.5) * 2,
            z: 1.6 + Math.random() * 1.2,
            duration: 2.4 + Math.random(),
            ease: 'power1.in',
            onComplete: () => {
              it.flying = false
              mesh.position.copy(it.base)
            },
          })
        }
      }
      timer = setTimeout(launch, 6000 + Math.random() * 6000)
    }
    timer = setTimeout(launch, 5000)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [items])

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime()
    groupRef.current.children.forEach((mesh, i) => {
      const it = items[i]
      mesh.rotation.x += it.spin.x * dt
      mesh.rotation.y += it.spin.y * dt
      mesh.rotation.z += it.spin.z * dt * 0.6
      if (!it.flying) {
        mesh.position.x = it.base.x + Math.sin(t * 0.25 + it.phase) * 0.5
        mesh.position.y = it.base.y + Math.sin(t * 0.35 + it.phase * 2) * 0.35
        mesh.position.z = it.base.z
      }
    })
  })

  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} position={it.base.toArray()}>
          <planeGeometry args={[0.3, 0.38]} />
          <meshBasicMaterial map={it.tex} transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function GlowWords({ count = 8 }) {
  const groupRef = useRef()
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const [text, color] = WORDS[i % WORDS.length]
        return {
          tex: wordTexture(text, color),
          pos: new THREE.Vector3(),
          life: Math.random() * 6, // staggered starts
          duration: 6 + Math.random() * 5,
        }
      }),
    [count]
  )

  const respawn = (it) => {
    const side = Math.random() > 0.5 ? 1 : -1
    it.pos.set(side * (2.2 + Math.random() * 2.6), (Math.random() - 0.5) * 3.4, -1.6 - Math.random() * 3.4)
    it.life = 0
    it.duration = 6 + Math.random() * 5
  }

  useEffect(() => items.forEach(respawn), [items])

  useFrame((_, dt) => {
    groupRef.current.children.forEach((mesh, i) => {
      const it = items[i]
      it.life += dt
      if (it.life > it.duration) respawn(it)
      const p = it.life / it.duration
      const fade = Math.min(p * 4, (1 - p) * 3, 1)
      mesh.material.opacity = 0.34 * Math.max(0, fade)
      mesh.position.set(it.pos.x, it.pos.y + p * 0.4, it.pos.z)
    })
  })

  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i}>
          <planeGeometry args={[1.1, 0.34]} />
          <meshBasicMaterial map={it.tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

function Gears() {
  const a = useRef()
  const b = useRef()
  const tex1 = useMemo(() => gearTexture(256, 12), [])
  const tex2 = useMemo(() => gearTexture(256, 9), [])
  useFrame((_, dt) => {
    if (a.current) a.current.rotation.z += dt * 0.12
    if (b.current) b.current.rotation.z -= dt * 0.18
  })
  return (
    <>
      <mesh ref={a} position={[-3.4, 1.6, -5.6]}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial map={tex1} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <mesh ref={b} position={[3.8, -1.2, -5.2]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={tex2} transparent opacity={0.11} depthWrite={false} />
      </mesh>
    </>
  )
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

/** Flat paper props lying on the desk. */
function DeskPaper({ tex, x, z, w, h, rot }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, rot]} position={[x, DESK_Y + 0.002, z]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}

/**
 * The explorer's desk: maps, letters, a compass, a magnifying glass, ink
 * bottle, pencils, coins and a candle whose light breathes. Props flank the
 * book so it stays the hero; everything shares the same warm physical world.
 */
function DeskObjects() {
  const flameRef = useRef()
  const lightRef = useRef()
  const mapTex = useMemo(() => deskMapTexture(), [])
  const letterTex = useMemo(() => letterTexture(), [])
  const compassTex = useMemo(() => compassFaceTexture(), [])
  const docTex = useMemo(() => scrapDocumentTexture(42), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // candle flicker — light breathes, flame quivers, shadows move
    const flick = 0.62 + Math.sin(t * 9.3) * 0.06 + Math.sin(t * 23.7) * 0.05 + Math.sin(t * 3.1) * 0.06
    if (lightRef.current) lightRef.current.intensity = flick
    if (flameRef.current) {
      flameRef.current.scale.set(1 + Math.sin(t * 17) * 0.12, 1 + Math.sin(t * 13.3) * 0.2, 1)
      flameRef.current.position.x = Math.sin(t * 11.7) * 0.004
    }
  })

  return (
    <group>
      {/* scattered documents */}
      <DeskPaper tex={mapTex} x={-2.2} z={0.35} w={1.05} h={0.78} rot={0.3} />
      <DeskPaper tex={letterTex} x={2.15} z={0.55} w={0.62} h={0.42} rot={-0.4} />
      <DeskPaper tex={docTex} x={2.5} z={-0.4} w={0.5} h={0.62} rot={0.9} />
      <DeskPaper tex={mapTex} x={-2.7} z={-0.9} w={0.9} h={0.66} rot={-1.2} />

      {/* compass */}
      <group position={[1.95, DESK_Y + 0.026, 1.05]}>
        <mesh>
          <cylinderGeometry args={[0.11, 0.11, 0.045, 28]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0.6]}>
          <circleGeometry args={[0.095, 28]} />
          <meshStandardMaterial map={compassTex} roughness={0.5} />
        </mesh>
      </group>

      {/* magnifying glass */}
      <group position={[-2.05, DESK_Y + 0.02, 1.0]} rotation={[-Math.PI / 2, 0, 2.4]}>
        <mesh>
          <torusGeometry args={[0.1, 0.014, 10, 28]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.095, 24]} />
          <meshStandardMaterial color="#cfe3dd" transparent opacity={0.18} roughness={0.15} metalness={0.1} />
        </mesh>
        <mesh position={[0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.018, 0.2, 10]} />
          <meshStandardMaterial color="#3a2415" roughness={0.6} />
        </mesh>
      </group>

      {/* ink bottle + quill-pencils */}
      <group position={[2.35, DESK_Y, -1.1]}>
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.11, 16]} />
          <meshStandardMaterial color="#151a24" roughness={0.25} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.125, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.03, 10]} />
          <meshStandardMaterial color="#4a3020" roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[1.7, DESK_Y + 0.012, -0.75]} rotation={[0, 0.9, Math.PI / 2]}>
        <cylinderGeometry args={[0.009, 0.009, 0.34, 6]} />
        <meshStandardMaterial color="#7a5a30" roughness={0.8} />
      </mesh>
      <mesh position={[1.85, DESK_Y + 0.012, -0.65]} rotation={[0, 1.25, Math.PI / 2]}>
        <cylinderGeometry args={[0.009, 0.009, 0.3, 6]} />
        <meshStandardMaterial color="#54381e" roughness={0.8} />
      </mesh>

      {/* scattered coins */}
      {[[-1.75, 0.55], [-1.62, 0.7], [2.4, 1.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, DESK_Y + 0.008, z]} rotation={[-Math.PI / 2, 0, i * 1.3]}>
          <cylinderGeometry args={[0.035, 0.035, 0.008, 18]} />
          <meshStandardMaterial color={GOLD} metalness={0.75} roughness={0.45} />
        </mesh>
      ))}

      {/* candle — wax, quivering flame, breathing light */}
      <group position={[-2.5, DESK_Y, -0.9]}>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.05, 0.058, 0.18, 14]} />
          <meshStandardMaterial color="#e8dcbe" roughness={0.6} />
        </mesh>
        <mesh ref={flameRef} position={[0, 0.215, 0]}>
          <coneGeometry args={[0.018, 0.06, 8]} />
          <meshBasicMaterial color="#ffc466" toneMapped={false} transparent opacity={0.95} />
        </mesh>
        <pointLight ref={lightRef} position={[0, 0.3, 0]} intensity={0.6} color="#ffb45e" distance={5.5} decay={1.6} />
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
    // counter-parallax: the world drifts opposite the pointer, gently
    const g = groupRef.current
    if (!g) return
    const k = Math.min(1, dt * 3)
    g.position.x += (-pointer.current.x * 0.22 - g.position.x) * k
    g.position.y += (pointer.current.y * 0.14 - g.position.y) * k
  })

  return (
    <>
      <group ref={groupRef}>
        <Dust />
        <Sparks />
        <TumblingPapers />
        <GlowWords />
        <Gears />
      </group>
      <EggBurst />
      <DeskObjects />
      {/* the desk the book rests on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y - 0.002, -0.6]}>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial map={wood} roughness={0.92} metalness={0.02} />
      </mesh>
    </>
  )
}
