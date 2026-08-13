import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { COVER_W, EDGE_ZONE, PAGE_H, SHEET_T } from '../constants.js'
import { FACES, SHEET_COUNT, spreadForFace } from '../data/compileBook.js'
import { renderPageFace, renderEndpaper } from '../three/pageTexture.js'
import {
  leatherColorTexture,
  grainNormalTexture,
  shadowBlobTexture,
  disposeAllProceduralTextures,
} from '../three/proceduralTextures.js'
import { createSheetUniforms } from '../three/bendMaterial.js'
import { buildSheetGeometries, disposeSheetGeometries } from '../three/sheetGeometry.js'
import PageEphemera from './PageEphemera.jsx'
import { useBookStore } from '../store/useBookStore.js'
import { FrontCover, BackCover } from './Cover.jsx'
import Spine from './Spine.jsx'
import PageBlock from './PageBlock.jsx'
import StaticPageFace, { inRect } from './Page.jsx'
import TurningPage from './TurningPage.jsx'
import FloatingImages from './FloatingImages.jsx'
import BookNavigation from './BookNavigation.jsx'
import { useDoubleTap } from '../utils/doubleTap.js'

const N = SHEET_COUNT
const CLOSED_STACK_TOP = N * SHEET_T

/**
 * The book itself — the page's only element. Owns the physical model
 * (covers, spine, stacks, static faces, turning sheet), every animation
 * (opening, page turns, pick-up/put-down, view reset) and the double-click
 * precedence: floating image → logo → index entry → edge zones → pick up.
 */
