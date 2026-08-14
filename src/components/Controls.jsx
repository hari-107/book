import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { CAMERA_MIN_Z, CAMERA_MAX_Z, FIT_HALF_W, FIT_HALF_H } from '../constants.js'
import { useBookStore } from '../store/useBookStore.js'
import { toggleMute } from '../utils/sound.js'

/**
 * Camera + input layer. No UI is rendered here — this only wires:
 *  - a close, desk-side camera that always keeps the huge book framed
 *    (~85-95% of the viewport), recomputed per aspect ratio on resize
 *  - subtle pointer parallax and a gentle push-in while pages turn
 *  - drag to rotate the held book (the object rotates, not the camera)
 *  - wheel / pinch zoom with clamped limits
 *  - keyboard: ← → page turns, R reset, Esc dismiss
 * Mouse and touch drive the same interaction model.
 */
export default function Controls() {
  const { camera, gl, size } = useThree()
  const zoom = useRef({ target: 3, fit: 3, push: 0, closedPull: 0.32 })
  const sway = useRef({ x: 0, y: 0 })
  const intro = useRef({ t: 0 })
  const resetToken = useBookStore((s) => s.resetToken)
  const phase = useBookStore((s) => s.phase)

  // the reveal: drift in from the gloom above the desk onto the journal
  useEffect(() => {
    if (phase !== 'ready') return
    gsap.to(intro.current, { t: 1, duration: 3.6, delay: 0.25, ease: 'power2.inOut' })
  }, [phase])

  // Fit the book to the viewport: near-fullscreen at every aspect ratio.
  useEffect(() => {
    const halfFovTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const aspect = size.width / size.height
    const zForH = FIT_HALF_H / halfFovTan
    const zForW = FIT_HALF_W / (halfFovTan * aspect)
    const fit = THREE.MathUtils.clamp(Math.max(zForH, zForW) * 1.04, CAMERA_MIN_Z, CAMERA_MAX_Z)
    zoom.current.fit = fit
    zoom.current.target = fit
  }, [camera, size])

  useEffect(() => {
    if (resetToken === 0) return
    gsap.to(zoom.current, { target: zoom.current.fit, duration: 0.9, ease: 'power3.out' })
  }, [resetToken])

  // gentle push-in while a page turns or the cover opens;
  // the camera sits back a little while the book rests closed
  useEffect(() => {
    const unsub = useBookStore.subscribe((s, prev) => {
      if ((s.turning && !prev.turning) || (s.opening && !prev.opening)) {
        gsap.killTweensOf(zoom.current, 'push')
        gsap.to(zoom.current, { push: -0.12, duration: 0.45, ease: 'power2.out' })
      } else if ((!s.turning && prev.turning) || (!s.opening && prev.opening)) {
        gsap.to(zoom.current, { push: 0, duration: 0.8, ease: 'power2.inOut' })
      }
      if (s.isOpen !== prev.isOpen || s.opening !== prev.opening) {
        const pull = !s.isOpen && !s.opening ? 0.32 : 0
        gsap.to(zoom.current, { closedPull: pull, duration: 1.4, ease: 'power2.inOut' })
      }
    })
    return unsub
  }, [])

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
      // parallax sway target (normalized pointer)
      sway.current.x = (e.clientX / window.innerWidth) * 2 - 1
      sway.current.y = (e.clientY / window.innerHeight) * 2 - 1

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
      if (dragging && useBookStore.getState().held && !useBookStore.getState().photoDrag) {
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
      else if (e.key === 'm' || e.key === 'M') toggleMute()
      else if (e.key === 'c' || e.key === 'C') s.api?.closeBook?.()
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
    const k = Math.min(1, dt * 5)
    const it = intro.current.t
    // during the intro the camera hangs back high in the gloom, then settles in
    const z = (zoom.current.target + zoom.current.push + zoom.current.closedPull) * (1 + (1 - it) * 0.85)
    const baseY = 0.16 + (1 - it) * 0.85
    camera.position.z += (z - camera.position.z) * k
    // subtle parallax — sitting at the desk, leaning slightly with the pointer
    camera.position.x += (sway.current.x * 0.09 * it - camera.position.x) * k * 0.6
    camera.position.y += (baseY - sway.current.y * 0.06 * it - camera.position.y) * k * 0.6
    camera.lookAt(0, -0.04 - (1 - it) * 0.3, 0)
  })

  return null
}
