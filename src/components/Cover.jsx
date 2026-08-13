import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { COVER_W, COVER_H, COVER_T, PAGE_W, PAGE_H, GOLD } from '../constants.js'
import { emblemTexture } from '../three/proceduralTextures.js'
import { bookMeta } from '../data/bookContent.js'
import { useDoubleTap } from '../utils/doubleTap.js'

/**
 * Thick hardcover boards for a book that has existed for decades: worn
 * leather, embossed gilt name and compass emblem, brass corner protectors.
 * The front cover lives inside a pivot group hinged at the spine; Book
 * animates the pivot's rotation and z position so the opened cover lands
 * flush with the back cover. The inner endpaper travels with the board, and
 * the compass emblem doubles as the logo target while the book is closed.
 */

const brassMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.75, roughness: 0.42 })

function BrassCorners({ z }) {
  // diagonal protector caps wrapped over each outer corner
  const corners = [
    [0.045, COVER_H / 2 - 0.045, Math.PI / 4],
    [COVER_W - 0.075, COVER_H / 2 - 0.045, -Math.PI / 4],
    [0.045, -COVER_H / 2 + 0.045, -Math.PI / 4],
    [COVER_W - 0.075, -COVER_H / 2 + 0.045, Math.PI / 4],
  ]
  return (
    <group position={[-0.015, 0, z]}>
      {corners.map(([x, y, rot], i) => (
        <mesh key={i} material={brassMat} position={[x, y, 0]} rotation={[0, 0, rot]}>
          <boxGeometry args={[0.2, 0.055, COVER_T + 0.008]} />
        </mesh>
      ))}
    </group>
  )
}

function CoverBoard({ leatherMat }) {
  return (
    <mesh material={leatherMat} position={[COVER_W / 2 - 0.015, 0, COVER_T / 2]}>
      <boxGeometry args={[COVER_W, COVER_H, COVER_T]} />
    </mesh>
  )
}

export const FrontCover = forwardRef(function FrontCover(
  { leatherMat, endpaperMat, onEmblemActivate, onBodyClick },
  ref
) {
  const artTex = useMemo(() => emblemTexture(bookMeta.monogram), [])

  const emblemDouble = (e) => {
    e.stopPropagation()
    onEmblemActivate(e)
  }
  const emblemTap = useDoubleTap(emblemDouble)

  return (
    <group ref={ref}>
      <CoverBoard leatherMat={leatherMat} />
      <BrassCorners z={COVER_T / 2} />

      {/* inner endpaper — baked π rotation so it faces the pages when closed and up when open */}
      <mesh material={endpaperMat} position={[PAGE_W / 2 + 0.015, 0, -0.0022]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
      </mesh>

      {/* embossed compass emblem, slightly raised off the leather */}
      <mesh
        position={[COVER_W / 2 - 0.015, 0.1, COVER_T + 0.003]}
        onDoubleClick={emblemDouble}
        onPointerUp={emblemTap}
        onClick={(e) => {
          e.stopPropagation()
          onBodyClick(e)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial map={artTex} transparent metalness={0.62} roughness={0.4} />
      </mesh>

      {/* embossed gilt name + title */}
      <TitlePlate />
    </group>
  )
})

function TitlePlate() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 420
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = GOLD
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '86px "Rye", "IM Fell English SC", serif'
    ctx.fillText(bookMeta.owner, c.width / 2, 110)
    ctx.font = '54px "IM Fell English SC", serif'
    ctx.letterSpacing = '18px'
    ctx.fillText(bookMeta.title, c.width / 2 + 9, 240)
    ctx.letterSpacing = '0px'
    // tooling flourishes
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(c.width * 0.2, 320)
    ctx.quadraticCurveTo(c.width / 2, 355, c.width * 0.8, 320)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(c.width / 2, 338, 7, 0, Math.PI * 2)
    ctx.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
  return (
    <mesh position={[COVER_W / 2 - 0.015, -0.42, COVER_T + 0.0025]}>
      <planeGeometry args={[1.0, 0.41]} />
      <meshStandardMaterial map={tex} transparent metalness={0.58} roughness={0.42} />
    </mesh>
  )
}

export function BackCover({ leatherMat, endpaperMat }) {
  return (
    <group position={[0, 0, -COVER_T]}>
      <CoverBoard leatherMat={leatherMat} />
      <BrassCorners z={COVER_T / 2} />
      {/* endpaper glued to the inside of the back board */}
      <mesh material={endpaperMat} position={[PAGE_W / 2 + 0.015, 0, COVER_T + 0.0012]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
      </mesh>
    </group>
  )
}
