import { forwardRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { PAGE_W, PAGE_H } from '../constants.js'
import { createBendMaterial } from '../three/bendMaterial.js'

/**
 * The sheet in flight. A single high-segment plane hinged at the spine,
 * rendered twice — front face and back face — with the shared bend uniforms
 * so both sides deform identically. The Book drives uBendAngle and the
 * group's z position from a GSAP tween; front/back textures are swapped per
 * turn (a uniform update, no shader recompile).
 */
const TurningPage = forwardRef(function TurningPage({ uniforms, materialsRef }, ref) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 72, 6)
    g.translate(PAGE_W / 2, 0, 0) // hinge at x = 0 (the spine)
    return g
  }, [])

  const materials = useMemo(
    () => ({
      front: createBendMaterial({ map: null, uniforms }),
      back: createBendMaterial({ map: null, uniforms, backSide: true }),
    }),
    [uniforms]
  )

  useEffect(() => {
    materialsRef.current = materials
    return () => {
      materials.front.dispose()
      materials.back.dispose()
      geometry.dispose()
    }
  }, [materials, geometry, materialsRef])

  return (
    <group ref={ref} visible={false}>
      <mesh geometry={geometry} material={materials.front} raycast={() => null} />
      <mesh geometry={geometry} material={materials.back} raycast={() => null} />
    </group>
  )
})

export default TurningPage
