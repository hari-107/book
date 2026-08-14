import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import { imageTextureCache } from '../three/imageCache.js'
import {
  placeholderImageTexture,
  tapeTexture,
  shadowBlobTexture,
  photoCaptionTexture,
} from '../three/proceduralTextures.js'
import { GOLD } from '../constants.js'
import { sfx } from '../utils/sound.js'

/**
 * One photograph, treated like a physical print somebody tossed onto the
 * open book:
 *  - flies in from off the page, spinning, overshoots, then slaps down onto
 *    its scattered spot with a squash-and-settle
 *  - idles with a lazy paper wobble; hover makes it shiver and lift
 *  - when its page leaves, it gets flicked away off the book
 * Clicking it focuses it (handled by the FocusedPhoto overlay).
 * Positions are book-local, so held-book rotation carries the photos with it.
 */

const ANCHORS = [
  [0.6, 0.42], [-0.55, 0.44], [0.7, -0.32], [-0.64, -0.36],
  [0.18, 0.6], [-0.2, -0.62], [1.22, 0.06], [-1.22, 0.14], // last two hang off the fore-edges
]

function seededRand(seed) {
  let a = seed | 0 || 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function FloatingImage({ img, slot, hidden, leaving, seed }) {
  const groupRef = useRef()
  const wobbleRef = useRef()
  const [hovered, setHovered] = useState(false)

  const focusedImage = useBookStore((s) => s.focusedImage)
  const focusImage = useBookStore((s) => s.focusImage)
  const focused = focusedImage === img.id

  const rnd = useMemo(() => seededRand(seed + 7), [seed])

  const target = useMemo(() => {
    const [ax, ay] = ANCHORS[slot % ANCHORS.length]
    return {
      x: ax * 1.08 + (rnd() - 0.5) * 0.14,
      y: ay * 0.78 + (rnd() - 0.5) * 0.12,
      z: 0.3 + (slot % ANCHORS.length) * 0.035,
      rot: (rnd() - 0.5) * 0.42, // 8–15ish degrees either way
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, seed])

  const texture = useMemo(() => {
    const cached = imageTextureCache.get(img.id)
    return cached || placeholderImageTexture(img.caption, seed)
  }, [img.id, img.caption, seed])
  const isReal = !!imageTextureCache.get(img.id)

  const tapeTex = useMemo(() => tapeTexture(), [])
  const shadowTex = useMemo(() => shadowBlobTexture(), [])
  const captionTex = useMemo(
    () => (isReal ? photoCaptionTexture(img.caption || '…') : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [img.caption, isReal]
  )
  const usePin = seed % 3 === 0 // some prints are pinned, some taped

  const aspect = texture.image && texture.image.height ? texture.image.width / texture.image.height : 640 / 520
  const imgW = 0.52
  const imgH = imgW / Math.max(0.6, Math.min(2.2, aspect))

  const materials = useMemo(
    () => ({
      photo: new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, toneMapped: false }),
      frame: new THREE.MeshStandardMaterial({ color: '#efe4c8', roughness: 0.7, transparent: true, opacity: 0 }),
      tape: new THREE.MeshBasicMaterial({ map: tapeTex, transparent: true, opacity: 0, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false }),
      caption: captionTex
        ? new THREE.MeshBasicMaterial({ map: captionTex, transparent: true, opacity: 0, depthWrite: false })
        : null,
    }),
    [texture, tapeTex, shadowTex, captionTex]
  )

  const anim = useRef({ base: 0, vis: 0, hoverLift: 0 })

  // ---- fly in with a personality: no two photos land the same way ---------
  // 0 throw · 1 drop · 2 slide · 3 tumble · 4 flip · 5 toss-arc
  // Personality, direction, velocity, overshoot, delay, landing angle and
  // final scale are all rolled fresh each mount — never choreographed twice.
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    const R = Math.random
    const persona = Math.floor(R() * 6)
    const side = R() > 0.5 ? 1 : -1
    const speed = 0.82 + R() * 0.45 // per-photo velocity feel
    const delay = slot * (0.09 + R() * 0.12) + R() * 0.16
    const fs = 0.94 + R() * 0.1 // slight final-scale variation
    const landRot = target.rot + (R() - 0.5) * 0.14 // landing angle jitter
    const tl = gsap.timeline({ delay })
    tl.to(anim.current, { base: 1, duration: 0.22 }, 0)
    g.scale.setScalar(fs)
    g.rotation.set(0, 0, 0)
    const rnd = R // entrance chaos is non-deterministic on purpose

    const squashSlap = (at, strength = 1) => {
      tl.to(g.scale, { x: fs * (1 + 0.09 * strength), y: fs * (1 - 0.06 * strength), z: 1, duration: 0.08, ease: 'power1.in' }, at)
      tl.to(g.scale, { x: fs, y: fs, z: 1, duration: 0.3, ease: 'elastic.out(1.2, 0.5)' }, at + 0.08)
      tl.call(() => anim.current.base > 0.5 && sfx('slap'), null, at)
    }

    switch (persona) {
      case 1: {
        // DROP: falls from above, bounces on the parchment
        g.position.set(target.x + (rnd() - 0.5) * 0.3, 1.8 + rnd() * 0.7, target.z + 0.4 + rnd() * 0.3)
        g.rotation.z = (rnd() - 0.5) * 1.1
        const dur = (0.55 + rnd() * 0.25) / speed
        tl.to(g.position, { y: target.y, duration: dur, ease: 'bounce.out' }, 0)
        tl.to(g.position, { x: target.x, z: target.z, duration: dur * 0.8, ease: 'power2.out' }, 0)
        tl.to(g.rotation, { z: landRot, duration: dur + 0.2, ease: 'elastic.out(1, 0.5)' }, 0)
        squashSlap(dur * 0.55, 0.7 + rnd() * 0.5)
        break
      }
      case 2: {
        // SLIDE: scrapes in across the parchment and stops at an angle
        g.position.set(side * (2.2 + rnd() * 0.7), target.y + (rnd() - 0.5) * 0.3, target.z + 0.015)
        g.rotation.z = landRot + side * (0.3 + rnd() * 0.4)
        const dur = (0.6 + rnd() * 0.25) / speed
        tl.to(g.position, { x: target.x, y: target.y, duration: dur, ease: 'power3.out' }, 0)
        tl.to(g.position, { z: target.z, duration: dur * 0.45, ease: 'power1.out' }, dur * 0.55)
        tl.to(g.rotation, { z: landRot, duration: dur + 0.1, ease: 'power2.out' }, 0)
        tl.call(() => anim.current.base > 0.5 && sfx('flip'), null, 0.05)
        break
      }
      case 3: {
        // TUMBLE: enters from a corner, spinning full turns
        g.position.set(side * (1.8 + rnd() * 0.6), 1.4 + rnd() * 0.7, 0.7 + rnd() * 0.4)
        g.rotation.z = side * Math.PI * (0.3 + rnd() * 0.5)
        const spins = 2 + Math.floor(rnd() * 3)
        const dur = (0.75 + rnd() * 0.3) / speed
        tl.to(g.position, { x: target.x, y: target.y, z: target.z, duration: dur, ease: 'power2.out' }, 0)
        tl.to(g.rotation, { z: landRot - side * Math.PI * spins, duration: dur, ease: 'power2.out' }, 0)
        squashSlap(dur * 0.92, 0.6 + rnd() * 0.5)
        break
      }
      case 4: {
        // FLIP: turns over mid-air like a card being dealt
        g.position.set(target.x + side * (0.7 + rnd() * 0.5), target.y + 0.3 + rnd() * 0.4, 0.9 + rnd() * 0.35)
        g.rotation.set(0, Math.PI * (rnd() > 0.5 ? 1 : -1), (rnd() - 0.5) * 0.8)
        const dur = (0.62 + rnd() * 0.22) / speed
        tl.to(g.position, { x: target.x, y: target.y, z: target.z, duration: dur, ease: 'power3.out' }, 0)
        tl.to(g.rotation, { y: 0, duration: dur, ease: 'power2.out' }, 0)
        tl.to(g.rotation, { z: landRot, duration: dur + 0.15, ease: 'elastic.out(1, 0.5)' }, 0)
        squashSlap(dur * 0.9, 0.5 + rnd() * 0.4)
        break
      }
      case 5: {
        // TOSS: a lazy arc up and over, tipping forward as it lands
        g.position.set(target.x + side * (1.3 + rnd() * 0.6), target.y - (0.5 + rnd() * 0.4), 0.5)
        g.rotation.set(-(0.7 + rnd() * 0.4), 0, landRot + side * (0.5 + rnd() * 0.4))
        const mid = (0.32 + rnd() * 0.12) / speed
        const fall = (0.36 + rnd() * 0.12) / speed
        tl.to(g.position, { x: target.x + side * (0.3 + rnd() * 0.2), y: target.y + 0.35 + rnd() * 0.2, z: 0.8, duration: mid, ease: 'power1.out' }, 0)
        tl.to(g.position, { x: target.x, y: target.y, z: target.z, duration: fall, ease: 'power1.in' }, mid)
        tl.to(g.rotation, { x: 0, z: landRot, duration: mid + fall, ease: 'power2.out' }, 0)
        squashSlap(mid + fall, 0.8 + rnd() * 0.4)
        break
      }
      default: {
        // THROW: from the side, spin, overshoot, slap down (the classic)
        const fromBottom = rnd() > 0.7
        g.position.set(
          fromBottom ? target.x + (rnd() - 0.5) * 0.6 : side * (2.2 + rnd() * 1.1),
          fromBottom ? -1.9 : (rnd() - 0.5) * 1.7,
          0.9 + rnd() * 0.4
        )
        g.rotation.z = side * (0.7 + rnd() * 1.7)
        const overshoot = 0.05 + rnd() * 0.12 // how far past the mark it flies
        const overX = target.x + (target.x - g.position.x) * -overshoot
        const overY = target.y + 0.1 + rnd() * 0.14
        const dur = (0.45 + rnd() * 0.3) / speed
        tl.to(g.position, { x: overX, y: overY, z: target.z + 0.22, duration: dur, ease: 'power2.out' }, 0)
        tl.to(g.rotation, { z: landRot + (rnd() - 0.5) * 0.6, duration: dur, ease: 'power2.out' }, 0)
        tl.to(g.position, { x: target.x, y: target.y, z: target.z, duration: 0.3 + rnd() * 0.12, ease: 'back.out(2.6)' }, dur)
        tl.to(g.rotation, { z: landRot, duration: 0.42, ease: 'elastic.out(1, 0.45)' }, dur)
        squashSlap(dur, 0.8 + rnd() * 0.5)
        break
      }
    }
    return () => tl.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- re-scatter when the slot layout changes (page change, survivor) ----
  useEffect(() => {
    const g = groupRef.current
    if (!g || anim.current.base === 0) return
    gsap.to(g.position, { x: target.x, y: target.y, z: target.z, duration: 0.7, ease: 'back.out(1.8)' })
    gsap.to(g.rotation, { z: target.rot, duration: 0.7, ease: 'elastic.out(1, 0.5)' })
  }, [target])

  // ---- flicked away when leaving ------------------------------------------
  useEffect(() => {
    if (!leaving) return
    const g = groupRef.current
    if (!g) return
    gsap.killTweensOf(g.position)
    gsap.killTweensOf(g.rotation)
    const side = target.x > 0 ? 1 : -1
    gsap.to(g.position, {
      x: side * (2.6 + rnd() * 0.8),
      y: g.position.y + (rnd() - 0.5) * 1.4,
      z: g.position.z + 0.5,
      duration: 0.55,
      ease: 'power2.in',
    })
    gsap.to(g.rotation, { z: g.rotation.z + side * (1.6 + rnd()), duration: 0.55, ease: 'power1.in' })
    gsap.to(anim.current, { base: 0, duration: 0.45, delay: 0.1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  const activate = (e) => {
    e.stopPropagation()
    focusImage(focused ? null : img.id)
  }

  // ---- idle paper wobble + visibility --------------------------------------
  useFrame(({ clock }, dt) => {
    const g = groupRef.current
    const w = wobbleRef.current
    if (!g || !w) return
    const t = clock.getElapsedTime()
    const a = anim.current

    const shiver = hovered ? Math.sin(t * 16) * 0.028 : 0
    w.rotation.z = Math.sin(t * 1.2 + seed) * 0.02 + shiver
    w.position.z = Math.sin(t * 0.85 + seed * 1.7) * 0.016 + a.hoverLift
    a.hoverLift += ((hovered ? 0.06 : 0) - a.hoverLift) * Math.min(1, dt * 8)
    const sc = 1 + (hovered ? 0.08 : 0)
    w.scale.x += (sc - w.scale.x) * Math.min(1, dt * 8)
    w.scale.y = w.scale.x

    const visTarget = (hidden && !leaving ? 0 : 1) * (focused ? 0.25 : 1)
    a.vis += (visTarget - a.vis) * Math.min(1, dt * 5)
    const o = a.base * a.vis
    materials.photo.opacity = o
    materials.frame.opacity = o * 0.96
    materials.tape.opacity = o * 0.9
    materials.shadow.opacity = o * 0.5
    if (materials.caption) materials.caption.opacity = o * 0.95
    g.visible = o > 0.02
  })

  return (
    <group ref={groupRef} visible={false}>
      <group ref={wobbleRef}>
        {/* drop shadow cast onto the parchment below */}
        <mesh material={materials.shadow} position={[0.02, -0.03, -0.02]} raycast={() => null}>
          <planeGeometry args={[imgW * 1.45, imgH * 1.5]} />
        </mesh>
        {/* aged polaroid backing for real photos (placeholders draw their own) */}
        {isReal && (
          <mesh material={materials.frame} position={[0, -0.035, -0.004]}>
            <planeGeometry args={[imgW + 0.06, imgH + 0.14]} />
          </mesh>
        )}
        <mesh
          material={materials.photo}
          onClick={activate}
          onDoubleClick={activate}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <planeGeometry args={[imgW, imgH]} />
        </mesh>
        {/* handwritten caption on the frame foot, reference-style */}
        {materials.caption && (
          <mesh material={materials.caption} position={[0, -imgH / 2 - 0.045, 0.002]} raycast={() => null}>
            <planeGeometry args={[imgW * 0.92, 0.075]} />
          </mesh>
        )}
        {/* fastening: some prints are pinned, others taped at two corners */}
        {usePin ? (
          <mesh position={[0, imgH / 2 - 0.015, 0.012]} raycast={() => null}>
            <sphereGeometry args={[0.017, 12, 10]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
          </mesh>
        ) : (
          <>
            <mesh material={materials.tape} position={[-imgW / 2 + 0.02, imgH / 2 - 0.01, 0.003]} rotation={[0, 0, 0.7]} raycast={() => null}>
              <planeGeometry args={[0.14, 0.05]} />
            </mesh>
            <mesh material={materials.tape} position={[imgW / 2 - 0.02, imgH / 2 - 0.01, 0.003]} rotation={[0, 0, -0.7]} raycast={() => null}>
              <planeGeometry args={[0.14, 0.05]} />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}
