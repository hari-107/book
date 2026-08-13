import { useEffect, useState } from 'react'
import { useBookStore } from '../store/useBookStore.js'
import { bookMeta } from '../data/bookContent.js'

/**
 * Polished loading veil. Geometry, fonts and image assets are prepared behind
 * it; nothing partially loaded is ever exposed. Fades into the closed-book
 * presentation once everything is ready.
 */
export default function LoadingScreen() {
  const phase = useBookStore((s) => s.phase)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (phase === 'ready') {
      const t = setTimeout(() => setGone(true), 950)
      return () => clearTimeout(t)
    }
  }, [phase])

  if (gone) return null

  return (
    <div className={`loading${phase === 'ready' ? ' loading--done' : ''}`}>
      <div className="loading__emblem">{bookMeta.monogram}</div>
      <div className="loading__title">Binding the book</div>
      <div className="loading__bar">
        <span />
      </div>
    </div>
  )
}
