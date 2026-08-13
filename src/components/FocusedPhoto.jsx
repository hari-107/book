import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { useBookStore } from '../store/useBookStore.js'
import { FACES, faceById } from '../data/compileBook.js'
import { imageTextureCache } from '../three/imageCache.js'
import { placeholderImageTexture, captionTexture } from '../three/proceduralTextures.js'

/**
 * The focused-photo overlay: when a photograph on the page is clicked, an
 * enlarged print jumps up in front of the camera with its handwritten
 * caption. Lives at scene level (not inside the book), so it always faces
 * the viewer regardless of how the book is being held. Click it or press
 * Esc to send it back.
 */

const ALL_IMAGES = FACES.flatMap((f) =>
  (f.images || []).map((img) => ({
    ...img,
    detailPage: img.detail && faceById[img.detail] ? faceById[img.detail].pageNumber : null,
  }))
)

function hashSeed(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

export default function FocusedPhoto() {
  const focusedImage = useBookStore((s) => s.focusedImage)
  const img = useMemo(() => ALL_IMAGES.find((i) => i.id === focusedImage) || null, [focusedImage])
  if (!img) return null
  return <FocusedPhotoInner img={img} />
}

function FocusedPhotoInner({ img }) {
  const groupRef = useRef()
  const { camera } = useThree()
  const focusImage = useBookStore((s) => s.focusImage)

  const texture = useMemo(() => {
    const cached = imageTextureCache.get(img.id)
    return cached || placeholderImageTexture(img.caption, hashSeed(img.id))
  }, [img])

  const captionTex = useMemo(() => {
    let text = img.caption || 'Untitled'
    if (img.detailPage) text += ` — see page ${img.detailPage} for the full story.`
    return captionTexture(text)
  }, [img])

  const materials = useMemo(
    () => ({
      photo: new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, toneMapped: false, depthTest: false }),
      frame: new THREE.MeshBasicMaterial({ color: '#efe4c8', transparent: true, opacity: 0, depthTest: false }),
      caption: new THREE.MeshBasicMaterial({ map: captionTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
    }),
    [texture, captionTex]
  )

  const aspect = texture.image && texture.image.height ? texture.image.width / texture.image.height : 640 / 520
  const w = 1.05
  const h = w / Math.max(0.6, Math.min(2.2, aspect))

  // thrown-up entrance
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.scale.setScalar(0.55)
    g.userData.spin = 0.35
    gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2.2)' })
    gsap.to(g.userData, { spin: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
    gsap.to(materials.photo, { opacity: 1, duration: 0.28 })
    gsap.to(materials.frame, { opacity: 0.96, duration: 0.28 })
    gsap.to(materials.caption, { opacity: 1, duration: 0.4, delay: 0.15 })
  }, [materials])

  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    camera.getWorldDirection(v)
    v.multiplyScalar(1.45).add(camera.position)
    g.position.copy(v)
    g.quaternion.copy(camera.quaternion)
    g.rotateZ(g.userData.spin || 0)
  })

  const close = (e) => {
    e.stopPropagation()
    focusImage(null)
  }

  return (
    <group ref={groupRef} renderOrder={50}>
      <mesh material={materials.frame} position={[0, -0.05, -0.001]} onClick={close} onDoubleClick={close} renderOrder={50}>
        <planeGeometry args={[w + 0.09, h + 0.2]} />
      </mesh>
      <mesh material={materials.photo} onClick={close} onDoubleClick={close} renderOrder={51}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh material={materials.caption} position={[0, -h / 2 - 0.16, 0.002]} raycast={() => null} renderOrder={52}>
        <planeGeometry args={[0.98, 0.215]} />
      </mesh>
    </group>
  )
}
