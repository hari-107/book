import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { COVER_H, COVER_T, SHEET_T } from '../constants.js'
import { SHEET_COUNT } from '../data/compileBook.js'
import { spineTexture } from '../three/proceduralTextures.js'
import { bookMeta } from '../data/bookContent.js'
import { useDoubleTap } from '../utils/doubleTap.js'
import { useBookStore } from '../store/useBookStore.js'

/**
 * Rounded spine — a half-cylinder shell that bulges over the page block when
 * the book is closed and relaxes into a soft ridge behind the hinge when
 * open, keeping covers and page block visually connected from every angle.
 * While the book is open, double-clicking the spine closes it.
 */
export default function Spine({ openRef, leatherMat, onCloseBook }) {
  const meshRef = useRef()
  const R = useMemo(() => (SHEET_COUNT * SHEET_T + 2 * COVER_T) / 2, [])
  const zClosed = (SHEET_COUNT * SHEET_T) / 2
  const titleTex = useMemo(() => spineTexture(bookMeta.spineTitle), [])

  const closeDouble = (e) => {
    if (!useBookStore.getState().isOpen) return // closed: bubbles to body → open
    if (onCloseBook) onCloseBook(e)
  }
  const closeTap = useDoubleTap(closeDouble)

  useFrame(() => {
    const p = openRef.current.p
    const m = meshRef.current
    if (!m) return
    m.scale.set(0.52 - 0.1 * p, 1, 1 - 0.45 * p)
    m.position.set(-0.012, 0, zClosed + (-0.032 - zClosed) * p)
  })

  return (
    <mesh ref={meshRef} material={leatherMat} rotation={[0, 0, 0]} onDoubleClick={closeDouble} onPointerUp={closeTap}>
      {/* open-ended half shell, bulging toward -x */}
      <cylinderGeometry args={[R, R, COVER_H, 24, 1, true, Math.PI, Math.PI]} />
      {/* gilt spine title */}
      <mesh position={[-R - 0.004, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[R * 1.6, COVER_H * 0.82]} />
        <meshStandardMaterial map={titleTex} transparent metalness={0.2} roughness={0.65} />
      </mesh>
    </mesh>
  )
}
