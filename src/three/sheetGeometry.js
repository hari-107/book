import * as THREE from 'three'
import { PAGE_W, PAGE_H } from '../constants.js'
import { SHEET_COUNT } from '../data/compileBook.js'
import { sheetProfile, deckleInset } from './tearProfiles.js'

/**
 * Real damaged-paper geometry. Each sheet gets a dense grid whose BOUNDARY
 * is physically deformed:
 *   - deckled (irregular) fore-edge, head and tail on every sheet
 *   - dramatic corner tears / edge bites on designated sheets — interior
 *     vertices inside the torn region collapse onto the ragged tear arc, so
 *     the silhouette is genuinely missing (raycasts pass through, light
 *     wraps around it), with a slight z-ripple lifting the torn fringe.
 *
 * For each sheet two geometries are built:
 *   front — spine at x=0, page extends to +x (right page / turning sheet)
 *   left  — mirrored (x → -x) with FLIPPED uv.x and reversed winding, used
 *           when the sheet rests on the left stack. Same silhouette, so a
 *           corner torn on the right page stays torn after the page turns.
 */

const EPS = 1e-4

function deformFront(geometry, profile) {
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    let z = pos.getZ(i)

    // deckle: pull the outer boundary ring inward irregularly (spine stays)
    if (x > PAGE_W - EPS) x -= deckleInset('fore', y / PAGE_H + 0.5, profile.deckleSeed)
    if (y > PAGE_H / 2 - EPS) y -= deckleInset('head', x / PAGE_W, profile.deckleSeed + 31)
    if (y < -PAGE_H / 2 + EPS) y += deckleInset('tail', x / PAGE_W, profile.deckleSeed + 67)

    // dramatic tears: collapse vertices in the torn zone onto the ragged arc
    for (const tear of profile.tears) {
      const dx = x - tear.c[0]
      const dy = y - tear.c[1]
      const d = Math.hypot(dx, dy)
      let th = Math.atan2(dy, dx)
      if (th < 0) th += Math.PI * 2
      if (th < tear.th0 - 0.02 || th > tear.th1 + 0.02) continue
      const t = Math.min(1, Math.max(0, (th - tear.th0) / (tear.th1 - tear.th0)))
      const R = tear.R(t)
      if (d < R) {
        const ux = d < 1e-6 ? Math.cos((tear.th0 + tear.th1) / 2) : dx / d
        const uy = d < 1e-6 ? Math.sin((tear.th0 + tear.th1) / 2) : dy / d
        x = tear.c[0] + ux * R
        y = tear.c[1] + uy * R
        z += 0.0022 * Math.sin(t * 37 + profile.deckleSeed) // lifted torn fringe
      } else if (d < R + 0.04) {
        z += 0.0012 * Math.sin(t * 41 + profile.deckleSeed) // paper stress near the tear
      }
    }

    pos.setXYZ(i, x, y, z)
  }
  pos.needsUpdate = true
  geometry.computeBoundingSphere()
  return geometry
}

function mirrorGeometry(front) {
  const g = front.clone()
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setX(i, -pos.getX(i))
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
  // mirroring flips winding — reverse indices to restore front faces (+z)
  const index = g.index.array
  for (let i = 0; i < index.length; i += 3) {
    const tmp = index[i + 1]
    index[i + 1] = index[i + 2]
    index[i + 2] = tmp
  }
  const normal = g.attributes.normal
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 0, 0, 1)
  pos.needsUpdate = true
  uv.needsUpdate = true
  g.index.needsUpdate = true
  normal.needsUpdate = true
  g.computeBoundingSphere()
  return g
}

export function buildSheetGeometries() {
  const sheets = []
  for (let j = 0; j < SHEET_COUNT; j++) {
    const base = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 72, 10)
    base.translate(PAGE_W / 2, 0, 0) // hinge at the spine (x = 0)
    const front = deformFront(base, sheetProfile(j))
    sheets.push({ front, left: mirrorGeometry(front) })
  }
  return sheets
}

export function disposeSheetGeometries(sheets) {
  sheets.forEach(({ front, left }) => {
    front.dispose()
    left.dispose()
  })
}
