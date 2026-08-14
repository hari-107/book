import * as THREE from 'three'
import {
  INK, INK_SOFT, INK_FADED, GOLD, MARKER_YELLOW, INK_BLUE, INK_RED,
  PAGE_TEX_W, PAGE_TEX_H, PAGE_W, PAGE_H,
} from '../constants.js'
import { PLACEHOLDER_PREFIX, bookMeta } from '../data/bookContent.js'
import { drawIndexBody } from '../components/IndexPage.js'
import { sheetProfile, sampleTearBoundary } from './tearProfiles.js'
import { sobelNormalFromCanvas } from './proceduralTextures.js'

/**
 * Prints one page face of the adventure book to a CanvasTexture.
 *
 * Every page shares the same physical material language — aged parchment,
 * uneven coloration, stains, scratches, wrinkles, torn corners, fibers —
 * and each section adds its own hand-drawn personality on top (explorer
 * photos, inventor gears, blueprints, wax seals, treasure maps, chaos…).
 *
 * Returns { texture, regions } — UV-space rectangles for double-click hit
 * testing: 'logo' (navigation seal), 'index' (index entries), 'egg'
 * (fun-zone easter egg).
 */

const W = PAGE_TEX_W
const H = PAGE_TEX_H
const MARGIN = 118

// ---- fonts ----------------------------------------------------------------
export const TITLE_FONT = (px) => `${px}px "Rye", "IM Fell English SC", serif`
export const TYPE_FONT = (px) => `${px}px "Special Elite", "Courier New", monospace`
export const HAND_FONT = (px, weight = 600) => `${weight} ${px}px "Caveat", cursive`
export const FELL_FONT = (px, italic = false) => `${italic ? 'italic ' : ''}${px}px "IM Fell English", Georgia, serif`

function isPlaceholder(text) {
  return typeof text === 'string' && text.includes(PLACEHOLDER_PREFIX)
}

// ---- seeded randomness (stable per face) -----------------------------------
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seedFrom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// ---- hand-drawn helpers -----------------------------------------------------
function wobblyLine(ctx, x0, y0, x1, y1, rnd, wobble = 2.2, segments = 8) {
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    ctx.lineTo(
      x0 + (x1 - x0) * t + (rnd() - 0.5) * wobble * 2,
      y0 + (y1 - y0) * t + (rnd() - 0.5) * wobble * 2
    )
  }
  ctx.stroke()
}

function wobblyRect(ctx, x, y, w, h, rnd, wobble = 2.5) {
  wobblyLine(ctx, x, y, x + w, y, rnd, wobble)
  wobblyLine(ctx, x + w, y, x + w, y + h, rnd, wobble)
  wobblyLine(ctx, x + w, y + h, x, y + h, rnd, wobble)
  wobblyLine(ctx, x, y + h, x, y, rnd, wobble)
}

function wobblyCircle(ctx, cx, cy, r, rnd, wobble = 2) {
  ctx.beginPath()
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const rr = r + (rnd() - 0.5) * wobble * 2
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
}

// ---- parchment --------------------------------------------------------------
/**
 * Cloudy multi-octave mottling: a tiny canvas of sparse warm-brown pixels,
 * bilinearly upscaled over the page. Layered at several scales it produces
 * the soft watermark clouds of genuinely old paper.
 */
function cloudLayer(ctx, rnd, cellsX, cellsY, maxAlpha, tone = [150, 118, 66]) {
  const tiny = document.createElement('canvas')
  tiny.width = cellsX
  tiny.height = cellsY
  const tctx = tiny.getContext('2d')
  const img = tctx.createImageData(cellsX, cellsY)
  for (let i = 0; i < cellsX * cellsY; i++) {
    const a = Math.pow(rnd(), 2.6) * maxAlpha * 255
    img.data[i * 4] = tone[0]
    img.data[i * 4 + 1] = tone[1]
    img.data[i * 4 + 2] = tone[2]
    img.data[i * 4 + 3] = a
  }
  tctx.putImageData(img, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tiny, 0, 0, W, H)
  ctx.restore()
}

