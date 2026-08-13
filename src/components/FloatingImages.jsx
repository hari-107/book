import { useEffect, useState } from 'react'
import { useBookStore } from '../store/useBookStore.js'
import FloatingImage from './FloatingImage.jsx'

/**
 * Manages the pool of photographs for the current spread. On a page change,
 * photos that stay glide to their new scattered spots, departing photos are
 * flicked off the book and unmounted after their exit, and arriving photos
 * are thrown in staggered. Layout slots derive from the live photo count.
 */
export default function FloatingImages({ visibleFaces }) {
  const isOpen = useBookStore((s) => s.isOpen)
  const navOpen = useBookStore((s) => s.navOpen)
  const turning = useBookStore((s) => s.turning)

  const current = visibleFaces.flatMap((f) => f.images || [])
  const currentIds = current.map((i) => i.id).join('|')

  const [pool, setPool] = useState([])

  useEffect(() => {
    setPool((prev) => {
      const kept = prev.map((p) => {
        const staying = current.some((c) => c.id === p.img.id)
        if (!staying && !p.leftAt) return { ...p, leaving: true, leftAt: performance.now() }
        if (staying && p.leaving) return { ...p, leaving: false, leftAt: undefined }
        return p
      })
      const arriving = current
        .filter((c) => !prev.some((p) => p.img.id === c.id))
        .map((c) => ({ img: c, leaving: false, seed: hashSeed(c.id) }))
      return [...kept, ...arriving]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIds])

  // sweep departed photos after their exit animation
  useEffect(() => {
    const t = setInterval(() => {
      setPool((prev) => {
        const now = performance.now()
        const next = prev.filter((p) => !p.leaving || !p.leftAt || now - p.leftAt < 900)
        return next.length === prev.length ? prev : next
      })
    }, 400)
    return () => clearInterval(t)
  }, [])

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
            hidden={hiddenAll}
            leaving={p.leaving}
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
