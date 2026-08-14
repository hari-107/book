import { forwardRef } from 'react'
import { COVER_W, COVER_H, COVER_T, PAGE_W, PAGE_H } from '../constants.js'
import { useDoubleTap } from '../utils/doubleTap.js'

/**
 * Hardcover boards for a journal that has survived decades. Realism comes
 * from the material itself: the front board's leather carries blind-embossed
 * tooling frames, a compass rose and the owner's name — pressed INTO the
 * grain with patchy worn gold-leaf remnants (painted into the color, height
 * and roughness maps) — instead of bright graphics pasted on top. No toy
 * hardware; the wear tells the story.
 *
 * The front cover lives inside a pivot group hinged at the spine; Book
 * animates the pivot's rotation and z position so the opened cover lands
 * flush with the back cover. The inner endpaper travels with the board. An
 * invisible disc over the embossed compass keeps it working as the logo
 * target while the book is closed.
 */

function CoverBoard({ material }) {
  return (
    <mesh material={material} position={[COVER_W / 2 - 0.015, 0, COVER_T / 2]}>
      <boxGeometry args={[COVER_W, COVER_H, COVER_T]} />
    </mesh>
  )
}

export const FrontCover = forwardRef(function FrontCover(
  { frontLeatherMat, endpaperMat, onEmblemActivate, onBodyClick },
  ref
) {
  const emblemDouble = (e) => {
    e.stopPropagation()
    onEmblemActivate(e)
  }
  const emblemTap = useDoubleTap(emblemDouble)

  return (
    <group ref={ref}>
      <CoverBoard material={frontLeatherMat} />

      {/* inner endpaper — baked π rotation so it faces the pages when closed and up when open */}
      <mesh material={endpaperMat} position={[PAGE_W / 2 + 0.015, 0, -0.0022]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
      </mesh>

      {/* invisible hit target over the embossed compass rose (the logo) */}
      <mesh
        position={[COVER_W / 2 - 0.015, COVER_H * 0.16, COVER_T + 0.002]}
        onDoubleClick={emblemDouble}
        onPointerUp={emblemTap}
        onClick={(e) => {
          e.stopPropagation()
          onBodyClick(e)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <circleGeometry args={[0.19, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
})

export function BackCover({ plainLeatherMat, endpaperMat }) {
  return (
    <group position={[0, 0, -COVER_T]}>
      <CoverBoard material={plainLeatherMat} />
      {/* endpaper glued to the inside of the back board */}
      <mesh material={endpaperMat} position={[PAGE_W / 2 + 0.015, 0, COVER_T + 0.0012]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
      </mesh>
    </group>
  )
}
