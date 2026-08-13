import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { CAMERA_DEFAULT_Z, CAMERA_MIN_Z, CAMERA_MAX_Z } from '../constants.js'
import { useBookStore } from '../store/useBookStore.js'

/**
 * Camera + input layer. No UI is rendered here — this only wires:
 *  - drag to rotate the held book (trackball feel, object rotates, not camera)
 *  - wheel / pinch zoom with clamped limits
 *  - keyboard: ← → page turns, R reset, Esc dismiss
 * Mouse and touch drive the same interaction model.
 */
export default function Controls() {
  const { camera, gl } = useThree()
  const zoom = useRef({ target: CAMERA_DEFAULT_Z })
  const resetToken = useBookStore((s) => s.resetToken)

  useEffect(() => {
    if (resetToken === 0) return
    gsap.to(zoom.current, { target: CAMERA_DEFAULT_Z, duration: 0.9, ease: 'power3.out' })
  }, [resetToken])

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map()
    let pinchDist = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    const euler = new THREE.Euler()
    const q = new THREE.Quaternion()

    const down = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
        dragging = false
      } else if (pointers.size === 1 && useBookStore.getState().held) {
        dragging = true
        lastX = e.clientX
        lastY = e.clientY
        document.body.style.cursor = 'grabbing'
      }
    }

    const move = (e) => {
      const p = pointers.get(e.pointerId)
      if (p) {
        p.x = e.clientX
        p.y = e.clientY
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDist > 0 && d > 0) {
          zoom.current.target = THREE.MathUtils.clamp(
            zoom.current.target * (pinchDist / d),
            CAMERA_MIN_Z,
            CAMERA_MAX_Z
          )
        }
        pinchDist = d
        return
      }
      if (dragging && useBookStore.getState().held) {
        const g = useBookStore.getState().api?.dragGroup?.current
        if (g) {
          const dx = e.clientX - lastX
          const dy = e.clientY - lastY
          // rotation speed limits keep the object controllable
          const rx = THREE.MathUtils.clamp(dy * 0.006, -0.22, 0.22)
          const ry = THREE.MathUtils.clamp(dx * 0.006, -0.22, 0.22)
          euler.set(rx, ry, 0, 'XYZ')
          q.setFromEuler(euler)
          g.quaternion.premultiply(q)
        }
        lastX = e.clientX
        lastY = e.clientY
      }
    }

    const up = (e) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinchDist = 0
      if (pointers.size === 0 && dragging) {
        dragging = false
        document.body.style.cursor = 'auto'
      }
    }

    const wheel = (e) => {
      e.preventDefault()
      zoom.current.target = THREE.MathUtils.clamp(
        zoom.current.target + e.deltaY * 0.0016,
        CAMERA_MIN_Z,
        CAMERA_MAX_Z
      )
    }

    const key = (e) => {
      const s = useBookStore.getState()
      if (e.key === 'ArrowRight') s.api?.next()
      else if (e.key === 'ArrowLeft') s.api?.prev()
      else if (e.key === 'r' || e.key === 'R') s.requestReset()
      else if (e.key === 'Escape') s.escape()
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
    }
  }, [gl])

  useFrame((_, dt) => {
    camera.position.z += (zoom.current.target - camera.position.z) * Math.min(1, dt * 6)
  })

  return null
}
