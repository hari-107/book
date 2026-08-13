import * as THREE from 'three'
import { INK, INK_SOFT, GOLD, PAGE_TEX_W, PAGE_TEX_H } from '../constants.js'
import { PLACEHOLDER_PREFIX, bookMeta } from '../data/bookContent.js'
import { drawIndexBody } from '../components/IndexPage.js'

/**
 * Renders one page face of the book to a CanvasTexture so content prints
 * onto the paper and bends with the page-curl shader.
 *
 * Returns { texture, regions } where regions are UV-space rectangles
 * ({ u0, v0, u1, v1, type, faceIndex }) used for double-click hit testing:
 *   - type 'logo'  → the emblem stamped at the page foot (opens navigation)
 *   - type 'index' → an Index entry (jumps to its section)
 */

const W = PAGE_TEX_W
const H = PAGE_TEX_H
const MARGIN = 116

const HEADING_FONT = (px) => `600 ${px}px "Playfair Display", serif`
const BODY_FONT = (px, italic = false) => `${italic ? 'italic ' : ''}400 ${px}px "EB Garamond", serif`

function isPlaceholder(text) {
  return typeof text === 'string' && text.includes(PLACEHOLDER_PREFIX)
}

function paintPaper(ctx, side) {
  // warm ivory stock with a soft vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75)
  grad.addColorStop(0, '#f3ecdb')
  grad.addColorStop(1, '#e7dcc0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // paper grain
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    ctx.fillStyle = `rgba(120,100,64,${(Math.random() * 0.05).toFixed(3)})`
    ctx.fillRect(x, y, 1.4, 1.4)
  }

  // gutter shadow on the spine side ('right' page → spine on its left)
  const gw = W * 0.085
  const g =
    side === 'right'
      ? ctx.createLinearGradient(0, 0, gw, 0)
      : ctx.createLinearGradient(W, 0, W - gw, 0)
  g.addColorStop(0, 'rgba(70,56,32,0.34)')
  g.addColorStop(1, 'rgba(70,56,32,0)')
  ctx.fillStyle = g
  ctx.fillRect(side === 'right' ? 0 : W - gw, 0, gw, H)
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

function drawLogoStamp(ctx) {
  const cx = W / 2
  const cy = H - 92
  const r = 34
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = HEADING_FONT(40)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(bookMeta.monogram, cx, cy + 2)
  ctx.restore()
  // generous hit pad around the stamp
  const pad = 26
  return uvRect(cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad, 'logo')
}

function uvRect(x0, y0, x1, y1, type, extra = {}) {
  return { u0: x0 / W, v0: 1 - y1 / H, u1: x1 / W, v1: 1 - y0 / H, type, ...extra }
}

function drawPageNumber(ctx, face, side) {
  ctx.fillStyle = INK_SOFT
  ctx.font = BODY_FONT(30)
  ctx.textAlign = side === 'right' ? 'right' : 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(String(face.pageNumber), side === 'right' ? W - 78 : 78, H - 78)
}

function drawHeading(ctx, face, y) {
  if (face.sectionTitle && !face.isSectionStart) {
    ctx.fillStyle = INK_SOFT
    ctx.font = `500 26px "EB Garamond", serif`
    ctx.textAlign = 'center'
    ctx.letterSpacing = '8px'
    ctx.fillText(face.sectionTitle.toUpperCase(), W / 2, y - 8)
    ctx.letterSpacing = '0px'
    y += 34
  }
  if (face.heading) {
    ctx.fillStyle = INK
    const size = face.heading.length > 22 ? 56 : 66
    ctx.font = HEADING_FONT(size)
    ctx.textAlign = 'center'
    const lines = wrapText(ctx, face.heading, W - MARGIN * 2)
    for (const line of lines) {
      ctx.fillText(line, W / 2, y + size * 0.8)
      y += size * 1.12
    }
    y += 26
    // ornamental rule
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2 - 120, y)
    ctx.lineTo(W / 2 + 120, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(W / 2, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = GOLD
    ctx.fill()
    y += 54
  }
  return y
}

function drawBlocks(ctx, blocks, y) {
  const maxW = W - MARGIN * 2
  for (const block of blocks) {
    if (y > H - 220) break // never overflow into the page foot
    switch (block.type) {
      case 'lead': {
        ctx.fillStyle = isPlaceholder(block.text) ? INK_SOFT : INK
        ctx.font = BODY_FONT(40, isPlaceholder(block.text))
        ctx.textAlign = 'center'
        for (const line of wrapText(ctx, block.text, maxW)) {
          ctx.fillText(line, W / 2, y)
          y += 56
        }
        y += 26
        break
      }
      case 'paragraph': {
        ctx.fillStyle = isPlaceholder(block.text) ? INK_SOFT : INK
        ctx.font = BODY_FONT(34, isPlaceholder(block.text))
        ctx.textAlign = 'left'
        for (const line of wrapText(ctx, block.text, maxW)) {
          ctx.fillText(line, MARGIN, y)
          y += 50
        }
        y += 26
        break
      }
      case 'subheading': {
        ctx.fillStyle = INK
        ctx.font = `600 30px "EB Garamond", serif`
        ctx.textAlign = 'left'
        ctx.letterSpacing = '4px'
        ctx.fillText(String(block.text).toUpperCase(), MARGIN, y)
        ctx.letterSpacing = '0px'
        y += 18
        ctx.strokeStyle = 'rgba(90,74,44,0.35)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(MARGIN, y)
        ctx.lineTo(W - MARGIN, y)
        ctx.stroke()
        y += 44
        break
      }
      case 'list': {
        ctx.textAlign = 'left'
        for (const item of block.items) {
          ctx.fillStyle = GOLD
          ctx.font = BODY_FONT(34)
          ctx.fillText('❧', MARGIN, y)
          ctx.fillStyle = isPlaceholder(item) ? INK_SOFT : INK
          ctx.font = BODY_FONT(34, isPlaceholder(item))
          const lines = wrapText(ctx, item, maxW - 56)
          for (const line of lines) {
            ctx.fillText(line, MARGIN + 52, y)
            y += 48
          }
          y += 8
        }
        y += 22
        break
      }
      case 'rows': {
        for (const [k, v] of block.rows) {
          ctx.textAlign = 'left'
          ctx.fillStyle = INK_SOFT
          ctx.font = `600 28px "EB Garamond", serif`
          ctx.letterSpacing = '2px'
          ctx.fillText(String(k).toUpperCase(), MARGIN, y)
          ctx.letterSpacing = '0px'
          ctx.fillStyle = isPlaceholder(v) ? INK_SOFT : INK
          ctx.font = BODY_FONT(33, isPlaceholder(v))
          const lines = wrapText(ctx, v, maxW - 40)
          let yy = y + 42
          for (const line of lines) {
            ctx.fillText(line, MARGIN + 40, yy)
            yy += 46
          }
          y = yy + 24
        }
        y += 10
        break
      }
      case 'quote': {
        ctx.fillStyle = isPlaceholder(block.text) ? INK_SOFT : INK
        ctx.font = `italic 600 42px "Playfair Display", serif`
        ctx.textAlign = 'center'
        y += 16
        for (const line of wrapText(ctx, block.text, maxW - 120)) {
          ctx.fillText(line, W / 2, y)
          y += 60
        }
        y += 30
        break
      }
      default:
        break
    }
  }
  return y
}

export function renderPageFace(face, side) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const regions = []

  paintPaper(ctx, side)

  if (face.kind !== 'blank') {
    let y = drawHeading(ctx, face, face.isIndex ? 210 : 190)
    if (face.isIndex) {
      regions.push(...drawIndexBody(ctx, BODY_FONT))
    } else {
      drawBlocks(ctx, face.blocks, Math.max(y, 330))
    }
    regions.push(drawLogoStamp(ctx))
    drawPageNumber(ctx, face, side)
  } else {
    regions.push(drawLogoStamp(ctx))
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { texture, regions }
}

/** Plain endpaper (inside of a cover) — same stock, no content, no regions. */
export function renderEndpaper(side) {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  paintPaper(ctx, side)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { texture, regions: [] }
}
