import { forwardRef, useEffect, useMemo } from 'react'
import { createBendMaterial } from '../three/bendMaterial.js'

/**
 * The sheet in flight. Uses the SAME damaged geometry as the resting page
 * (deckled edges, torn corners), rendered twice — front face and back face —
 * with shared bend uniforms so both sides deform identically. The Book
 * drives uBendAngle and the group's z position from a GSAP tween; textures
 * and geometry are swapped per turn (uniform/geometry updates, no shader
 * recompile).
 */
const TurningPage = forwardRef(function TurningPage({ uniforms, materialsRef, geometry }, ref) {
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
    }
  }, [materials, materialsRef])

  if (!geometry) return <group ref={ref} visible={false} />

  return (
    <group ref={ref} visible={false}>
      <mesh geometry={geometry} material={materials.front} raycast={() => null} />
      <mesh geometry={geometry} material={materials.back} raycast={() => null} />
    </group>
  )
})

export default TurningPage
