import * as THREE from 'three'
import { PAGE_W } from '../constants.js'

/**
 * The sanctioned page-curl mechanism: a bent-mesh deformation driven by a
 * vertex shader, injected into MeshStandardMaterial via onBeforeCompile so
 * the page keeps full PBR lighting while it bends.
 *
 * Model: every vertex rotates around the spine (the local Y axis at x = 0)
 * by  a(d) = A + dir · curl · sin(A) · profile(d),  where
 *   A       = uBendAngle  (0 → π over a full turn)
 *   d       = x / pageWidth (0 at the spine, 1 at the fore-edge)
 *   profile = 0.65·d^1.7 + 0.35·sin(πd)  (fore-edge leads, belly sags)
 *
 * The sin(A) factor guarantees the curl vanishes when the sheet is flat
 * (A = 0 or π), so a settling page can never clip into the stacks or cover.
 * Normals are rotated by the same per-vertex angle for correct shading.
 */

export function createSheetUniforms() {
  return {
    uBendAngle: { value: 0 },
    uCurl: { value: 0.5 },
    uCurlDir: { value: 1 },
    uWidth: { value: PAGE_W },
  }
}

const BEND_MATH = /* glsl */ `
  float bendD = clamp(position.x / uWidth, 0.0, 1.0);
  float bendProfile = 0.65 * pow(bendD, 1.7) + 0.35 * sin(bendD * PI);
  float bendA = -(uBendAngle + uCurlDir * uCurl * sin(uBendAngle) * bendProfile);
  float bendS = sin(bendA);
  float bendC = cos(bendA);
`

export function createBendMaterial({ map, uniforms, backSide = false }) {
  const material = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.82,
    metalness: 0,
    side: backSide ? THREE.BackSide : THREE.FrontSide,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBendAngle = uniforms.uBendAngle
    shader.uniforms.uCurl = uniforms.uCurl
    shader.uniforms.uCurlDir = uniforms.uCurlDir
    shader.uniforms.uWidth = uniforms.uWidth

    shader.vertexShader =
      `
      uniform float uBendAngle;
      uniform float uCurl;
      uniform float uCurlDir;
      uniform float uWidth;
      ` + shader.vertexShader

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      {
        ${backSide ? 'objectNormal = -objectNormal;' : ''}
        ${BEND_MATH}
        objectNormal = normalize(vec3(
          objectNormal.x * bendC + objectNormal.z * bendS,
          objectNormal.y,
          -objectNormal.x * bendS + objectNormal.z * bendC
        ));
      }`
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        ${BEND_MATH}
        transformed = vec3(
          transformed.x * bendC + transformed.z * bendS,
          transformed.y,
          -transformed.x * bendS + transformed.z * bendC
        );
      }`
    )
  }

  // distinct program per side so the cached shader isn't shared incorrectly
  material.customProgramCacheKey = () => `bend-sheet-${backSide ? 'back' : 'front'}`
  return material
}
