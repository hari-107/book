import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import { NAV_ITEMS } from '../data/compileBook.js'
import { GOLD, INK, INK_SOFT } from '../constants.js'
import { inRect } from './Page.jsx'

/**
 * The book's own navigation mechanism, opened by the logo. Rendered as a
 * parchment leaf attached to the book (it travels with it when held), listing
 * every page — including the deeper section pages the Index does not carry.
 * Visually it is part of the object: aged paper, gilt border, book serifs.
 */

const CW = 1240
const CH = 1000

function buildNavTexture() {
  const c = document.createElement('canvas')
  c.width = CW
  c.height = CH
  const ctx = c.getContext('2d')
  const regions = []

  // aged parchment
  const grad = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.15, CW / 2, CH / 2, CH * 0.75)
  grad.addColorStop(0, '#efe5cd')
  grad.addColorStop(1, '#ddcfa9')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CW, CH)
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = `rgba(110,90,55,${(Math.random() * 0.05).toFixed(3)})`
    ctx.fillRect(Math.random() * CW, Math.random() * CH, 1.4, 1.4)
  }

  // gilt double border
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 4
  ctx.strokeRect(26, 26, CW - 52, CH - 52)
  ctx.lineWidth = 1.5
  ctx.strokeRect(40, 40, CW - 80, CH - 80)

  ctx.fillStyle = INK
  ctx.font = '48px "Base 02", "Rye", "IM Fell English SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('MAP OF THE BOOK', CW / 2, 122)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(CW / 2 - 150, 150)
  ctx.lineTo(CW / 2 + 150, 150)
  ctx.stroke()

  ctx.font = '600 30px "Caveat", cursive'
  ctx.fillStyle = INK_SOFT
  ctx.fillText('every leaf of the book — pick one', CW / 2, 194)

  // two columns — the book has many leaves
  const margin = 86
  const gap = 60
  const colW = (CW - margin * 2 - gap) / 2
  const rowH = 62
  const topY = 262
  const perCol = Math.ceil(NAV_ITEMS.length / 2)

  NAV_ITEMS.forEach((item, i) => {
    const col = Math.floor(i / perCol)
    const x0 = margin + col * (colW + gap)
    const y = topY + (i % perCol) * rowH
    const indent = item.sectionTitle && !item.isSectionStart
    const rowTop = y - 32

    ctx.textAlign = 'left'
    if (indent) {
      ctx.fillStyle = INK_SOFT
      ctx.font = '600 28px "Caveat", cursive'
      ctx.fillText(`↳ ${item.label}`, x0 + 36, y)
    } else {
      ctx.fillStyle = INK
      ctx.font = item.sectionTitle ? '24px "Special Elite", monospace' : '600 30px "Caveat", cursive'
      ctx.fillText(item.sectionTitle ? item.label.toUpperCase() : item.label, x0, y)
    }

    ctx.textAlign = 'right'
    ctx.fillStyle = INK_SOFT
    ctx.font = '23px "Special Elite", monospace'
    ctx.fillText(String(item.pageNumber).padStart(2, '0'), x0 + colW, y)

    regions.push({
      u0: (x0 - 18) / CW,
      v0: 1 - (y + 14) / CH,
      u1: (x0 + colW + 18) / CW,
      v1: 1 - rowTop / CH,
      faceIndex: item.faceIndex,
    })
  })

  // column divider
  ctx.strokeStyle = 'rgba(110,86,56,0.4)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([2, 6])
  ctx.beginPath()
  ctx.moveTo(CW / 2, topY - 34)
  ctx.lineTo(CW / 2, topY + perCol * rowH - 20)
  ctx.stroke()
  ctx.setLineDash([])

  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { texture, regions }
}

export default function BookNavigation({ z }) {
  const navOpen = useBookStore((s) => s.navOpen)
  const setNavOpen = useBookStore((s) => s.setNavOpen)
  const api = useBookStore((s) => s.api)
  const groupRef = useRef()
  const matRef = useRef()
  const backRef = useRef()

  const { texture, regions } = useMemo(() => buildNavTexture(), [])
  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    if (!navOpen || !groupRef.current) return
    const g = groupRef.current
    g.scale.set(0.85, 0.8, 0.85)
    gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.6)' })
    if (matRef.current) {
      matRef.current.opacity = 0
      gsap.to(matRef.current, { opacity: 1, duration: 0.4, ease: 'power1.out' })
    }
    if (backRef.current) {
      backRef.current.opacity = 0
      gsap.to(backRef.current, { opacity: 1, duration: 0.4, ease: 'power1.out' })
    }
  }, [navOpen])

  if (!navOpen) return null

  const W = 1.28
  const H = (W * CH) / CW

  const pick = (e) => {
    e.stopPropagation()
    const uv = e.uv
    if (!uv) return
    const hit = regions.find((r) => inRect(uv, r))
    if (hit && api) {
      setNavOpen(false)
      api.jumpToFace(hit.faceIndex)
    }
  }

  return (
    <group ref={groupRef} position={[0, 0.06, z]} rotation={[0.08, 0, 0]}>
      {/* leather backing board */}
      <mesh position={[0, 0, -0.006]} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <planeGeometry args={[W + 0.06, H + 0.06]} />
        <meshStandardMaterial ref={backRef} color="#1b2338" roughness={0.6} transparent />
      </mesh>
      <mesh
        onClick={pick}
        onDoubleClick={pick}
        onPointerMove={(e) => {
          const over = e.uv && regions.some((r) => inRect(e.uv, r))
          document.body.style.cursor = over ? 'pointer' : 'auto'
        }}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial ref={matRef} map={texture} transparent roughness={0.8} />
      </mesh>
    </group>
  )
}