function paintParchment(ctx, side, rnd, relief = { creases: [], cracks: [], stains: [], tides: [], folds: [] }) {
  // base — pale aged ivory (reference photo tone): near-cream center,
  // aging lives in the clouds, creases and edges, not a uniform yellow.
  const grad = ctx.createRadialGradient(W * (0.42 + rnd() * 0.16), H * (0.35 + rnd() * 0.2), H * 0.2, W / 2, H / 2, H * 0.8)
  grad.addColorStop(0, '#e9e3d2')
  grad.addColorStop(0.55, '#e0d7bf')
  grad.addColorStop(1, '#c8b78e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // cloudy age mottling at three scales
  cloudLayer(ctx, rnd, 6, 8, 0.26)
  cloudLayer(ctx, rnd, 14, 18, 0.18)
  cloudLayer(ctx, rnd, 42, 55, 0.1)
  // pale "cleaner" patches breaking the clouds up
  cloudLayer(ctx, rnd, 9, 12, 0.2, [244, 238, 222])

  // one or two big distinct stain regions (like the reference's tan cloud)
  const stainCount = 1 + (rnd() > 0.55 ? 1 : 0)
  for (let s = 0; s < stainCount; s++) {
    const cx = rnd() > 0.5 ? W * (0.6 + rnd() * 0.35) : W * (0.05 + rnd() * 0.3)
    const cy = H * (0.05 + rnd() * 0.5)
    relief.stains.push({ x: cx, y: cy, r: 180 + rnd() * 120 })
    for (let i = 0; i < 7; i++) {
      const x = cx + (rnd() - 0.5) * 220
      const y = cy + (rnd() - 0.5) * 260
      const r = 70 + rnd() * 150
      const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r)
      g.addColorStop(0, `rgba(146,112,60,${(0.05 + rnd() * 0.09).toFixed(3)})`)
      g.addColorStop(1, 'rgba(146,112,60,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
    // tide line around part of the stain — the sharp dried edge of an old wet patch
    ctx.strokeStyle = `rgba(122,90,44,${(0.14 + rnd() * 0.1).toFixed(3)})`
    ctx.lineWidth = 2.4
    ctx.beginPath()
    const rr = 140 + rnd() * 90
    const a0 = rnd() * Math.PI * 2
    const tidePts = []
    for (let i = 0; i <= 26; i++) {
      const a = a0 + (i / 26) * Math.PI * (1.1 + rnd() * 0.6)
      const r = rr * (0.82 + rnd() * 0.36)
      const px = cx + Math.cos(a) * r
      const py = cy + Math.sin(a) * r * 0.8
      tidePts.push([px, py])
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
    relief.tides.push(tidePts)
  }

  // paper fibers
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const a = rnd() * Math.PI
    const len = 2 + rnd() * 5
    ctx.strokeStyle = `rgba(110,85,45,${(rnd() * 0.09).toFixed(3)})`
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }

  // scratches
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = rnd() > 0.5 ? 'rgba(80,55,20,0.13)' : 'rgba(250,240,210,0.2)'
    ctx.lineWidth = 0.9
    const x = rnd() * W
    const y = rnd() * H
    wobblyLine(ctx, x, y, x + (rnd() - 0.5) * 260, y + (rnd() - 0.5) * 180, rnd, 3, 5)
  }

  // ---- crumple-crease network — the dominant texture of old handled paper.
  // Long, slightly curved creases crossing the page: a pale cracked ridge
  // with a soft shadow along one side, occasionally branching.
  const creasePath = (x0, y0, x1, y1) => {
    const pts = [[x0, y0]]
    const segs = 4 + Math.floor(rnd() * 3)
    for (let i = 1; i < segs; i++) {
      const t = i / segs
      pts.push([
        x0 + (x1 - x0) * t + (rnd() - 0.5) * 90,
        y0 + (y1 - y0) * t + (rnd() - 0.5) * 90,
      ])
    }
    pts.push([x1, y1])
    return pts
  }
  const strokeCrease = (pts, strength) => {
    // perpendicular-ish shadow offset
    const dx = pts[pts.length - 1][0] - pts[0][0]
    const dy = pts[pts.length - 1][1] - pts[0][1]
    const len = Math.hypot(dx, dy) || 1
    const ox = (-dy / len) * 4.5
    const oy = (dx / len) * 4.5
    // broad soft shadow side (the flattened crumple valley)
    ctx.strokeStyle = `rgba(104,82,48,${(0.09 * strength).toFixed(3)})`
    ctx.lineWidth = 20
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + ox * 1.6, y + oy * 1.6) : ctx.lineTo(x + ox * 1.6, y + oy * 1.6)))
    ctx.stroke()
    ctx.strokeStyle = `rgba(104,82,48,${(0.14 * strength).toFixed(3)})`
    ctx.lineWidth = 9
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x + ox, y + oy) : ctx.lineTo(x + ox, y + oy)))
    ctx.stroke()
    ctx.strokeStyle = `rgba(96,74,42,${(0.2 * strength).toFixed(3)})`
    ctx.lineWidth = 3.6
    ctx.stroke()
    // pale cracked ridge catching the light
    ctx.strokeStyle = `rgba(252,248,238,${(0.55 * strength).toFixed(3)})`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.stroke()
    ctx.strokeStyle = `rgba(255,252,244,${(0.3 * strength).toFixed(3)})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
  // broad crumple facets — big soft tonal planes left by old crumpling
  for (let i = 0; i < 5; i++) {
    const ang = rnd() * Math.PI
    const cxx = rnd() * W
    const cyy = rnd() * H
    const span = 260 + rnd() * 320
    const g = ctx.createLinearGradient(
      cxx - Math.cos(ang) * span, cyy - Math.sin(ang) * span,
      cxx + Math.cos(ang) * span, cyy + Math.sin(ang) * span
    )
    const dark = rnd() > 0.5
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, dark ? `rgba(110,88,52,${(0.05 + rnd() * 0.05).toFixed(3)})` : `rgba(248,242,228,${(0.06 + rnd() * 0.06).toFixed(3)})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  const edgePoint = () => {
    const e = Math.floor(rnd() * 4)
    if (e === 0) return [rnd() * W, -10]
    if (e === 1) return [rnd() * W, H + 10]
    if (e === 2) return [-10, rnd() * H]
    return [W + 10, rnd() * H]
  }
  const creaseCount = 9 + Math.floor(rnd() * 5)
  for (let i = 0; i < creaseCount; i++) {
    const [x0, y0] = edgePoint()
    const long = rnd() > 0.35
    const x1 = long ? edgePoint()[0] : W * (0.2 + rnd() * 0.6)
    const y1 = long ? edgePoint()[1] : H * (0.2 + rnd() * 0.6)
    const pts = creasePath(x0, y0, x1, y1)
    const strength = 0.55 + rnd() * 0.45
    strokeCrease(pts, strength)
    relief.creases.push({ pts, strength })
    // branch from a midpoint
    if (rnd() > 0.55) {
      const [bx, by] = pts[Math.floor(pts.length / 2)]
      const bpts = creasePath(bx, by, bx + (rnd() - 0.5) * 500, by + (rnd() - 0.5) * 420)
      strokeCrease(bpts, strength * 0.7)
      relief.creases.push({ pts: bpts, strength: strength * 0.7 })
    }
  }
  // a couple of sharp hairline cracks
  for (let i = 0; i < 2; i++) {
    const [x0, y0] = edgePoint()
    const pts = creasePath(x0, y0, W * (0.25 + rnd() * 0.5), H * (0.25 + rnd() * 0.5))
    relief.cracks.push(pts)
    ctx.strokeStyle = 'rgba(255,252,244,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    pts.forEach(([x, y], j) => (j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.stroke()
    ctx.strokeStyle = 'rgba(95,75,45,0.22)'
    ctx.beginPath()
    pts.forEach(([x, y], j) => (j === 0 ? ctx.moveTo(x + 1.4, y + 1.4) : ctx.lineTo(x + 1.4, y + 1.4)))
    ctx.stroke()
  }

  // foxing — the rust-brown speckle of damp-aged paper
  const speckCount = 26 + Math.floor(rnd() * 30)
  for (let i = 0; i < speckCount; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 0.7 + rnd() * (rnd() > 0.85 ? 5 : 1.8)
    ctx.fillStyle = `rgba(${105 + Math.floor(rnd() * 40)},${64 + Math.floor(rnd() * 26)},28,${(0.12 + rnd() * 0.3).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // a few blooming foxing spots
  for (let i = 0; i < 4; i++) {
    if (rnd() < 0.4) continue
    const x = rnd() * W
    const y = rnd() * H
    const r = 6 + rnd() * 14
    const g = ctx.createRadialGradient(x, y, 0.5, x, y, r)
    g.addColorStop(0, 'rgba(120,72,28,0.4)')
    g.addColorStop(0.5, 'rgba(140,95,40,0.18)')
    g.addColorStop(1, 'rgba(140,95,40,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // deep browned borders — layered gradient plus irregular grime blotches
  const edge = (x0, y0, x1, y1, a) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, `rgba(96,64,26,${a})`)
    g.addColorStop(0.5, `rgba(110,78,36,${a * 0.4})`)
    g.addColorStop(1, 'rgba(110,78,36,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  edge(0, 0, W * 0.1, 0, 0.4 + rnd() * 0.15)
  edge(W, 0, W * 0.88, 0, 0.42 + rnd() * 0.15)
  edge(0, 0, 0, H * 0.09, 0.38 + rnd() * 0.12)
  edge(0, H, 0, H * 0.9, 0.4 + rnd() * 0.12)
  // grime blotches hugging the borders (uneven, hand-worn)
  for (let i = 0; i < 26; i++) {
    const along = rnd()
    const e = Math.floor(rnd() * 4)
    let x, y
    if (e === 0) (x = along * W), (y = rnd() * H * 0.045)
    else if (e === 1) (x = along * W), (y = H - rnd() * H * 0.045)
    else if (e === 2) (x = rnd() * W * 0.05), (y = along * H)
    else (x = W - rnd() * W * 0.05), (y = along * H)
    const r = 14 + rnd() * 46
    const g = ctx.createRadialGradient(x, y, 1, x, y, r)
    g.addColorStop(0, `rgba(84,54,20,${(0.1 + rnd() * 0.16).toFixed(3)})`)
    g.addColorStop(1, 'rgba(84,54,20,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  // darker corners
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 150 + rnd() * 80)
    g.addColorStop(0, `rgba(78,50,20,${(0.3 + rnd() * 0.15).toFixed(3)})`)
    g.addColorStop(1, 'rgba(78,50,20,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  // ragged rims of the sheets layered beneath, peeking past the fore-edge
  const foreX = side === 'right' ? W : 0
  const rimDir = side === 'right' ? -1 : 1
  for (let layer = 0; layer < 3; layer++) {
    const inset = 4 + layer * 5
    ctx.strokeStyle = layer % 2 === 0 ? 'rgba(214,190,140,0.5)' : 'rgba(120,88,44,0.4)'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    for (let yy = H * 0.03; yy < H * 0.97; yy += 26) {
      const x = foreX + rimDir * (inset + Math.sin(yy * 0.05 + layer * 3 + rnd() * 0.4) * 3 + rnd() * 2)
      yy < H * 0.04 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // torn / worn corners
  const corners = [
    [0, 0, 1, 1],
    [W, 0, -1, 1],
    [0, H, 1, -1],
    [W, H, -1, -1],
  ]
  corners.forEach(([cx, cy, sx, sy]) => {
    if (rnd() > 0.45) return
    ctx.fillStyle = `rgba(60,38,12,${0.2 + rnd() * 0.2})`
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    const s = 26 + rnd() * 46
    ctx.lineTo(cx + sx * s, cy)
    ctx.lineTo(cx + sx * s * 0.4, cy + sy * s * 0.5)
    ctx.lineTo(cx, cy + sy * s)
    ctx.closePath()
    ctx.fill()
  })

  // gutter shadow on the spine side — deep and warm, like the reference fold
  const gw = W * 0.115
  const g = side === 'right' ? ctx.createLinearGradient(0, 0, gw, 0) : ctx.createLinearGradient(W, 0, W - gw, 0)
  g.addColorStop(0, 'rgba(48,30,10,0.55)')
  g.addColorStop(0.45, 'rgba(80,54,22,0.24)')
  g.addColorStop(1, 'rgba(80,54,22,0)')
  ctx.fillStyle = g
  ctx.fillRect(side === 'right' ? 0 : W - gw, 0, gw, H)
}

// ---- stains & marks ----------------------------------------------------------
function coffeeRing(ctx, rnd, x, y, r) {
  for (let i = 0; i < 30; i++) {
    const a0 = rnd() * Math.PI * 2
    const a1 = a0 + 0.1 + rnd() * 0.6
    ctx.strokeStyle = `rgba(110,70,25,${(0.05 + rnd() * 0.14).toFixed(3)})`
    ctx.lineWidth = 3 + rnd() * 6
    ctx.beginPath()
    ctx.arc(x, y, r + (rnd() - 0.5) * 5, a0, a1)
    ctx.stroke()
  }
}

function inkSplat(ctx, rnd, x, y, color = 'rgba(45,30,10,0.5)', scale = 1) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, (5 + rnd() * 9) * scale, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2
    const d = (8 + rnd() * 46) * scale
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, (0.8 + rnd() * 3.4) * scale, 0, Math.PI * 2)
    ctx.fill()
  }
}

function rubberStamp(ctx, rnd, text, x, y, rot, color = INK_RED) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = 0.55 + rnd() * 0.2
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 4
  ctx.font = TYPE_FONT(30)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(text).width
  wobblyRect(ctx, -tw / 2 - 20, -30, tw + 40, 60, rnd, 1.5)
  ctx.fillText(text, 0, 2)
  ctx.restore()
  ctx.globalAlpha = 1
}

function annotation(ctx, rnd, text, x, y, rot = 0, px = 34, color = INK_FADED) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = color
  ctx.font = HAND_FONT(px)
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function fingerprint(ctx, rnd, x, y, scale = 1, alpha = 0.07) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rnd() * Math.PI)
  ctx.strokeStyle = `rgba(70,48,22,${alpha})`
  ctx.lineWidth = 2.2 * scale
  for (let i = 0; i < 7; i++) {
    const r = (7 + i * 5.5) * scale
    const a0 = rnd() * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 0.72, 0.3, a0, a0 + Math.PI * (0.9 + rnd() * 0.8))
    ctx.stroke()
  }
  ctx.restore()
}

function foldedCorner(ctx, rnd, corner, side, relief) {
  // a dog-eared fore-edge corner, drawn as light + shadow.
  // The fore-edge sits at canvas-right on right pages, canvas-left on left pages.
  const s = 70 + rnd() * 60
  const top = corner === 'tr'
  const cy = top ? 0 : H
  const sy = top ? 1 : -1
  const fx = side === 'right' ? W : 0
  const sx = side === 'right' ? -1 : 1 // direction from fore-edge into the page
  if (relief) relief.folds.push({ fx, cy, sx, sy, s })
  ctx.save()
  // shadow under the fold
  ctx.fillStyle = 'rgba(60,40,16,0.3)'
  ctx.beginPath()
  ctx.moveTo(fx + sx * (s + 8), cy)
  ctx.lineTo(fx, cy + sy * (s + 8))
  ctx.lineTo(fx, cy + sy * s)
  ctx.lineTo(fx + sx * s, cy)
  ctx.closePath()
  ctx.fill()
  // the folded flap (lighter — raw paper back)
  ctx.fillStyle = 'rgba(238,229,200,0.95)'
  ctx.beginPath()
  ctx.moveTo(fx + sx * s, cy)
  ctx.lineTo(fx, cy + sy * s)
  ctx.lineTo(fx + sx * s * 0.94, cy + sy * s * 0.9)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,95,55,0.5)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(fx + sx * s, cy)
  ctx.lineTo(fx, cy + sy * s)
  ctx.stroke()
  ctx.restore()
}

function burnMark(ctx, rnd, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r)
  g.addColorStop(0, 'rgba(25,14,5,0.75)')
  g.addColorStop(0.45, 'rgba(60,32,10,0.5)')
  g.addColorStop(0.75, 'rgba(110,64,20,0.3)')
  g.addColorStop(1, 'rgba(140,90,35,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

// page space (x: 0=spine..PAGE_W, y: -H/2..H/2) → canvas pixels
function pageToCanvas(x, y, side) {
  const X = side === 'right' ? (x / PAGE_W) * W : (1 - x / PAGE_W) * W
  const Y = (0.5 - y / PAGE_H) * H
  return [X, Y]
}

/**
 * Ink the real tears so the collapsed mesh edge reads as thick, ripped,
 * curled paper: a wide soft contact shadow of the lifted fringe, a dark
 * inner fiber band, a bright jagged paper-core lip that catches light, and
 * hair-fine fibers straggling past the edge into the missing region.
 */
function paintTears(ctx, face, side, rnd) {
  const profile = sheetProfile(Math.floor(face.faceIndex / 2))
  for (const tear of profile.tears) {
    const bpts = sampleTearBoundary(tear, 150) // page space
    const pts = bpts.map(([x, y]) => pageToCanvas(x, y, side))
    // inward normal (into kept paper) for each boundary point
    const normals = bpts.map(([x, y]) => {
      const dx = x - tear.c[0]
      const dy = y - tear.c[1]
      const d = Math.hypot(dx, dy) || 1
      // toward center = into the missing region; negate for "into kept paper"
      const inx = -dx / d
      const iny = -dy / d
      // page→canvas flips x on the left face and always flips y
      return [side === 'right' ? inx : -inx, -iny]
    })

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 1) soft cast shadow of the curled fringe, offset into the kept paper
    ctx.strokeStyle = 'rgba(48,30,12,0.32)'
    ctx.lineWidth = 34
    ctx.beginPath()
    pts.forEach(([X, Y], i) => {
      const [nx, ny] = normals[i]
      const x = X + nx * 16
      const y = Y + ny * 16
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 2) dark inner fiber band right at the rip
    ctx.strokeStyle = 'rgba(70,46,20,0.6)'
    ctx.lineWidth = 12
    ctx.beginPath()
    pts.forEach(([X, Y], i) => {
      const [nx, ny] = normals[i]
      const x = X + nx * 5
      const y = Y + ny * 5
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 3) bright torn paper-core lip (the exposed inner fibers, catching light)
    ctx.strokeStyle = 'rgba(247,240,220,0.95)'
    ctx.lineWidth = 6
    ctx.beginPath()
    pts.forEach(([X, Y], i) => {
      const jx = X + (rnd() - 0.5) * 3
      const jy = Y + (rnd() - 0.5) * 3
      i === 0 ? ctx.moveTo(jx, jy) : ctx.lineTo(jx, jy)
    })
    ctx.stroke()
    // thin warm underline just beneath the lip → paper thickness
    ctx.strokeStyle = 'rgba(205,175,120,0.8)'
    ctx.lineWidth = 2.4
    ctx.beginPath()
    pts.forEach(([X, Y], i) => {
      const [nx, ny] = normals[i]
      const x = X - nx * 3
      const y = Y - ny * 3
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 4) straggling fibers reaching out past the edge into the gap
    for (let i = 0; i < pts.length; i += 3) {
      const [X, Y] = pts[i]
      const [nx, ny] = normals[i]
      const len = 4 + rnd() * 16
      ctx.strokeStyle = `rgba(232,222,196,${(0.4 + rnd() * 0.45).toFixed(2)})`
      ctx.lineWidth = 0.8 + rnd() * 1.1
      ctx.beginPath()
      ctx.moveTo(X + nx * 2, Y + ny * 2)
      ctx.lineTo(X - nx * len + (rnd() - 0.5) * 10, Y - ny * len + (rnd() - 0.5) * 10)
      ctx.stroke()
    }
    ctx.restore()

    // a note that carries on across the tear
    const [mx, my] = pts[Math.floor(pts.length / 2)]
    annotation(ctx, rnd, 'this part is lost to history…', mx + (side === 'right' ? -140 : 140), my + 66, -0.08, 27)
  }
}

// ---- doodle library ------------------------------------------------------------
const doodles = {
  star(ctx, rnd, x, y, s) {
    ctx.beginPath()
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? s : s * 0.45
      const px = x + Math.cos(a) * r + (rnd() - 0.5) * 2
      const py = y + Math.sin(a) * r + (rnd() - 0.5) * 2
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
  },
  arrow(ctx, rnd, x, y, len, rot) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(len * 0.5, (rnd() - 0.5) * 30, len, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(len, 0)
    ctx.lineTo(len - 14, -9)
    ctx.moveTo(len, 0)
    ctx.lineTo(len - 14, 9)
    ctx.stroke()
    ctx.restore()
  },
  spiral(ctx, rnd, x, y, s) {
    ctx.beginPath()
    for (let i = 0; i < 40; i++) {
      const a = i * 0.45
      const r = (i / 40) * s
      const px = x + Math.cos(a) * r
      const py = y + Math.sin(a) * r
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
  },
  compass(ctx, rnd, x, y, s) {
    wobblyCircle(ctx, x, y, s, rnd)
    wobblyCircle(ctx, x, y, s * 0.72, rnd, 1.4)
    ctx.beginPath()
    ctx.moveTo(x, y - s * 0.6)
    ctx.lineTo(x + s * 0.16, y)
    ctx.lineTo(x, y + s * 0.6)
    ctx.lineTo(x - s * 0.16, y)
    ctx.closePath()
    ctx.stroke()
    ctx.font = TYPE_FONT(Math.round(s * 0.34))
    ctx.textAlign = 'center'
    ctx.fillText('N', x, y - s * 1.18)
  },
  gear(ctx, rnd, x, y, s, teeth = 9) {
    ctx.beginPath()
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2
      const a1 = ((i + 0.5) / teeth) * Math.PI * 2
      ctx.lineTo(x + Math.cos(a0) * s, y + Math.sin(a0) * s)
      ctx.lineTo(x + Math.cos(a1) * s * 0.74, y + Math.sin(a1) * s * 0.74)
    }
    ctx.closePath()
    ctx.stroke()
    wobblyCircle(ctx, x, y, s * 0.28, rnd, 1)
  },
  skull(ctx, rnd, x, y, s) {
    wobblyCircle(ctx, x, y, s, rnd, 1.6)
    ctx.fillRect(x - s * 0.55, y + s * 0.55, s * 1.1, s * 0.5)
    ctx.beginPath()
    ctx.arc(x - s * 0.36, y - s * 0.1, s * 0.22, 0, Math.PI * 2)
    ctx.arc(x + s * 0.36, y - s * 0.1, s * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, y + s * 0.14)
    ctx.lineTo(x - s * 0.12, y + s * 0.4)
    ctx.lineTo(x + s * 0.12, y + s * 0.4)
    ctx.closePath()
    ctx.fill()
  },
  trophy(ctx, rnd, x, y, s) {
    wobblyLine(ctx, x - s * 0.6, y - s, x + s * 0.6, y - s, rnd, 1.5)
    ctx.beginPath()
    ctx.moveTo(x - s * 0.55, y - s)
    ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.1, x, y + s * 0.18)
    ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.1, x + s * 0.55, y - s)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - s * 0.62, y - s * 0.82)
    ctx.quadraticCurveTo(x - s * 1.1, y - s * 0.5, x - s * 0.45, y - s * 0.2)
    ctx.moveTo(x + s * 0.62, y - s * 0.82)
    ctx.quadraticCurveTo(x + s * 1.1, y - s * 0.5, x + s * 0.45, y - s * 0.2)
    ctx.stroke()
    wobblyLine(ctx, x - s * 0.3, y + s * 0.55, x + s * 0.3, y + s * 0.55, rnd, 1.2)
    wobblyLine(ctx, x, y + s * 0.2, x, y + s * 0.52, rnd, 1)
  },
  envelope(ctx, rnd, x, y, w, h) {
    wobblyRect(ctx, x - w / 2, y - h / 2, w, h, rnd, 2)
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y - h / 2)
    ctx.lineTo(x, y + h * 0.08)
    ctx.lineTo(x + w / 2, y - h / 2)
    ctx.stroke()
  },
  bulb(ctx, rnd, x, y, s) {
    wobblyCircle(ctx, x, y, s, rnd, 1.5)
    wobblyLine(ctx, x - s * 0.3, y + s * 1.25, x + s * 0.3, y + s * 1.25, rnd, 1)
    wobblyLine(ctx, x - s * 0.25, y + s * 1.5, x + s * 0.25, y + s * 1.5, rnd, 1)
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5
      wobblyLine(ctx, x + Math.cos(a) * s * 1.25, y + Math.sin(a) * s * 1.25, x + Math.cos(a) * s * 1.7, y + Math.sin(a) * s * 1.7, rnd, 1, 2)
    }
  },
  robot(ctx, rnd, x, y, s) {
    // head
    wobblyRect(ctx, x - s * 0.45, y - s * 1.5, s * 0.9, s * 0.7, rnd, 1.6)
    ctx.beginPath()
    ctx.arc(x - s * 0.2, y - s * 1.17, s * 0.08, 0, Math.PI * 2)
    ctx.arc(x + s * 0.2, y - s * 1.17, s * 0.08, 0, Math.PI * 2)
    ctx.fill()
    wobblyLine(ctx, x - s * 0.16, y - s * 0.98, x + s * 0.16, y - s * 0.98, rnd, 1)
    // antenna
    wobblyLine(ctx, x, y - s * 1.5, x + s * 0.12, y - s * 1.85, rnd, 1, 3)
    ctx.beginPath()
    ctx.arc(x + s * 0.14, y - s * 1.9, s * 0.07, 0, Math.PI * 2)
    ctx.stroke()
    // body
    wobblyRect(ctx, x - s * 0.55, y - s * 0.7, s * 1.1, s * 1.05, rnd, 1.8)
    wobblyCircle(ctx, x, y - s * 0.18, s * 0.18, rnd, 1)
    // arms waving
    wobblyLine(ctx, x - s * 0.55, y - s * 0.5, x - s * 1.05, y - s * 0.9, rnd, 1.4, 3)
    wobblyLine(ctx, x + s * 0.55, y - s * 0.5, x + s * 1.0, y - s * 0.2, rnd, 1.4, 3)
    // legs
    wobblyLine(ctx, x - s * 0.25, y + s * 0.35, x - s * 0.3, y + s * 0.8, rnd, 1.2, 3)
    wobblyLine(ctx, x + s * 0.25, y + s * 0.35, x + s * 0.32, y + s * 0.8, rnd, 1.2, 3)
    wobblyLine(ctx, x - s * 0.45, y + s * 0.8, x - s * 0.15, y + s * 0.8, rnd, 1, 2)
    wobblyLine(ctx, x + s * 0.18, y + s * 0.8, x + s * 0.48, y + s * 0.8, rnd, 1, 2)
  },
  xmark(ctx, rnd, x, y, s) {
    ctx.lineWidth = 5
    wobblyLine(ctx, x - s, y - s, x + s, y + s, rnd, 2, 4)
    wobblyLine(ctx, x + s, y - s, x - s, y + s, rnd, 2, 4)
  },
  footprints(ctx, rnd, x, y, count, rot) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -8 : 8
      ctx.beginPath()
      ctx.ellipse(i * 26, side, 6, 10, rot * 0.1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },
  maze(ctx, rnd, x, y, s) {
    wobblyRect(ctx, x, y, s, s, rnd, 1.5)
    const g = s / 5
    for (let i = 1; i < 5; i++) {
      if (rnd() > 0.4) wobblyLine(ctx, x + i * g, y, x + i * g, y + s - g * (1 + Math.floor(rnd() * 3)), rnd, 1, 3)
      if (rnd() > 0.4) wobblyLine(ctx, x, y + i * g, x + s - g * (1 + Math.floor(rnd() * 3)), y + i * g, rnd, 1, 3)
    }
    ctx.font = HAND_FONT(22)
    ctx.textAlign = 'left'
    ctx.fillText('no exit. sorry.', x + 4, y + s + 24)
  },
  mountainBadge(ctx, rnd, x, y, w, h) {
    wobblyRect(ctx, x - w / 2, y - h / 2, w, h, rnd, 2)
    ctx.beginPath()
    ctx.moveTo(x - w * 0.32, y + h * 0.22)
    ctx.lineTo(x - w * 0.1, y - h * 0.18)
    ctx.lineTo(x + w * 0.05, y + h * 0.05)
    ctx.lineTo(x + w * 0.18, y - h * 0.1)
    ctx.lineTo(x + w * 0.34, y + h * 0.22)
    ctx.stroke()
    ctx.font = TYPE_FONT(20)
    ctx.textAlign = 'center'
    ctx.fillText('ADVENTURE', x, y + h * 0.34 + 14)
  },
  waxSeal(ctx, rnd, x, y, s) {
    ctx.save()
    ctx.fillStyle = 'rgba(140,35,25,0.55)'
    ctx.beginPath()
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * Math.PI * 2
      const r = s * (0.9 + rnd() * 0.2)
      const px = x + Math.cos(a) * r
      const py = y + Math.sin(a) * r
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(90,20,12,0.7)'
    ctx.lineWidth = 2
    wobblyCircle(ctx, x, y, s * 0.55, rnd, 1.5)
    ctx.restore()
  },
}

function ink(ctx, alpha = 0.75, width = 3) {
  ctx.strokeStyle = `rgba(51,38,21,${alpha})`
  ctx.fillStyle = `rgba(51,38,21,${alpha})`
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

// ---- theme decorators ------------------------------------------------------
// Each paints margin personality and may return extra hit regions.
const themeDecor = {
  explorer(ctx, rnd) {
    ink(ctx, 0.55)
    doodles.compass(ctx, rnd, W - 150, 300, 52)
    doodles.footprints(ctx, rnd, MARGIN - 30, H - 320, 6, -0.5)
    doodles.star(ctx, rnd, W - 120, H - 380, 14)
    annotation(ctx, rnd, 'the story so far →', W - 240, H - 300, -0.08)
    rubberStamp(ctx, rnd, 'EXPLORER', W - 200, 170, -0.18)
    return []
  },
  inventor(ctx, rnd) {
    ink(ctx, 0.5)
    doodles.gear(ctx, rnd, W - 130, 260, 42)
    doodles.gear(ctx, rnd, W - 200, 330, 26, 7)
    doodles.bulb(ctx, rnd, MARGIN - 42, 420, 22)
    doodles.arrow(ctx, rnd, W - 260, 420, 90, 2.6)
    annotation(ctx, rnd, 'needs more gears', W - 180, 420, 0.12, 30)
    annotation(ctx, rnd, 'v2 someday', MARGIN + 30, H - 260, -0.1, 28)
    return []
  },
  journal(ctx, rnd) {
    ink(ctx, 0.5)
    // hand-drawn timeline down the outer margin
    const x = W - 96
    wobblyLine(ctx, x, 320, x, H - 300, rnd, 3, 14)
    for (let i = 0; i < 4; i++) {
      const y = 360 + i * ((H - 680) / 3)
      wobblyCircle(ctx, x, y, 9, rnd, 1)
    }
    annotation(ctx, rnd, 'time →', x - 6, 296, Math.PI / 2 - 0.05, 26)
    rubberStamp(ctx, rnd, 'LOGBOOK', 230, 180, 0.14, INK_BLUE)
    return []
  },
  blueprint(ctx, rnd) {
    // pinned blueprint panel in a corner — grid + plan lines
    const bx = W - 330
    const by = 220
    const bw = 240
    const bh = 190
    ctx.save()
    ctx.translate(bx + bw / 2, by + bh / 2)
    ctx.rotate(-0.05 + rnd() * 0.1)
    ctx.translate(-bw / 2, -bh / 2)
    ctx.fillStyle = 'rgba(40,70,110,0.82)'
    ctx.fillRect(0, 0, bw, bh)
    ctx.strokeStyle = 'rgba(200,225,255,0.35)'
    ctx.lineWidth = 1
    for (let x = 0; x <= bw; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, bh); ctx.stroke()
    }
    for (let y = 0; y <= bh; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(bw, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(235,245,255,0.85)'
    ctx.lineWidth = 2.4
    ctx.strokeRect(30, 40, 110, 80)
    ctx.beginPath()
    ctx.moveTo(140, 80)
    ctx.lineTo(200, 80)
    ctx.stroke()
    ctx.strokeRect(185, 58, 34, 44)
    ctx.font = TYPE_FONT(16)
    ctx.fillStyle = 'rgba(235,245,255,0.9)'
    ctx.fillText('FIG. 1', 30, 30)
    ctx.restore()
    // tape holding it
    ctx.fillStyle = 'rgba(230,215,170,0.5)'
    ctx.fillRect(bx + bw / 2 - 40, by - 12, 80, 24)
    ink(ctx, 0.5)
    annotation(ctx, rnd, 'blueprints (trust me)', bx + bw / 2, by + bh + 40, 0.06, 30)
    return []
  },
  stamps(ctx, rnd) {
    ink(ctx, 0.5)
    doodles.waxSeal(ctx, rnd, W - 150, H - 330, 44)
    rubberStamp(ctx, rnd, 'CERTIFIED', W - 230, 220, -0.22)
    rubberStamp(ctx, rnd, 'OFFICIAL-ISH', 250, H - 280, 0.12, INK_BLUE)
    // ribbon
    ink(ctx, 0.55)
    wobblyLine(ctx, W - 150, H - 290, W - 172, H - 220, rnd, 2, 4)
    wobblyLine(ctx, W - 150, H - 290, W - 128, H - 222, rnd, 2, 4)
    return []
  },
  treasure(ctx, rnd) {
    ink(ctx, 0.55)
    // dashed treasure path to an X
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.moveTo(MARGIN, H - 260)
    ctx.quadraticCurveTo(W * 0.4, H - 380, W * 0.62, H - 300)
    ctx.quadraticCurveTo(W * 0.78, H - 240, W - 170, H - 330)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = INK_RED
    ctx.lineWidth = 6
    doodles.xmark(ctx, rnd, W - 150, H - 340, 20)
    ink(ctx, 0.55)
    doodles.trophy(ctx, rnd, W - 140, 300, 34)
    doodles.star(ctx, rnd, W - 220, 240, 12)
    doodles.star(ctx, rnd, W - 90, 240, 9)
    annotation(ctx, rnd, 'the good stuff', W - 160, 380, 0.1, 28)
    return []
  },
  scholar(ctx, rnd) {
    ink(ctx, 0.5)
    // stacked books
    const bx = W - 210
    const by = 300
    for (let i = 0; i < 3; i++) {
      wobblyRect(ctx, bx - 10 + (rnd() - 0.5) * 16, by - i * 26, 130, 22, rnd, 1.6)
    }
    // graduation cap
    wobblyLine(ctx, bx + 10, by - 96, bx + 110, by - 96, rnd, 2, 4)
    ctx.beginPath()
    ctx.moveTo(bx + 25, by - 96)
    ctx.lineTo(bx + 60, by - 78)
    ctx.lineTo(bx + 95, by - 96)
    ctx.stroke()
    wobblyLine(ctx, bx + 95, by - 92, bx + 100, by - 60, rnd, 1.5, 3)
    annotation(ctx, rnd, 'knowledge!!', bx + 60, by + 60, -0.08, 28)
    return []
  },
  chaos(ctx, rnd, face) {
    ink(ctx, 0.55)
    doodles.robot(ctx, rnd, W - 170, H - 420, 46)
    doodles.spiral(ctx, rnd, MARGIN - 30, 300, 30)
    doodles.star(ctx, rnd, W - 110, 260, 16)
    doodles.maze(ctx, rnd, MARGIN - 10, H - 470, 110)
    doodles.arrow(ctx, rnd, W * 0.45, 280, 120, 0.7)
    annotation(ctx, rnd, 'why are you reading the margins?', W * 0.5, H - 210, 0.04, 26)
    // upside-down secret
    ctx.save()
    ctx.translate(W * 0.72, 300)
    ctx.rotate(Math.PI)
    ctx.font = HAND_FONT(24)
    ctx.fillStyle = INK_FADED
    ctx.textAlign = 'center'
    ctx.fillText('you found me. nice.', 0, 0)
    ctx.restore()
    // crossed-out joke
    ctx.font = TYPE_FONT(26)
    ctx.fillStyle = INK_FADED
    ctx.textAlign = 'left'
    const joke = 'my only weakness'
    ctx.fillText(joke, W * 0.42, H - 300)
    const jw = ctx.measureText(joke).width
    ink(ctx, 0.6, 3)
    wobblyLine(ctx, W * 0.42 - 4, H - 308, W * 0.42 + jw + 6, H - 306, rnd, 2, 4)
    annotation(ctx, rnd, 'redacted', W * 0.42 + jw + 70, H - 302, -0.06, 26, INK_RED)

    // the DO NOT PRESS button — an actual easter egg region
    if (face.id === 'fun-1') {
      const bx = W * 0.62
      const by = H * 0.62
      ctx.save()
      ctx.translate(bx, by)
      ctx.rotate(-0.04)
      ctx.fillStyle = 'rgba(150,40,30,0.8)'
      ctx.strokeStyle = 'rgba(60,15,10,0.9)'
      ctx.lineWidth = 4
      const bw = 220
      const bh = 84
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh)
      wobblyRect(ctx, -bw / 2, -bh / 2, bw, bh, rnd, 2)
      ctx.fillStyle = '#f3e6c4'
      ctx.font = TYPE_FONT(30)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('DO NOT PRESS', 0, 2)
      ctx.restore()
      annotation(ctx, rnd, '(double-click it. obviously.)', bx, by + 78, 0.03, 26)
      return [uvRect(bx - 130, by - 60, bx + 130, by + 60, 'egg')]
    }
    if (face.id === 'fun-2') {
      // hidden interactive: the robot itself is ticklish
      annotation(ctx, rnd, 'do not tickle the robot', W - 170, H - 300, 0.06, 24)
      return [uvRect(W - 280, H - 540, W - 60, H - 320, 'egg')]
    }
    return []
  },
  reports(ctx, rnd) {
    ink(ctx, 0.55)
    // TOP SECRET / DECLASSIFIED stamp
    rubberStamp(ctx, rnd, 'DECLASSIFIED', W - 210, 190, -0.16, INK_RED)
    // a redacted bar
    ctx.fillStyle = 'rgba(20,14,6,0.9)'
    ctx.fillRect(W - 320, H - 360, 220, 34)
    annotation(ctx, rnd, 'need-to-know', W - 210, H - 316, 0.05, 24)
    // terminal braces / flag glyphs
    ctx.fillStyle = INK_FADED
    ctx.font = TYPE_FONT(30)
    ctx.textAlign = 'left'
    ctx.fillText('flag{ ... }', W - 300, H - 250)
    // blinking-cursor block
    ctx.fillStyle = 'rgba(40,90,60,0.7)'
    ctx.fillRect(W - 150, H - 272, 16, 26)
    doodles.arrow(ctx, rnd, W - 320, 300, 90, 0.5)
    annotation(ctx, rnd, 'solved.', W - 190, 300, -0.1, 30, 'rgba(40,90,60,0.8)')
    return []
  },
  letter(ctx, rnd) {
    ink(ctx, 0.55)
    doodles.envelope(ctx, rnd, W - 190, 300, 200, 130)
    // postage stamp
    wobblyRect(ctx, W - 130, 250, 54, 64, rnd, 1.5)
    doodles.mountainBadge(ctx, rnd, W - 103, 282, 44, 34)
    // postmark
    wobblyCircle(ctx, W - 170, 262, 26, rnd, 2)
    wobblyCircle(ctx, W - 170, 262, 20, rnd, 1.5)
    annotation(ctx, rnd, 'par avion ✈', W - 190, 400, -0.1, 28, INK_BLUE)
    return []
  },
  welcome(ctx, rnd) {
    ink(ctx, 0.55)
    rubberStamp(ctx, rnd, 'ADVENTURE AWAITS', W / 2, 250, -0.08)
    doodles.arrow(ctx, rnd, W * 0.6, H - 330, 150, -0.25)
    annotation(ctx, rnd, 'the pages turn over here', W * 0.62, H - 350, -0.12, 30)
    doodles.mountainBadge(ctx, rnd, MARGIN + 60, H - 300, 130, 90)
    return []
  },
  end(ctx, rnd) {
    ink(ctx, 0.55)
    doodles.skull(ctx, rnd, W / 2, H - 400, 34)
    annotation(ctx, rnd, 'told you it was judging you', W / 2, H - 320, 0.05, 28)
    doodles.star(ctx, rnd, W / 2 - 160, H - 420, 12)
    doodles.star(ctx, rnd, W / 2 + 150, H - 440, 10)
    rubberStamp(ctx, rnd, 'FIN', W - 190, 260, 0.2)
    return []
  },
}

// ---- title page (custom art, from the user's mockup) ------------------------
function drawTitlePage(ctx, rnd) {
  // grunge double-struck name
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(45,32,15,0.28)'
  ctx.font = TITLE_FONT(92)
  ctx.fillText(bookMeta.owner, W / 2 + 4, 388)
  ctx.fillStyle = 'rgba(45,32,15,0.92)'
  ctx.fillText(bookMeta.owner, W / 2, 384)
  // rough underline
  ink(ctx, 0.85, 5)
  wobblyLine(ctx, W * 0.2, 424, W * 0.8, 428, rnd, 3, 9)

  // marker-highlighted PORTFOLIO
  ctx.save()
  ctx.translate(W / 2, 500)
  ctx.rotate(-0.015)
  ctx.fillStyle = MARKER_YELLOW
  ctx.fillRect(-238, -40, 476, 72)
  ctx.fillStyle = 'rgba(140,35,25,0.85)'
  ctx.font = TITLE_FONT(58)
  ctx.fillText(bookMeta.title, 0, 16)
  ctx.restore()

  ctx.fillStyle = INK
  ctx.font = TYPE_FONT(34)
  ctx.fillText('TURN THE PAGES,', W / 2, 620)
  ctx.fillText('EXPLORE THE STORY.', W / 2, 668)

  // the robot mascot
  ink(ctx, 0.7)
  doodles.robot(ctx, rnd, W / 2, H * 0.68, 64)
  annotation(ctx, rnd, 'hi.', W / 2 + 120, H * 0.62, 0.1, 34)

  // taped note — mockup wording
  const nx = MARGIN + 130
  const ny = H - 330
  ctx.save()
  ctx.translate(nx, ny)
  ctx.rotate(-0.06)
  ctx.fillStyle = 'rgba(248,240,214,0.9)'
  ctx.fillRect(-130, -60, 260, 120)
  ctx.fillStyle = 'rgba(230,215,170,0.6)'
  ctx.fillRect(-40, -74, 80, 24)
  ctx.fillStyle = INK
  ctx.font = HAND_FONT(36)
  ctx.textAlign = 'center'
  ctx.fillText("Let's build", 0, -8)
  ctx.fillText('cool things together', 0, 34)
  ctx.restore()

  // START → pointing to the fore-edge
  annotation(ctx, rnd, 'START', W - 190, H - 430, -0.1, 44, 'rgba(140,35,25,0.9)')
  ink(ctx, 0.8, 4)
  doodles.arrow(ctx, rnd, W - 250, H - 400, 130, 0.5)

  inkSplat(ctx, rnd, W - 150, 210, INK_BLUE, 1.2)
  inkSplat(ctx, rnd, MARGIN - 20, H - 180, 'rgba(45,30,10,0.4)', 0.8)
}

// ---- shared page furniture ----------------------------------------------------
function uvRect(x0, y0, x1, y1, type, extra = {}) {
  return { u0: x0 / W, v0: 1 - y1 / H, u1: x1 / W, v1: 1 - y0 / H, type, ...extra }
}

function drawLogoStamp(ctx, rnd) {
  const cx = W / 2
  const cy = H - 84
  const r = 34
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = GOLD
  ctx.fillStyle = GOLD
  ctx.lineWidth = 2.5
  wobblyCircle(ctx, cx, cy, r, rnd, 1.2)
  // mini compass points
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55)
    ctx.lineTo(cx + Math.cos(a + 2.2) * r * 0.14, cy + Math.sin(a + 2.2) * r * 0.14)
    ctx.lineTo(cx + Math.cos(a - 2.2) * r * 0.14, cy + Math.sin(a - 2.2) * r * 0.14)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  const pad = 26
  return uvRect(cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad, 'logo')
}

function drawPageNumber(ctx, rnd, face, side) {
  const x = side === 'right' ? W - 92 : 92
  const y = H - 84
  ctx.fillStyle = INK_SOFT
  ctx.font = TYPE_FONT(28)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(face.pageNumber).padStart(2, '0'), x, y)
  ink(ctx, 0.4, 2)
  wobblyCircle(ctx, x, y, 26, rnd, 2)
  ctx.textBaseline = 'alphabetic'
}

function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function drawHeading(ctx, rnd, face, y) {
  if (face.sectionTitle && !face.isSectionStart) {
    ctx.fillStyle = INK_SOFT
    ctx.font = TYPE_FONT(24)
    ctx.textAlign = 'center'
    ctx.fillText(`— ${face.sectionTitle.toUpperCase()} —`, W / 2, y - 6)
    y += 34
  }
  if (face.heading) {
    const size = face.heading.length > 18 ? 52 : 64
    ctx.font = TITLE_FONT(size)
    ctx.textAlign = 'center'
    const lines = wrapText(ctx, face.heading, W - MARGIN * 2)
    for (const line of lines) {
      // marker highlight swipe behind the heading
      const tw = ctx.measureText(line).width
      ctx.save()
      ctx.translate(W / 2, y + size * 0.42)
      ctx.rotate((rnd() - 0.5) * 0.02)
      ctx.fillStyle = MARKER_YELLOW
      ctx.fillRect(-tw / 2 - 16, -size * 0.42, tw + 32, size * 0.72)
      ctx.restore()
      ctx.fillStyle = 'rgba(45,32,15,0.92)'
      ctx.fillText(line, W / 2, y + size * 0.72)
      y += size * 1.1
    }
    y += 14
    ink(ctx, 0.7, 4)
    wobblyLine(ctx, W / 2 - 130, y, W / 2 + 130, y + 2, rnd, 2.5, 7)
    y += 52
  }
  return y
}

function drawBlocks(ctx, rnd, blocks, y) {
  const maxW = W - MARGIN * 2
  for (const block of blocks) {
    if (y > H - 220) break // never overflow into the page foot
    const faded = isPlaceholder(block.text) || (block.items && block.items.some(isPlaceholder))
    switch (block.type) {
      case 'lead': {
        ctx.fillStyle = faded ? INK_FADED : INK
        ctx.font = HAND_FONT(44)
        ctx.textAlign = 'center'
        for (const line of wrapText(ctx, block.text, maxW)) {
          ctx.fillText(line, W / 2, y)
          y += 54
        }
        y += 22
        break
      }
      case 'paragraph': {
        ctx.fillStyle = isPlaceholder(block.text) ? INK_FADED : INK
        ctx.font = TYPE_FONT(28)
        ctx.textAlign = 'left'
        for (const line of wrapText(ctx, block.text, maxW)) {
          ctx.fillText(line, MARGIN, y)
          y += 44
        }
        y += 24
        break
      }
      case 'subheading': {
        ctx.fillStyle = INK
        ctx.font = TYPE_FONT(30)
        ctx.textAlign = 'left'
        ctx.fillText(String(block.text).toUpperCase(), MARGIN, y)
        ink(ctx, 0.45, 2)
        wobblyLine(ctx, MARGIN, y + 12, W - MARGIN, y + 14, rnd, 2, 6)
        y += 52
        break
      }
      case 'list': {
        ctx.textAlign = 'left'
        for (const item of block.items) {
          ink(ctx, 0.7, 3)
          doodles.arrow(ctx, rnd, MARGIN - 4, y - 8, 34, 0)
          ctx.fillStyle = isPlaceholder(item) ? INK_FADED : INK
          ctx.font = TYPE_FONT(27)
          const lines = wrapText(ctx, item, maxW - 60)
          for (const line of lines) {
            ctx.fillText(line, MARGIN + 52, y)
            y += 42
          }
          y += 10
        }
        y += 18
        break
      }
      case 'rows': {
        for (const [k, v] of block.rows) {
          ctx.textAlign = 'left'
          ctx.fillStyle = INK_SOFT
          ctx.font = HAND_FONT(32)
          ctx.fillText(String(k), MARGIN, y)
          ctx.fillStyle = isPlaceholder(v) ? INK_FADED : INK
          ctx.font = TYPE_FONT(27)
          const lines = wrapText(ctx, v, maxW - 40)
          let yy = y + 40
          for (const line of lines) {
            ctx.fillText(line, MARGIN + 44, yy)
            yy += 42
          }
          ink(ctx, 0.3, 2)
          wobblyLine(ctx, MARGIN, yy + 4, W - MARGIN, yy + 6, rnd, 2, 6)
          y = yy + 34
        }
        y += 8
        break
      }
      case 'quote': {
        ctx.fillStyle = isPlaceholder(block.text) ? INK_FADED : INK
        ctx.font = HAND_FONT(52, 700)
        ctx.textAlign = 'center'
        y += 16
        for (const line of wrapText(ctx, block.text, maxW - 100)) {
          ctx.fillText(line, W / 2, y)
          y += 62
        }
        y += 26
        break
      }
      case 'note': {
        // a small taped-on note, slightly crooked
        ctx.font = HAND_FONT(30)
        const lines = wrapText(ctx, block.text, 380)
        const nh = 44 + lines.length * 36
        const nx = W / 2 + (rnd() - 0.5) * 140
        ctx.save()
        ctx.translate(nx, y + nh / 2)
        ctx.rotate((rnd() - 0.5) * 0.09)
        ctx.fillStyle = 'rgba(248,240,214,0.92)'
        ctx.fillRect(-220, -nh / 2, 440, nh)
        ctx.fillStyle = 'rgba(230,215,170,0.6)'
        ctx.fillRect(-38, -nh / 2 - 12, 76, 22)
        ctx.fillStyle = isPlaceholder(block.text) ? INK_FADED : INK
        ctx.textAlign = 'center'
        lines.forEach((l, i) => ctx.fillText(l, 0, -nh / 2 + 40 + i * 36))
        ctx.restore()
        y += nh + 34
        break
      }
      default:
        break
    }
  }
  return y
}

/**
 * Paper relief → normal map. A half-resolution height field is built from
 * the SAME relief features the color pass painted (creases, tide lines,
 * folds, stains, tears, deckled borders) plus fine paper tooth, then run
 * through a sobel filter. Under the scene's raking key light the ridges,
 * cockling and grain genuinely catch light — paper you can feel.
 */
const HW = 512
const HH = Math.round((H / W) * 512)
const HS = HW / W

function buildHeightCanvas(face, side, relief, rnd) {
  const c = document.createElement('canvas')
  c.width = HW
  c.height = HH
  const hctx = c.getContext('2d')
  hctx.fillStyle = '#808080'
  hctx.fillRect(0, 0, HW, HH)

  // paper tooth — fine grain
  const img = hctx.getImageData(0, 0, HW, HH)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = (rnd() - 0.5) * 26
    d[i] += g
    d[i + 1] += g
    d[i + 2] += g
  }
  hctx.putImageData(img, 0, 0)

  const poly = (pts, style, width, offX = 0, offY = 0) => {
    hctx.strokeStyle = style
    hctx.lineWidth = width
    hctx.lineCap = 'round'
    hctx.lineJoin = 'round'
    hctx.beginPath()
    pts.forEach(([x, y], i) => {
      const px = x * HS + offX
      const py = y * HS + offY
      i === 0 ? hctx.moveTo(px, py) : hctx.lineTo(px, py)
    })
    hctx.stroke()
  }

  // cockling: stains swell and dish the paper
  for (const st of relief.stains) {
    const g = hctx.createRadialGradient(st.x * HS, st.y * HS, 2, st.x * HS, st.y * HS, st.r * HS)
    g.addColorStop(0, 'rgba(0,0,0,0.16)')
    g.addColorStop(0.7, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    hctx.fillStyle = g
    hctx.fillRect(0, 0, HW, HH)
  }
  for (const pts of relief.tides) poly(pts, 'rgba(255,255,255,0.35)', 2)

  // creases: bright ridge + dark valley alongside
  for (const cr of relief.creases) {
    poly(cr.pts, `rgba(0,0,0,${(0.4 * cr.strength).toFixed(3)})`, 6, 2.2, 2.2)
    poly(cr.pts, `rgba(255,255,255,${(0.75 * cr.strength).toFixed(3)})`, 2)
  }
  for (const pts of relief.cracks) poly(pts, 'rgba(255,255,255,0.6)', 1.2)

  // dog-eared folds: raised flap
  for (const f of relief.folds) {
    hctx.fillStyle = 'rgba(255,255,255,0.55)'
    hctx.beginPath()
    hctx.moveTo((f.fx + f.sx * f.s) * HS, f.cy * HS)
    hctx.lineTo(f.fx * HS, (f.cy + f.sy * f.s) * HS)
    hctx.lineTo((f.fx + f.sx * f.s * 0.94) * HS, (f.cy + f.sy * f.s * 0.9) * HS)
    hctx.closePath()
    hctx.fill()
    hctx.strokeStyle = 'rgba(0,0,0,0.5)'
    hctx.lineWidth = 2
    hctx.beginPath()
    hctx.moveTo((f.fx + f.sx * f.s) * HS, f.cy * HS)
    hctx.lineTo(f.fx * HS, (f.cy + f.sy * f.s) * HS)
    hctx.stroke()
  }

  // torn lips lift — pageToCanvas gives full-res coords; scale into the height canvas
  const profile = sheetProfile(Math.floor(face.faceIndex / 2))
  for (const tear of profile.tears) {
    const pts = sampleTearBoundary(tear, 80).map(([x, y]) => pageToCanvas(x, y, side))
    hctx.strokeStyle = 'rgba(255,255,255,0.7)'
    hctx.lineWidth = 3
    hctx.beginPath()
    pts.forEach(([X, Y], i) => (i === 0 ? hctx.moveTo(X * HS, Y * HS) : hctx.lineTo(X * HS, Y * HS)))
    hctx.stroke()
    hctx.strokeStyle = 'rgba(0,0,0,0.35)'
    hctx.lineWidth = 5
    hctx.beginPath()
    pts.forEach(([X, Y], i) => (i === 0 ? hctx.moveTo(X * HS + 3, Y * HS + 3) : hctx.lineTo(X * HS + 3, Y * HS + 3)))
    hctx.stroke()
  }

  // thin worn borders
  const border = (x0, y0, x1, y1) => {
    const g = hctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, 'rgba(0,0,0,0.45)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    hctx.fillStyle = g
    hctx.fillRect(0, 0, HW, HH)
  }
  border(0, 0, HW * 0.03, 0)
  border(HW, 0, HW * 0.97, 0)
  border(0, 0, 0, HH * 0.025)
  border(0, HH, 0, HH * 0.975)

  return c
}

// ---- entry points ---------------------------------------------------------------
export function renderPageFace(face, side) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const rnd = mulberry32(seedFrom(face.id))
  const regions = []
  const relief = { creases: [], cracks: [], stains: [], tides: [], folds: [] }

  paintParchment(ctx, side, rnd, relief)

  // occasional stains — same physical world on every page
  if (rnd() > 0.55) coffeeRing(ctx, rnd, MARGIN + rnd() * (W - 2 * MARGIN), 200 + rnd() * (H - 500), 46 + rnd() * 40)
  if (rnd() > 0.5) inkSplat(ctx, rnd, rnd() * W, rnd() * H, 'rgba(45,30,10,0.35)', 0.6 + rnd() * 0.7)
  if (rnd() > 0.6) fingerprint(ctx, rnd, W * (0.15 + rnd() * 0.7), H * (0.12 + rnd() * 0.76), 1 + rnd() * 0.5)
  if (rnd() > 0.82) fingerprint(ctx, rnd, W * rnd(), H * rnd(), 0.8, 0.05)
  if (rnd() > 0.78) burnMark(ctx, rnd, rnd() > 0.5 ? W * 0.06 + rnd() * 40 : W * 0.94 - rnd() * 40, H * (0.2 + rnd() * 0.6), 18 + rnd() * 26)

  const hasTear = sheetProfile(Math.floor(face.faceIndex / 2)).tears.length > 0
  if (!hasTear && rnd() > 0.58) foldedCorner(ctx, rnd, rnd() > 0.5 ? 'tr' : 'br', side, relief)

  if (face.kind !== 'blank') {
    if (face.theme === 'title') {
      drawTitlePage(ctx, rnd)
    } else if (face.isIndex) {
      drawHeading(ctx, rnd, face, 170)
      regions.push(...drawIndexBody(ctx, rnd))
    } else {
      const y = drawHeading(ctx, rnd, face, 176)
      drawBlocks(ctx, rnd, face.blocks, Math.max(y, 320))
    }
    // per-section personality on top
    const decor = themeDecor[face.theme]
    if (decor) regions.push(...(decor(ctx, rnd, face) || []))

    regions.push(drawLogoStamp(ctx, rnd))
    if (face.theme !== 'title') drawPageNumber(ctx, rnd, face, side)
  } else {
    regions.push(drawLogoStamp(ctx, rnd))
  }

  // ink the real tears last so the fringe overlays whatever sits near them
  paintTears(ctx, face, side, rnd)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  // relief → normal map so the paper surface catches the light
  const heightCanvas = buildHeightCanvas(face, side, relief, rnd)
  const normalTexture = new THREE.CanvasTexture(sobelNormalFromCanvas(heightCanvas, 3.0))
  normalTexture.anisotropy = 4

  return { texture, normalTexture, regions }
}

/** Plain endpaper (inside of a cover) — same aged stock, no content. */
export function renderEndpaper(side) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const rnd = mulberry32(seedFrom('endpaper-' + side))
  paintParchment(ctx, side, rnd)
  // old bookplate ghost
  ink(ctx, 0.25, 2)
  wobblyRect(ctx, W / 2 - 180, H / 2 - 120, 360, 240, rnd, 3)
  ctx.font = FELL_FONT(30, true)
  ctx.fillStyle = 'rgba(51,38,21,0.3)'
  ctx.textAlign = 'center'
  ctx.fillText('ex libris', W / 2, H / 2 - 60)
  ctx.font = TITLE_FONT(36)
  ctx.fillText(bookMeta.owner, W / 2, H / 2 + 10)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { texture, regions: [] }
}
