import { useMemo } from 'react'
import * as THREE from 'three'
import { PAGE_W, PAGE_H, SHEET_T } from '../constants.js'
import { pageEdgeTexture, paperColorTexture } from '../three/proceduralTextures.js'

/**
 * A solid stack of unturned (or turned) sheets. Rendering the block as one
 * box with striated edge textures — instead of dozens of individual sheet
 * meshes — keeps the page count cheap and completely free of z-fighting.
 * The top surface is covered by a textured static page face, so only the
 * edges of this box are ever seen.
 */
export default function PageBlock({ side, sheets }) {
  const mats = useMemo(() => {
    const edge = pageEdgeTexture()
    const edgeMat = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.9 })
    const edgeTop = edge.clone()
    edgeTop.rotation = Math.PI / 2
    edgeTop.center.set(0.5, 0.5)
    edgeTop.needsUpdate = true
    const edgeTopMat = new THREE.MeshStandardMaterial({ map: edgeTop, roughness: 0.9 })
    const paperMat = new THREE.MeshStandardMaterial({ map: paperColorTexture(), roughness: 0.92 })
    // box material order: +x, -x, +y, -y, +z, -z — the fore-edge faces away from the spine
    return side === 'right'
      ? [edgeMat, paperMat, edgeTopMat, edgeTopMat, paperMat, paperMat]
      : [paperMat, edgeMat, edgeTopMat, edgeTopMat, paperMat, paperMat]
  }, [side])

  if (sheets <= 0) return null
  const h = sheets * SHEET_T
  const x = side === 'right' ? PAGE_W / 2 : -PAGE_W / 2
  return (
    <mesh material={mats} position={[x, 0, h / 2]} scale={[1, 1, h]}>
      <boxGeometry args={[PAGE_W, PAGE_H, 1]} />
    </mesh>
  )
}
