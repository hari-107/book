import { useEffect, useState } from 'react'
import { useBookStore } from '../store/useBookStore.js'

/**
 * Loading veil — an old label in the dark while the book is dusted off.
 * Geometry, fonts and image assets are prepared behind it; nothing partially
 * loaded is ever exposed. Fades into the closed-book presentation when ready.
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
      <div className="loading__emblem">✦</div>
      <div className="loading__title">dusting off an old book…</div>
      <div className="loading__bar">
        <span />
      </div>
    </div>
  )
}
