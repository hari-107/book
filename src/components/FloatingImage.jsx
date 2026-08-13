import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useBookStore } from '../store/useBookStore.js'
import { imageTextureCache } from '../three/imageCache.js'
import { placeholderImageTexture, captionTexture } from '../three/proceduralTextures.js'

const TWO_PI = Math.PI * 2
const ORBIT_SPEED = 0.24

const tmpV = new THREE.Vector3()
const tmpQ = new THREE.Quaternion()
const parentQ = new THREE.Quaternion()

/**
 * One floating image. Orbits its page in the shared ring; hover slows its
 * motion and lifts it slightly; click (or tap) pauses it and brings it to a
 * camera-facing focus position with its caption strip. All motion is
 * spring-smoothed, so orbit re-arrangements on page changes glide instead of
 * snapping.
 */
export default function FloatingImage({ img, slot, count, baseAngleRef, hidden, seed }) {
  const groupRef = useRef()
  const captionRef = useRef()
  const { camera } = useThree()
  const [hovered, setHovered] = useState(false)

  const focusedImage = useBookStore((s) => s.focusedImage)
  const focusImage = useBookStore((s) => s.focusImage)
  const focused = focusedImage === img.id

  const state = useRef({
    angle: (slot / Math.max(1, count)) * TWO_PI,
    opacity: 0,
    scale: 0.6,
    captionOpacity: 0,
    slow: 1,
  })

  const texture = useMemo(() => {
    const cached = imageTextureCache.get(img.id)
    return cached || placeholderImageTexture(img.caption, seed)
  }, [img.id, img.caption, seed])

  const aspect = texture.image && texture.image.height ? texture.image.width / texture.image.height : 640 / 460
  const imgW = 0.46
  const imgH = imgW / Math.max(0.6, Math.min(2.2, aspect))

  const captionTex = useMemo(() => {
    let text = img.caption || 'Untitled'
    if (img.detailPage) text += ` — See page ${img.detailPage} for full details.`
    return captionTexture(text)
  }, [img.caption, img.detailPage])

  const materials = useMemo(() => {
    return {
      frame: new THREE.MeshStandardMaterial({ color: '#f4ecda', roughness: 0.6, transparent: true, opacity: 0 }),
      photo: new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, toneMapped: false }),
      caption: new THREE.MeshBasicMaterial({ map: captionTex, transparent: true, opacity: 0, depthWrite: false }),
    }
  }, [texture, captionTex])

  const activate = (e) => {
    e.stopPropagation()
    focusImage(focused ? null : img.id)
  }

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g || !g.parent) return
    const s = state.current
    const k = 1 - Math.exp(-dt * 4.5)

    // ---- motion -------------------------------------------------------
    const slowTarget = focused ? 0 : hovered ? 0.22 : 1
    s.slow += (slowTarget - s.slow) * Math.min(1, dt * 6)
    s.angle += dt * ORBIT_SPEED * s.slow
    // spring gently back toward the canonical slot so spacing stays even
    const canonical = baseAngleRef.current + (slot / Math.max(1, count)) * TWO_PI
    s.angle += (canonical - s.angle) * Math.min(1, dt * 0.7)

    // ---- target transform ----------------------------------------------
    if (focused) {
      // camera-facing focus anchor, converted into book-local space
      camera.getWorldDirection(tmpV)
      tmpV.multiplyScalar(1.7).add(camera.position)
      g.parent.worldToLocal(tmpV)
      g.position.lerp(tmpV, k)
      g.parent.getWorldQuaternion(parentQ).invert()
      tmpQ.copy(parentQ).multiply(camera.quaternion)
      g.quaternion.slerp(tmpQ, k)
      s.scale += (2.1 - s.scale) * k
      s.captionOpacity += (1 - s.captionOpacity) * Math.min(1, dt * 5)
    } else {
      const rx = 1.16 + 0.05 * count
      const ry = 0.5
      const a = s.angle
      tmpV.set(Math.cos(a) * rx, Math.sin(a) * ry, 0.36 + Math.sin(a + slot) * 0.16)
      g.position.lerp(tmpV, k)
      // billboard toward camera
      g.parent.getWorldQuaternion(parentQ).invert()
      tmpQ.copy(parentQ).multiply(camera.quaternion)
      g.quaternion.slerp(tmpQ, k)
      const breathe = 1 + 0.1 * Math.sin(a * 2 + slot * 1.7)
      const scaleTarget = (hovered ? 1.14 : 1) * breathe
      s.scale += (scaleTarget - s.scale) * k
      s.captionOpacity += (0 - s.captionOpacity) * Math.min(1, dt * 7)
    }

    // ---- visibility -----------------------------------------------------
    const opacityTarget = hidden && !focused ? 0 : 1
    s.opacity += (opacityTarget - s.opacity) * Math.min(1, dt * 5)
    g.scale.setScalar(s.scale)
    materials.photo.opacity = s.opacity
    materials.frame.opacity = s.opacity * 0.95
    materials.caption.opacity = s.captionOpacity * s.opacity
    if (captionRef.current) captionRef.current.visible = s.captionOpacity > 0.02
    g.visible = s.opacity > 0.02
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* print backing / white border */}
      <mesh material={materials.frame} position={[0, 0, -0.004]}>
        <planeGeometry args={[imgW + 0.05, imgH + 0.05]} />
      </mesh>
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
      {/* caption strip — visible only while focused */}
      <mesh ref={captionRef} material={materials.caption} position={[0, -imgH / 2 - 0.13, 0]} visible={false} raycast={() => null}>
        <planeGeometry args={[0.62, 0.13]} />
      </mesh>
    </group>
  )
}
