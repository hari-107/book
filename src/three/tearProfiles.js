import { PAGE_W, PAGE_H } from '../constants.js'

/**
 * Shared damage model for the journal's sheets. Both the geometry builder
 * (sheetGeometry.js) and the texture painter (pageTexture.js) read from the
 * SAME profiles, so a torn corner is missing in the actual mesh silhouette
 * AND shaded as ripped fibers in the print — real geometry, matching ink.
 *
 * Every sheet gets deckled (irregular) fore-edge/top/bottom edges.
 * Designated sheets carry dramatic tears:
 *   - corner tears at the fore-edge corners ('tr' | 'br')
 *   - a bite out of the bottom edge
 * The spine edge always stays intact (it is bound).
 */

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deterministic 1-D value noise in [0,1] — smooth, repeatable, no Math.random,
 * so the SAME ragged boundary is produced in geometry and texture.
 */
function hash1(n) {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(t) {
  const i = Math.floor(t)
  const f = t - i
  const u = f * f * (3 - 2 * f)
  return hash1(i) * (1 - u) + hash1(i + 1) * u
}

/**
 * Multi-octave ragged radius factor around a torn arc. Combines big lobes,
 * medium chunks, and sharp high-frequency serration plus occasional deep
 * notches — never a smooth arc.
 */
function raggedFactor(t, seed) {
  const base =
    0.62 +
    0.16 * Math.sin(t * 6.3 + seed) +
    0.12 * (vnoise(t * 9 + seed * 3.7) - 0.5) * 2 + // medium chunks
    0.1 * (vnoise(t * 34 + seed * 8.1) - 0.5) * 2 + // fine serration
    0.05 * (vnoise(t * 90 + seed * 2.3) - 0.5) * 2 // micro grain
  // occasional deep notch where the fiber gave way
  const notch = vnoise(t * 5 + seed * 5.5)
  const cut = notch > 0.82 ? (notch - 0.82) * 1.8 : 0
  return Math.max(0.28, base - cut)
}

/**
 * Tear descriptor:
 *   c      — center point in page space (x: 0 at spine → PAGE_W, y: -H/2..H/2)
 *   th0/th1 — angular range (radians) of the tear boundary arc around c
 *   R(t)   — ragged radius along the arc, t ∈ [0,1]
 */
function cornerTear(corner, r, seed) {
  const rr = r * PAGE_W
  const R = (t) => rr * raggedFactor(t, 3 + seed * 11)
  if (corner === 'tr') return { c: [PAGE_W, PAGE_H / 2], th0: Math.PI, th1: Math.PI * 1.5, R, seed }
  // 'br'
  return { c: [PAGE_W, -PAGE_H / 2], th0: Math.PI * 0.5, th1: Math.PI, R, seed }
}

function bottomBite(x, r, seed) {
  const rr = r * PAGE_W
  const R = (t) => rr * raggedFactor(t, 5 + seed * 9)
  return { c: [x * PAGE_W, -PAGE_H / 2], th0: 0, th1: Math.PI, R, seed }
}

function foreEdgeRip(y, r, seed) {
  const rr = r * PAGE_W
  const R = (t) => rr * raggedFactor(t, 8 + seed * 7)
  return { c: [PAGE_W, y * PAGE_H], th0: Math.PI * 0.5, th1: Math.PI * 1.5, R, seed }
}

/**
 * An irregular hole punched INSIDE the page (not touching any edge). The
 * boundary is a closed ragged loop; radii are blended near the closure so
 * the loop meets itself without a step. The mesh vertices inside collapse
 * onto the loop, so light and raycasts genuinely pass through the paper.
 */
function interiorHole(x, y, r, seed) {
  const rr = r * PAGE_W
  const raw = (t) => rr * raggedFactor(t, 11 + seed * 13)
  const R = (t) => {
    if (t > 0.88) {
      const k = (t - 0.88) / 0.12 // blend the loop closed
      return raw(t) * (1 - k) + raw(0) * k
    }
    return raw(t)
  }
  return { c: [x * PAGE_W, y * PAGE_H], th0: 0, th1: Math.PI * 2, R, seed, hole: true }
}

const profileCache = new Map()

/**
 * Damage profile for sheet j — deterministic, cached.
 *
 * PROGRESSIVE DAMAGE: the journal has been used front to back, and its back
 * half has clearly been through something. Early sheets are presentable —
 * lightly stained, deckled but whole. The middle picks up torn corners and
 * ripped edges. The last third carries large tears, bites, genuine holes and
 * scorched fore-edges — heavily worn parchment, missing pieces and all.
 */
export function sheetProfile(j) {
  if (profileCache.has(j)) return profileCache.get(j)
  const rnd = mulberry32(j * 7919 + 13)
  const deckleSeed = rnd() * 100
  const tears = []
  let scorch = false
  // — early sheets (cover, title, index): clean, only deckling and stains —
  if (j === 2) tears.push(cornerTear('tr', 0.2, rnd())) // about: first torn corner
  if (j === 3) tears.push(foreEdgeRip(0.08, 0.13, rnd())) // skills: ripped outer edge
  if (j === 4) tears.push(bottomBite(0.62, 0.09, rnd())) // experience: a small bite
  if (j === 5) tears.push(cornerTear('br', 0.24, rnd())) // projects: torn corner
  if (j === 6) tears.push(cornerTear('br', 0.42, rnd())) // huge diagonal tear
  // — the back half: things went badly on that expedition —
  if (j === 7) tears.push(interiorHole(0.55, 0.12, 0.1, rnd())) // a real hole
  if (j === 8) {
    tears.push(foreEdgeRip(0.05, 0.17, rnd())) // field reports: ripped open
    tears.push(cornerTear('tr', 0.13, rnd()))
  }
  if (j === 9) tears.push(bottomBite(0.44, 0.16, rnd()))
  if (j === 10) {
    tears.push(bottomBite(0.52, 0.19, rnd())) // fun zone: chewed
    tears.push(cornerTear('tr', 0.26, rnd()))
  }
  if (j === 11) {
    tears.push(foreEdgeRip(-0.12, 0.2, rnd())) // contact: barely holding on
    tears.push(cornerTear('br', 0.18, rnd()))
    scorch = true // singed fore-edge
  }
  if (j === 12) {
    tears.push(cornerTear('br', 0.5, rnd())) // the end: a chunk is simply gone
    tears.push(interiorHole(0.42, 0.28, 0.085, rnd()))
    scorch = true
  }
  const profile = { deckleSeed, tears, scorch }
  profileCache.set(j, profile)
  return profile
}

/** Deckle inset (page units) along an edge; t ∈ [0,1] along that edge. Deeper, more irregular. */
export function deckleInset(edge, t, seed) {
  const base =
    Math.sin(t * 31 + seed) * 0.4 +
    Math.sin(t * 73 + seed * 2.3) * 0.28 +
    (vnoise(t * 120 + seed * 4.1) - 0.5) * 0.9 + // ragged fibrous edge
    (vnoise(t * 260 + seed * 1.7) - 0.5) * 0.5
  const k = edge === 'fore' ? 0.02 : 0.015
  return Math.max(0, (base * 0.5 + 0.5) * k * PAGE_W)
}

/** Signed distance-ish: how far page point (x,y) sits outside a tear boundary (negative = inside/torn away). */
export function tearEdgeDistance(profile, x, y) {
  let best = Infinity
  for (const tear of profile.tears) {
    const dx = x - tear.c[0]
    const dy = y - tear.c[1]
    let th = Math.atan2(dy, dx)
    if (th < 0) th += Math.PI * 2
    if (th < tear.th0 - 0.05 || th > tear.th1 + 0.05) continue
    const t = Math.min(1, Math.max(0, (th - tear.th0) / (tear.th1 - tear.th0)))
    const d = Math.hypot(dx, dy) - tear.R(t)
    if (Math.abs(d) < Math.abs(best)) best = d
  }
  return best
}

/**
 * Shadow spots for the holes of a torn face, in the static face's LOCAL mesh
 * coords (x flips for the left page). Rendered just below the face so the
 * darkness shows through the missing geometry.
 */
export function tearShadowSpots(faceIndex, side) {
  const profile = sheetProfile(Math.floor(faceIndex / 2))
  const sx = side === 'right' ? 1 : -1
  return profile.tears.map((tear) => {
    let rSum = 0
    for (let i = 0; i <= 8; i++) rSum += tear.R(i / 8)
    const r = rSum / 9
    return { x: tear.c[0] * sx, y: tear.c[1], r }
  })
}

/** Sample a tear's boundary polyline in page space (for the texture painter). */
export function sampleTearBoundary(tear, samples = 60) {
  const pts = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const th = tear.th0 + (tear.th1 - tear.th0) * t
    const r = tear.R(t)
    pts.push([tear.c[0] + Math.cos(th) * r, tear.c[1] + Math.sin(th) * r])
  }
  return pts
}

/** True if a page-space point was torn away by any tear of the profile. */
export function isTornAway(profile, x, y) {
  for (const tear of profile.tears) {
    const dx = x - tear.c[0]
    const dy = y - tear.c[1]
    let th = Math.atan2(dy, dx)
    if (th < 0) th += Math.PI * 2
    if (th < tear.th0 || th > tear.th1) continue
    const t = (th - tear.th0) / (tear.th1 - tear.th0)
    if (Math.hypot(dx, dy) < tear.R(t)) return true
  }
  return false
}
