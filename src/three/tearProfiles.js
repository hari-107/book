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
 * Tear descriptor:
 *   c      — center point in page space (x: 0 at spine → PAGE_W, y: -H/2..H/2)
 *   th0/th1 — angular range (radians) of the tear boundary arc around c
 *   R(t)   — ragged radius along the arc, t ∈ [0,1]
 */
function cornerTear(corner, r, seed) {
  const rr = r * PAGE_W
  const s1 = 3 + seed * 11
  const s2 = 7 + seed * 5
  const R = (t) => rr * (0.72 + 0.2 * Math.sin(t * 9.2 + s1) + 0.08 * Math.sin(t * 23.7 + s2))
  if (corner === 'tr') return { c: [PAGE_W, PAGE_H / 2], th0: Math.PI, th1: Math.PI * 1.5, R }
  // 'br'
  return { c: [PAGE_W, -PAGE_H / 2], th0: Math.PI * 0.5, th1: Math.PI, R }
}

function bottomBite(x, r, seed) {
  const rr = r * PAGE_W
  const s1 = 5 + seed * 9
  const R = (t) => rr * (0.7 + 0.22 * Math.sin(t * 7.3 + s1) + 0.08 * Math.sin(t * 19.1 + s1 * 2))
  return { c: [x * PAGE_W, -PAGE_H / 2], th0: 0, th1: Math.PI, R }
}

const profileCache = new Map()

/** Damage profile for sheet j — deterministic, cached. */
export function sheetProfile(j) {
  if (profileCache.has(j)) return profileCache.get(j)
  const rnd = mulberry32(j * 7919 + 13)
  const deckleSeed = rnd() * 100
  const tears = []
  if (j === 2) tears.push(cornerTear('tr', 0.2, rnd()))
  if (j === 5) tears.push(cornerTear('br', 0.24, rnd()))
  if (j === 8) tears.push(cornerTear('tr', 0.16, rnd()))
  if (j === 10) tears.push(bottomBite(0.48, 0.13, rnd()))
  const profile = { deckleSeed, tears }
  profileCache.set(j, profile)
  return profile
}

/** Deckle inset (page units) along an edge; t ∈ [0,1] along that edge. */
export function deckleInset(edge, t, seed) {
  const base =
    Math.sin(t * 31 + seed) * 0.5 +
    Math.sin(t * 73 + seed * 2.3) * 0.3 +
    Math.sin(t * 157 + seed * 4.1) * 0.2
  const k = edge === 'fore' ? 0.012 : 0.009
  return Math.max(0, (base * 0.5 + 0.5) * k * PAGE_W)
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
