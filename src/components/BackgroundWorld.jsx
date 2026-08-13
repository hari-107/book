import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import { paperScrapTexture, wordTexture, gearTexture, woodTexture } from '../three/proceduralTextures.js'

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
      {/* the desk the book rests on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.36, -0.6]}>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial map={wood} roughness={0.92} metalness={0.02} />
      </mesh>
    </>
  )
}
