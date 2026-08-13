import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useBookStore } from '../store/useBookStore.js'
import { faceById } from '../data/compileBook.js'
import FloatingImage from './FloatingImage.jsx'

/**
 * Manages the pool of floating images for the current spread. On a page
 * change, images shared between old and new spreads glide to their new orbit
 * slots (spring-driven inside FloatingImage); departing images fade out and
 * are unmounted afterwards; arriving images fade in. Orbit radius and slot
 * spacing derive from the live image count.
 */
export default function FloatingImages({ visibleFaces }) {
  const isOpen = useBookStore((s) => s.isOpen)
  const navOpen = useBookStore((s) => s.navOpen)
  const turning = useBookStore((s) => s.turning)
  const baseAngleRef = useRef(0)

  const current = visibleFaces.flatMap((f) =>
    (f.images || []).map((img) => ({
      ...img,
      detailPage: img.detail && faceById[img.detail] ? faceById[img.detail].pageNumber : null,
    }))
  )
  const currentIds = current.map((i) => i.id).join('|')

  const [pool, setPool] = useState([])

  useEffect(() => {
    setPool((prev) => {
      const kept = prev
        .map((p) => ({ ...p, leaving: !current.some((c) => c.id === p.img.id), leftAt: p.leftAt }))
        .map((p) => (p.leaving && !p.leftAt ? { ...p, leftAt: performance.now() } : p.leaving ? p : { ...p, leftAt: undefined }))
      const arriving = current
        .filter((c) => !prev.some((p) => p.img.id === c.id))
        .map((c, i) => ({ img: c, leaving: false, seed: hashSeed(c.id) }))
      return [...kept, ...arriving]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIds])

  // sweep departed images after their fade-out
  useEffect(() => {
    const t = setInterval(() => {
      setPool((prev) => {
        const now = performance.now()
        const next = prev.filter((p) => !p.leaving || !p.leftAt || now - p.leftAt < 900)
        return next.length === prev.length ? prev : next
      })
    }, 500)
    return () => clearInterval(t)
  }, [])

  useFrame((_, dt) => {
    baseAngleRef.current += dt * 0.24
  })

  const active = pool.filter((p) => !p.leaving)
  const hiddenAll = !isOpen || navOpen || turning

  return (
    <group>
      {pool.map((p) => {
        const slot = active.findIndex((a) => a.img.id === p.img.id)
        return (
          <FloatingImage
            key={p.img.id}
            img={p.img}
            slot={slot === -1 ? 0 : slot}
            count={Math.max(1, active.length)}
            baseAngleRef={baseAngleRef}
            hidden={hiddenAll || p.leaving}
            seed={p.seed}
          />
        )
      })}
    </group>
  )
}

function hashSeed(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}
