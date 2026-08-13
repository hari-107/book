import { useCallback, useRef } from 'react'

/**
 * Touch equivalence for double-click. Browsers fire `dblclick` reliably for
 * mice but not for touch, so this hook synthesizes a double-activation from
 * two quick taps landing near each other. Attach the returned handler to
 * `onPointerUp` alongside a normal `onDoubleClick`; it ignores mouse/pen
 * pointers so mouse users never trigger it twice.
 */
export function useDoubleTap(handler, { maxDelay = 350, maxDist = 32 } = {}) {
  const last = useRef({ t: 0, x: 0, y: 0 })
  return useCallback(
    (e) => {
      if (e.pointerType !== 'touch') return
      const cx = e.nativeEvent?.clientX ?? e.clientX ?? 0
      const cy = e.nativeEvent?.clientY ?? e.clientY ?? 0
      const now = performance.now()
      const { t, x, y } = last.current
      if (now - t < maxDelay && Math.hypot(cx - x, cy - y) < maxDist) {
        last.current = { t: 0, x: 0, y: 0 }
        handler(e)
      } else {
        last.current = { t: now, x: cx, y: cy }
      }
    },
    [handler, maxDelay, maxDist]
  )
}