export default function Book() {
  const dragRef = useRef()
  const liftGroupRef = useRef()
  const nudgeRef = useRef()
  const alignRef = useRef()
  const coverPivotRef = useRef()
  const sheetGroupRef = useRef()
  const sheetMaterialsRef = useRef(null)
  const ribbonRef = useRef()
  const leftFaceIdxRef = useRef(null)
  const rightFaceIdxRef = useRef(null)
  const effLeftRef = useRef(0)
  const effRightRef = useRef(N)

  const openRef = useRef({ p: 0 })
  const liftRef = useRef({ v: 0 })
  const turnBusy = useRef(false)
  const turnStateRef = useRef(null)

  const uniforms = useMemo(() => createSheetUniforms(), [])
  const sheetGeoms = useMemo(() => buildSheetGeometries(), [])
  const turnShadowRef = useRef()
  const turnShadowTex = useMemo(() => shadowBlobTexture(), [])
  const hoverNudgeAt = useRef(0)

  const spread = useBookStore((s) => s.spread)
  const held = useBookStore((s) => s.held)
  const resetToken = useBookStore((s) => s.resetToken)
  const registerApi = useBookStore((s) => s.registerApi)

  const [turn, setTurn] = useState(null) // { sheet, dir } while a sheet is in flight

  // ---- printed page faces ---------------------------------------------
  const faceRender = useMemo(() => FACES.map((f, i) => renderPageFace(f, i % 2 === 0 ? 'right' : 'left')), [])
  const mirrored = useMemo(
    () =>
      faceRender.map((fr, i) => {
        if (i % 2 === 0) return null
        const t = fr.texture.clone()
        t.wrapS = THREE.RepeatWrapping
        t.repeat.x = -1
        t.offset.x = 1
        t.needsUpdate = true
        return t
      }),
    [faceRender]
  )

  const endpaperMat = useMemo(() => {
    const { texture } = renderEndpaper('right')
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 })
  }, [])

  const leatherMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: leatherColorTexture(),
      normalMap: grainNormalTexture(),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.52,
      metalness: 0.12,
    })
  }, [])

  useEffect(
    () => () => {
      faceRender.forEach((fr) => fr.texture.dispose())
      mirrored.forEach((t) => t && t.dispose())
      endpaperMat.map.dispose()
      endpaperMat.dispose()
      leatherMat.map.dispose()
      leatherMat.normalMap.dispose()
      leatherMat.dispose()
      disposeSheetGeometries(sheetGeoms)
      disposeAllProceduralTextures()
    },
    [faceRender, mirrored, endpaperMat, leatherMat, sheetGeoms]
  )

  // ---- visual state derived from spread + in-flight turn ----------------
  const effLeft = turn ? (turn.dir > 0 ? spread : spread - 1) : spread
  const effRight = turn ? (turn.dir > 0 ? N - spread - 1 : N - spread) : N - spread
  let leftFaceIdx = turn && turn.dir < 0 ? 2 * spread - 3 : 2 * spread - 1
  let rightFaceIdx = turn && turn.dir > 0 ? 2 * spread + 2 : 2 * spread
  if (leftFaceIdx < 0) leftFaceIdx = null
  if (rightFaceIdx > 2 * N - 1) rightFaceIdx = null
  leftFaceIdxRef.current = leftFaceIdx
  rightFaceIdxRef.current = rightFaceIdx
  effLeftRef.current = effLeft
  effRightRef.current = effRight
  turnStateRef.current = turn

  const visibleFaces = useMemo(() => {
    const list = []
    const l = 2 * spread - 1
    const r = 2 * spread
    if (l >= 0 && FACES[l]) list.push(FACES[l])
    if (r <= 2 * N - 1 && FACES[r]) list.push(FACES[r])
    return list
  }, [spread])

  // ---- animations -------------------------------------------------------
  const openBook = useCallback(() => {
    const s = useBookStore.getState()
    if (s.isOpen || s.opening) return
    s.setOpening(true)
    // heavy, mechanical — an old spine resisting, then giving way
    gsap.to(openRef.current, {
      p: 1,
      duration: 2.3,
      ease: 'power3.inOut',
      onComplete: () => {
        const st = useBookStore.getState()
        st.setOpening(false)
        st.setOpen(true)
      },
    })
  }, [])

  const doTurn = useCallback(
    (dir, dur = 1.05, onDone) => {
      const s = useBookStore.getState()
      if (turnBusy.current || !s.isOpen || s.opening) return onDone && onDone(false)
      const cur = s.spread
      if ((dir > 0 && cur >= N) || (dir < 0 && cur <= 0)) return onDone && onDone(false)

      const sheet = dir > 0 ? cur : cur - 1
      turnBusy.current = true
      s.setTurning(true)

      const mats = sheetMaterialsRef.current
      if (mats) {
        mats.front.map = faceRender[2 * sheet].texture
        mats.back.map = mirrored[2 * sheet + 1]
      }
      uniforms.uCurlDir.value = dir
      uniforms.uBendAngle.value = dir > 0 ? 0 : Math.PI

      const z0 = dir > 0 ? (N - cur) * SHEET_T : cur * SHEET_T
      const z1 = dir > 0 ? (cur + 1) * SHEET_T : (N - cur + 1) * SHEET_T

      setTurn({ sheet, dir })
      const grp = sheetGroupRef.current
      grp.position.z = z0
      grp.visible = true

      const proxy = { p: 0 }
      gsap.to(proxy, {
        p: 1,
        duration: dur,
        ease: 'power2.inOut',
        onUpdate: () => {
          uniforms.uBendAngle.value = dir > 0 ? proxy.p * Math.PI : (1 - proxy.p) * Math.PI
          grp.position.z = z0 + (z1 - z0) * proxy.p
        },
        onComplete: () => {
          const st = useBookStore.getState()
          st.setSpread(cur + dir)
          setTurn(null)
          grp.visible = false
          st.setTurning(false)
          turnBusy.current = false
          onDone && onDone(true)
        },
      })
    },
    [faceRender, mirrored, uniforms]
  )

  const jumpToFace = useCallback(
    (f) => {
      const target = spreadForFace(f)
      const step = () => {
        const cur = useBookStore.getState().spread
        if (cur === target) return
        const remaining = Math.abs(target - cur)
        const dur = remaining > 1 ? Math.max(0.32, 0.72 - remaining * 0.05) : 0.85
        doTurn(Math.sign(target - cur), dur, (ok) => ok && step())
      }
      step()
    },
    [doTurn]
  )

  useEffect(() => {
    registerApi({
      openBook,
      next: () => {
        const s = useBookStore.getState()
        if (!s.isOpen) return openBook()
        doTurn(1)
      },
      prev: () => doTurn(-1),
      jumpToFace,
      dragGroup: dragRef,
    })
  }, [registerApi, openBook, doTurn, jumpToFace])

  // pick-up lift
  useEffect(() => {
    gsap.to(liftRef.current, { v: held ? 1 : 0, duration: 0.65, ease: 'power2.out' })
  }, [held])

  // reset-to-default orientation
  useEffect(() => {
    if (resetToken === 0) return
    const g = dragRef.current
    if (!g) return
    const q0 = g.quaternion.clone()
    const q1 = new THREE.Quaternion()
    const proxy = { t: 0 }
    gsap.to(proxy, {
      t: 1,
      duration: 0.9,
      ease: 'power3.out',
      onUpdate: () => g.quaternion.slerpQuaternions(q0, q1, proxy.t),
    })
  }, [resetToken])

  // continuous transforms: opening, alignment, lift, idle breathing, flutter clock
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    uniforms.uTime.value = t
    const p = openRef.current.p
    const cover = coverPivotRef.current
    if (cover) {
      cover.rotation.y = -Math.PI * p
      cover.position.z = CLOSED_STACK_TOP * (1 - p) - 0.004 * p
    }
    if (alignRef.current) alignRef.current.position.x = (-COVER_W / 2) * (1 - p)
    const lift = liftGroupRef.current
    if (lift) {
      const v = liftRef.current.v
      lift.position.z = v * 0.3
      // held books rise off the desk so free rotation clears it
      lift.position.y = Math.sin(t * 0.9) * 0.016 + v * 0.42
      const sc = 1 + v * 0.05
      lift.scale.set(sc, sc, sc)
    }
    // red ribbon rides the gutter, appearing as the book opens
    const ribbon = ribbonRef.current
    if (ribbon) {
      ribbon.visible = p > 0.6
      ribbon.position.z = Math.max(effLeftRef.current, effRightRef.current) * SHEET_T + 0.006
      ribbon.material.opacity = (p - 0.6) * 2.5
    }
    // moving shadow cast by the sheet in flight
    const shadow = turnShadowRef.current
    if (shadow) {
      const A = uniforms.uBendAngle.value
      const active = !!turnStateRef.current && A > 0.02 && A < Math.PI - 0.02
      shadow.visible = active
      if (active) {
        const s = Math.sin(A)
        shadow.position.x = Math.cos(A) * 0.5 * 1.3
        shadow.position.z = Math.max(effLeftRef.current, effRightRef.current) * SHEET_T + 0.004
        shadow.scale.set(Math.max(0.35, Math.abs(Math.cos(A))) * 1.5, 1.9, 1)
        shadow.material.opacity = 0.34 * Math.pow(s, 1.4)
      }
    }
  })

  /** A small physical reaction — the book flinches when poked. */
  const nudge = useCallback((strength = 1) => {
    const g = nudgeRef.current
    if (!g) return
    gsap.killTweensOf(g.rotation)
    gsap.killTweensOf(g.position)
    g.rotation.z = 0.012 * strength * (Math.random() > 0.5 ? 1 : -1)
    g.position.y = -0.015 * strength
    gsap.to(g.rotation, { z: 0, duration: 0.7, ease: 'elastic.out(1.4, 0.28)' })
    gsap.to(g.position, { y: 0, duration: 0.6, ease: 'elastic.out(1.4, 0.3)' })
  }, [])

  // ---- interaction handlers --------------------------------------------
  const bodyDouble = useCallback(() => {
    const s = useBookStore.getState()
    if (!s.isOpen) return openBook()
    if (s.navOpen) return s.setNavOpen(false)
    if (s.focusedImage) return s.focusImage(null)
    s.held ? s.putDown() : s.pickUp()
  }, [openBook])
  const bodyDoubleTap = useDoubleTap(bodyDouble)

  const bodyClick = useCallback(() => {
    const s = useBookStore.getState()
    if (!s.isOpen && !s.opening) return openBook()
    if (s.focusedImage) return s.focusImage(null)
    nudge(0.7) // the book flinches when poked
  }, [openBook, nudge])

  /**
   * Double-click on a page face, resolved in spec priority order:
   * logo stamp → index entry → edge zones → pick up / put down.
   * (Floating images sit physically in front and stop propagation, so they
   * naturally win the first slot.) Edge zones stay live while held.
   */
  const faceDouble = useCallback(
    (e, side) => {
      const s = useBookStore.getState()
      if (!s.isOpen) return openBook()
      if (s.navOpen) return s.setNavOpen(false)

      const faceIdx = side === 'right' ? rightFaceIdxRef.current : leftFaceIdxRef.current
      const regions = faceIdx == null ? [] : faceRender[faceIdx].regions
      const uv = e.uv
      if (uv) {
        const logo = regions.find((r) => r.type === 'logo' && inRect(uv, r))
        if (logo) return s.setNavOpen(true)
        const idx = regions.find((r) => r.type === 'index' && inRect(uv, r))
        if (idx) return jumpToFace(idx.faceIndex)
        const egg = regions.find((r) => r.type === 'egg' && inRect(uv, r))
        if (egg) {
          // DO NOT PRESS was pressed. Naturally.
          s.triggerEgg()
          nudge(2.2)
          return
        }
        if (side === 'right' && uv.x > 1 - EDGE_ZONE) return doTurn(1)
        if (side === 'left' && uv.x < EDGE_ZONE) return doTurn(-1)
      }
      if (s.focusedImage) return s.focusImage(null)
      s.held ? s.putDown() : s.pickUp()
    },
    [faceRender, doTurn, jumpToFace, openBook, nudge]
  )

  const emblemActivate = useCallback(() => {
    const s = useBookStore.getState()
    if (!s.isOpen) return openBook()
    s.setNavOpen(true)
  }, [openBook])

  const navZ = Math.max(effLeft, effRight) * SHEET_T + 0.72

  return (
    <group rotation={[-0.12, 0, 0]}>
      <group ref={dragRef}>
        <group ref={liftGroupRef}>
          <group ref={nudgeRef}>
          <group
            ref={alignRef}
            onClick={bodyClick}
            onDoubleClick={bodyDouble}
            onPointerUp={bodyDoubleTap}
            onPointerOver={() => {
              const s = useBookStore.getState()
              if (!s.isOpen) {
                document.body.style.cursor = 'pointer'
                // the closed journal stirs when your hand approaches
                const now = performance.now()
                if (!s.opening && now - hoverNudgeAt.current > 900) {
                  hoverNudgeAt.current = now
                  nudge(0.35)
                }
              }
            }}
            onPointerOut={() => {
              if (!useBookStore.getState().isOpen) document.body.style.cursor = 'auto'
            }}
          >
            <BackCover leatherMat={leatherMat} endpaperMat={endpaperMat} />
            <Spine openRef={openRef} leatherMat={leatherMat} />

            <PageBlock side="right" sheets={effRight} />
            <PageBlock side="left" sheets={effLeft} />

            {leftFaceIdx != null && effLeft > 0 && (
              <StaticPageFace
                side="left"
                texture={faceRender[leftFaceIdx].texture}
                regions={faceRender[leftFaceIdx].regions}
                geometry={sheetGeoms[Math.floor(leftFaceIdx / 2)].left}
                z={effLeft * SHEET_T + 0.0025}
                onDoubleActivate={faceDouble}
              />
            )}
            {rightFaceIdx != null && effRight > 0 && (
              <StaticPageFace
                side="right"
                texture={faceRender[rightFaceIdx].texture}
                regions={faceRender[rightFaceIdx].regions}
                geometry={sheetGeoms[Math.floor(rightFaceIdx / 2)].front}
                z={effRight * SHEET_T + 0.0025}
                onDoubleActivate={faceDouble}
              />
            )}

            {/* shadow swept across the stack by the sheet in flight */}
            <mesh ref={turnShadowRef} visible={false} raycast={() => null}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial map={turnShadowTex} transparent opacity={0} depthWrite={false} color="#1a0f04" />
            </mesh>

            <TurningPage
              ref={sheetGroupRef}
              uniforms={uniforms}
              materialsRef={sheetMaterialsRef}
              geometry={sheetGeoms[turn ? turn.sheet : 0].front}
            />

            <FrontCover
              ref={coverPivotRef}
              leatherMat={leatherMat}
              endpaperMat={endpaperMat}
              onEmblemActivate={emblemActivate}
              onBodyClick={bodyClick}
            />

            {/* red page ribbon draped down the gutter */}
            <mesh ref={ribbonRef} position={[0.01, -PAGE_H / 2 + 0.32, 0.1]} rotation={[0, 0, 0.02]} raycast={() => null} visible={false}>
              <planeGeometry args={[0.075, 0.85]} />
              <meshStandardMaterial color="#7a1f1f" roughness={0.55} transparent opacity={0} side={THREE.DoubleSide} />
            </mesh>

            <FloatingImages visibleFaces={visibleFaces} />
            <PageEphemera spread={spread} visibleFaces={visibleFaces} stackTopZ={Math.max(effLeft, effRight) * SHEET_T} />
            <BookNavigation z={navZ} />
          </group>
          </group>
        </group>
      </group>
    </group>
  )
}
