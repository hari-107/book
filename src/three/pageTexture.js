import * as THREE from 'three'
import {
  INK, INK_SOFT, INK_FADED, GOLD, MARKER_YELLOW, INK_BLUE, INK_RED,
  PAGE_TEX_W, PAGE_TEX_H, PAGE_W, PAGE_H,
} from '../constants.js'
import { PLACEHOLDER_PREFIX, bookMeta } from '../data/bookContent.js'
import { drawIndexBody } from '../components/IndexPage.js'
import { sheetProfile, sampleTearBoundary } from './tearProfiles.js'

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
function paintParchment(ctx, side, rnd) {
  // base — pale field-journal tan (reference tone), unevenly lit
  const grad = ctx.createRadialGradient(W * (0.4 + rnd() * 0.2), H * (0.35 + rnd() * 0.2), H * 0.18, W / 2, H / 2, H * 0.78)
  grad.addColorStop(0, '#e9dfc2')
  grad.addColorStop(0.6, '#dccda4')
  grad.addColorStop(1, '#b3985f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // uneven blotches of age
  for (let i = 0; i < 12; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 40 + rnd() * 160
    const g = ctx.createRadialGradient(x, y, 2, x, y, r)
    const dark = rnd() > 0.5
    g.addColorStop(0, dark ? `rgba(120,85,35,${0.04 + rnd() * 0.08})` : `rgba(245,230,190,${0.05 + rnd() * 0.07})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
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

  // wrinkles — long soft curves
  for (let i = 0; i < 4; i++) {
    const x0 = rnd() * W
    const y0 = rnd() * H
    ctx.strokeStyle = 'rgba(90,65,30,0.09)'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(x0 + (rnd() - 0.5) * 500, y0 + (rnd() - 0.5) * 500, x0 + (rnd() - 0.5) * 800, y0 + (rnd() - 0.5) * 700)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(250,240,210,0.08)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x0 + 2, y0 + 2)
    ctx.quadraticCurveTo(x0 + (rnd() - 0.5) * 500, y0 + (rnd() - 0.5) * 500, x0 + (rnd() - 0.5) * 800, y0 + (rnd() - 0.5) * 700)
    ctx.stroke()
  }

  // hard fold creases — a light ridge with a shadow valley beside it
  const creaseCount = 1 + Math.floor(rnd() * 2)
  for (let i = 0; i < creaseCount; i++) {
    const vertical = rnd() > 0.5
    const p = 0.25 + rnd() * 0.5
    ctx.lineWidth = 2
    if (vertical) {
      const x = p * W
      ctx.strokeStyle = 'rgba(255,248,225,0.16)'
      ctx.beginPath()
      ctx.moveTo(x, H * 0.08)
      ctx.lineTo(x + (rnd() - 0.5) * 30, H * 0.92)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(70,48,20,0.16)'
      ctx.beginPath()
      ctx.moveTo(x + 3, H * 0.08)
      ctx.lineTo(x + 3 + (rnd() - 0.5) * 30, H * 0.92)
      ctx.stroke()
    } else {
      const y = p * H
      ctx.strokeStyle = 'rgba(255,248,225,0.16)'
      ctx.beginPath()
      ctx.moveTo(W * 0.08, y)
      ctx.lineTo(W * 0.92, y + (rnd() - 0.5) * 30)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(70,48,20,0.16)'
      ctx.beginPath()
      ctx.moveTo(W * 0.08, y + 3)
      ctx.lineTo(W * 0.92, y + 3 + (rnd() - 0.5) * 30)
      ctx.stroke()
    }
  }

  // burnt, darkened borders
  const edge = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, `rgba(70,45,15,${0.32 + rnd() * 0.14})`)
    g.addColorStop(1, 'rgba(70,45,15,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  edge(0, 0, W * 0.09, 0)
  edge(W, 0, W * 0.91, 0)
  edge(0, 0, 0, H * 0.07)
  edge(0, H, 0, H * 0.93)

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

  // gutter shadow on the spine side
  const gw = W * 0.09
  const g = side === 'right' ? ctx.createLinearGradient(0, 0, gw, 0) : ctx.createLinearGradient(W, 0, W - gw, 0)
  g.addColorStop(0, 'rgba(55,35,12,0.42)')
  g.addColorStop(1, 'rgba(55,35,12,0)')
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

function foldedCorner(ctx, rnd, corner, side) {
  // a dog-eared fore-edge corner, drawn as light + shadow.
  // The fore-edge sits at canvas-right on right pages, canvas-left on left pages.
  const s = 70 + rnd() * 60
  const top = corner === 'tr'
  const cy = top ? 0 : H
  const sy = top ? 1 : -1
  const fx = side === 'right' ? W : 0
  const sx = side === 'right' ? -1 : 1 // direction from fore-edge into the page
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

// ---- entry points ---------------------------------------------------------------
export function renderPageFace(face, side) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const rnd = mulberry32(seedFrom(face.id))
  const regions = []

  paintParchment(ctx, side, rnd)

  // occasional stains — same physical world on every page
  if (rnd() > 0.55) coffeeRing(ctx, rnd, MARGIN + rnd() * (W - 2 * MARGIN), 200 + rnd() * (H - 500), 46 + rnd() * 40)
  if (rnd() > 0.5) inkSplat(ctx, rnd, rnd() * W, rnd() * H, 'rgba(45,30,10,0.35)', 0.6 + rnd() * 0.7)
  if (rnd() > 0.6) fingerprint(ctx, rnd, W * (0.15 + rnd() * 0.7), H * (0.12 + rnd() * 0.76), 1 + rnd() * 0.5)
  if (rnd() > 0.82) fingerprint(ctx, rnd, W * rnd(), H * rnd(), 0.8, 0.05)
  if (rnd() > 0.78) burnMark(ctx, rnd, rnd() > 0.5 ? W * 0.06 + rnd() * 40 : W * 0.94 - rnd() * 40, H * (0.2 + rnd() * 0.6), 18 + rnd() * 26)

  const hasTear = sheetProfile(Math.floor(face.faceIndex / 2)).tears.length > 0
  if (!hasTear && rnd() > 0.72) foldedCorner(ctx, rnd, rnd() > 0.5 ? 'tr' : 'br', side)

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
  return { texture, regions }
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
