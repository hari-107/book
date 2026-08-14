import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import { PAGE_W, PAGE_H, PAGE_TEX_W, PAGE_TEX_H, INK_RED } from '../constants.js'
import { sfx } from '../utils/sound.js'

/**
 * The 20% of insanity on top of the physical realism: page decorations that
 * live. A rubber stamp thumps down when a section opens (click it to stamp
 * again), an arrow sketches itself onto the spread, and the compass drawn on
 * the About pages grows a real needle that idles restlessly — spin it with a
 * click. The pages themselves stay perfectly stable; only the garnish moves.
 * Some doodles do nothing at all. That's on purpose.
 */

const STAMP_TEXT = {
  explorer: 'EXPLORER',
  inventor: 'WORKSHOP',
  journal: 'LOGBOOK',
  blueprint: 'EVIDENCE',
  stamps: 'CERTIFIED',
  treasure: 'TREASURE',
  reports: 'CLASSIFIED',
  scholar: 'ACADEMY',
  chaos: '?!',
  letter: 'PAR AVION',
}

// the compass doodle's location in page-texture space (explorer pages)
const COMPASS_X = PAGE_TEX_W - 150
const COMPASS_Y = 300

function texToLocal(X, Y, side) {
  const x = side === 'right' ? (X / PAGE_TEX_W) * PAGE_W : -(1 - X / PAGE_TEX_W) * PAGE_W
  const y = (0.5 - Y / PAGE_TEX_H) * PAGE_H
  return [x, y]
}

function stampTexture(text) {
  const c = document.createElement('canvas')
  c.width = 360
  c.height = 140
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.strokeStyle = INK_RED
  ctx.fillStyle = INK_RED
  ctx.lineWidth = 6
  ctx.strokeRect(10, 14, c.width - 20, c.height - 28)
  ctx.lineWidth = 2
  ctx.strokeRect(22, 26, c.width - 44, c.height - 52)
  ctx.font = `${text.length > 8 ? 40 : 52}px "Special Elite", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, c.width / 2, c.height / 2 + 3)
  // worn patches
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 26; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * c.width, Math.random() * c.height, 3 + Math.random() * 9, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** A section stamp that thumps down when the spread settles. Click: stamp it again. */
function SectionStamp({ face, side }) {
  const ref = useRef()
  const matRef = useRef()
  const tex = useMemo(() => stampTexture(STAMP_TEXT[face.theme] || 'NOTED'), [face.theme])
  useEffect(() => () => tex.dispose(), [tex])

  const play = (delay = 0) => {
    const g = ref.current
    const m = matRef.current
    if (!g || !m) return
    gsap.killTweensOf(g.scale)
    gsap.killTweensOf(m)
    g.scale.setScalar(2.1)
    m.opacity = 0
    gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'power3.in', delay })
    gsap.to(m, { opacity: 0.82, duration: 0.18, delay })
    gsap.delayedCall(delay + 0.19, () => sfx('thump'))
  }

  useEffect(() => {
    play(0.7)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face.id])

  const x = side === 'right' ? 0.82 : -0.82
  return (
    <group ref={ref} position={[x, -0.5, 0.008]} rotation={[0, 0, side === 'right' ? -0.14 : 0.12]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          play(0)
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <planeGeometry args={[0.42, 0.165]} />
        <meshBasicMaterial ref={matRef} map={tex} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** An arrow that sketches itself onto the spread shortly after it settles. */
function SelfDrawingArrow({ spread }) {
  const seed = spread * 31 + 5
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return { canvas: c, tex: t }
  }, [])
  useEffect(() => () => tex.dispose(), [tex])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    const proxy = { p: 0 }
    const tween = gsap.to(proxy, {
      p: 1,
      duration: 0.8,
      delay: 1.1,
      ease: 'power1.inOut',
      onUpdate: () => {
        ctx.clearRect(0, 0, 256, 128)
        ctx.strokeStyle = 'rgba(51,38,21,0.8)'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.beginPath()
        const steps = Math.floor(30 * proxy.p)
        for (let i = 0; i <= steps; i++) {
          const t = i / 30
          const x = 20 + t * 190
          const y = 64 + Math.sin(t * Math.PI) * -26 + Math.sin(t * 21 + seed) * 3
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
        if (proxy.p > 0.92) {
          ctx.beginPath()
          ctx.moveTo(210, 64)
          ctx.lineTo(192, 50)
          ctx.moveTo(210, 64)
          ctx.lineTo(190, 74)
          ctx.stroke()
        }
        tex.needsUpdate = true
      },
    })
    return () => tween.kill()
  }, [canvas, tex, seed, spread])

  const x = seed % 2 === 0 ? 0.42 : -0.46
  const y = -0.06 - (seed % 3) * 0.12
  const rot = ((seed % 5) - 2) * 0.16
  return (
    <mesh position={[x, y, 0.006]} rotation={[0, 0, rot]} raycast={() => null}>
      <planeGeometry args={[0.4, 0.2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

/** The About pages' compass gains a live needle. It idles restlessly; click to send it spinning. */
function CompassNeedle({ side }) {
  const needleRef = useRef()
  const spinning = useRef(false)
  const [x, y] = texToLocal(COMPASS_X, COMPASS_Y, side)

  useFrame(({ clock }) => {
    const n = needleRef.current
    if (!n || spinning.current) return
    const t = clock.getElapsedTime()
    n.rotation.z = Math.sin(t * 1.7) * 0.28 + Math.sin(t * 4.3) * 0.07
  })

  const spin = (e) => {
    e.stopPropagation()
    const n = needleRef.current
    if (!n || spinning.current) return
    spinning.current = true
    sfx('tick')
    gsap.to(n.rotation, {
      z: n.rotation.z + Math.PI * 6,
      duration: 1.6,
      ease: 'power3.out',
      onComplete: () => {
        spinning.current = false
        sfx('tick')
      },
    })
  }

  return (
    <group position={[x, y, 0.007]}>
      <group ref={needleRef}>
        <mesh raycast={() => null}>
          <planeGeometry args={[0.012, 0.085]} />
          <meshBasicMaterial color="#8a2418" transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.02, -0.0005]} raycast={() => null}>
          <planeGeometry args={[0.009, 0.045]} />
          <meshBasicMaterial color="#33261a" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      </group>
      {/* click target over the whole compass */}
      <mesh
        onClick={spin}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <circleGeometry args={[0.085, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function PageDecoAnimations({ spread, visibleFaces, stackTopZ }) {
  const isOpen = useBookStore((s) => s.isOpen)
  const navOpen = useBookStore((s) => s.navOpen)
  const turning = useBookStore((s) => s.turning)
  if (!isOpen || navOpen || turning) return null

  const hasContent = visibleFaces.some((f) => f.kind === 'content')

  return (
    <group position={[0, 0, stackTopZ]}>
      {visibleFaces.map((f) => {
        const side = f.faceIndex % 2 === 0 ? 'right' : 'left'
        return (
          <group key={f.id}>
            {f.isSectionStart && <SectionStamp face={f} side={side} />}
            {f.theme === 'explorer' && <CompassNeedle side={side} />}
          </group>
        )
      })}
      {hasContent && spread % 2 === 1 && <SelfDrawingArrow spread={spread} />}
    </group>
  )
}
