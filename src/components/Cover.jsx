import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { COVER_W, COVER_H, COVER_T, PAGE_W, PAGE_H } from '../constants.js'
import { emblemTexture, spineTexture } from '../three/proceduralTextures.js'
import { bookMeta } from '../data/bookContent.js'
import { GOLD } from '../constants.js'
import { useDoubleTap } from '../utils/doubleTap.js'

/**
 * Hardcover boards. The front cover lives inside a pivot group hinged at the
 * spine (x = 0); Book animates the pivot's rotation and z position so the
 * opened cover lands flush with the back cover. The inner endpaper is part
 * of the cover itself so it travels with the board during the opening
 * animation, and the embossed emblem plane doubles as the logo target while
 * the book is closed.
 */

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

      {/* inner endpaper — baked π rotation so it faces the pages when closed and up when open */}
      <mesh material={endpaperMat} position={[PAGE_W / 2 + 0.015, 0, -0.0022]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
      </mesh>

      {/* embossed emblem, slightly raised off the board */}
      <mesh
        position={[COVER_W / 2 - 0.015, 0.16, COVER_T + 0.0025]}
        onDoubleClick={emblemDouble}
        onPointerUp={emblemTap}
        onClick={(e) => {
          e.stopPropagation()
          onBodyClick(e)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <planeGeometry args={[0.58, 0.58]} />
        <meshStandardMaterial map={artTex} transparent metalness={0.65} roughness={0.35} />
      </mesh>

      {/* gilt title beneath the emblem */}
      <TitlePlate />
    </group>
  )
})

function TitlePlate() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 160
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.fillStyle = GOLD
    ctx.font = '600 92px "Playfair Display", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = '26px'
    ctx.fillText(bookMeta.spineTitle, c.width / 2 + 13, c.height / 2)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
  return (
    <mesh position={[COVER_W / 2 - 0.015, -0.32, COVER_T + 0.002]}>
      <planeGeometry args={[0.78, 0.122]} />
      <meshStandardMaterial map={tex} transparent metalness={0.6} roughness={0.4} />
    </mesh>
  )
}

export function BackCover({ leatherMat, endpaperMat }) {
  return (
    <group position={[0, 0, -COVER_T]}>
      <CoverBoard leatherMat={leatherMat} />
      {/* endpaper glued to the inside of the back board */}
      <mesh material={endpaperMat} position={[PAGE_W / 2 + 0.015, 0, COVER_T + 0.0012]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
      </mesh>
    </group>
  )
}

export { spineTexture }
