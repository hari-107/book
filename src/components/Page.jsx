import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PAGE_W, PAGE_H, EDGE_ZONE } from '../constants.js'
import { useDoubleTap } from '../utils/doubleTap.js'

/**
 * A static, readable page face — the top surface of a page stack. Carries
 * the printed CanvasTexture, the double-click hit logic (via the handler the
 * Book supplies) and the subtle hover affordance on the outer 15% edge zone
 * so page turning is discoverable without any UI chrome.
 */

export function inRect(uv, r) {
  return uv.x >= r.u0 && uv.x <= r.u1 && uv.y >= r.v0 && uv.y <= r.v1
}

export default function StaticPageFace({ side, texture, regions, z, geometry, onDoubleActivate }) {
  const [edgeHover, setEdgeHover] = useState(false)
  const hintRef = useRef()

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }),
    []
  )
  material.map = texture

  const inEdgeZone = (uv) => (side === 'right' ? uv.x > 1 - EDGE_ZONE : uv.x < EDGE_ZONE)

  const handleDouble = (e) => {
    e.stopPropagation()
    onDoubleActivate(e, side)
  }
  const tap = useDoubleTap(handleDouble)

  const handleMove = (e) => {
    const uv = e.uv
    if (!uv) return
    const edge = inEdgeZone(uv)
    const overRegion = regions.some((r) => inRect(uv, r))
    if (edge !== edgeHover) setEdgeHover(edge)
    document.body.style.cursor = edge || overRegion ? 'pointer' : 'auto'
  }

  const handleOut = () => {
    setEdgeHover(false)
    document.body.style.cursor = 'auto'
  }

  // Edge hint fades in/out smoothly
  useFrame((_, dt) => {
    if (!hintRef.current) return
    const mat = hintRef.current.material
    const target = edgeHover ? 0.16 : 0
    mat.opacity += (target - mat.opacity) * Math.min(1, dt * 10)
    hintRef.current.visible = mat.opacity > 0.005
  })

  const hintW = PAGE_W * EDGE_ZONE
  const hintX = side === 'right' ? PAGE_W - hintW / 2 : -PAGE_W + hintW / 2

  return (
    <group position={[0, 0, z]}>
      {/* real damaged-paper silhouette — spine-anchored, torn corners missing from the mesh */}
      <mesh
        geometry={geometry}
        material={material}
        onDoubleClick={handleDouble}
        onPointerUp={tap}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
      />
      {/* hover affordance: a soft warm sheen over the edge zone */}
      <mesh ref={hintRef} position={[hintX, 0, 0.0015]} visible={false} raycast={() => null}>
        <planeGeometry args={[hintW, PAGE_H]} />
        <meshBasicMaterial color="#f0d99a" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
