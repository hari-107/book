import { INK, INK_SOFT, PAGE_TEX_W, PAGE_TEX_H } from '../constants.js'
import { INDEX_ENTRIES } from '../data/compileBook.js'

/**
 * IndexPage — layout of the printed Index page and its interactive regions.
 *
 * Exactly six entries (one per content section), each targeting the section's
 * first page. Covers, Welcome and the Index itself never appear here, and
 * deeper pages within a section are deliberately not listed — the Index
 * addresses sections; the logo navigation reaches every page.
 *
 * Returns UV-space hit regions consumed by the double-click resolver.
 */

const W = PAGE_TEX_W
const H = PAGE_TEX_H
const MARGIN = 116

function uvRect(x0, y0, x1, y1, type, extra = {}) {
  return { u0: x0 / W, v0: 1 - y1 / H, u1: x1 / W, v1: 1 - y0 / H, type, ...extra }
}

export function drawIndexBody(ctx, bodyFont) {
  const regions = []
  let y = 460

  ctx.font = bodyFont(30, true)
  ctx.fillStyle = INK_SOFT
  ctx.textAlign = 'center'
  ctx.fillText('Double-click an entry to visit it', W / 2, y - 66)

  for (const entry of INDEX_ENTRIES) {
    const rowTop = y - 44
    ctx.fillStyle = INK
    ctx.font = bodyFont(38)
    ctx.textAlign = 'left'
    ctx.fillText(entry.title, MARGIN, y)
    const titleW = ctx.measureText(entry.title).width

    ctx.textAlign = 'right'
    const numStr = String(entry.pageNumber)
    ctx.fillText(numStr, W - MARGIN, y)
    const numW = ctx.measureText(numStr).width

    // dotted leader between title and page number
    ctx.fillStyle = INK_SOFT
    const startX = MARGIN + titleW + 24
    const endX = W - MARGIN - numW - 24
    for (let x = startX; x < endX; x += 16) {
      ctx.beginPath()
      ctx.arc(x, y - 6, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    regions.push(uvRect(MARGIN - 20, rowTop, W - MARGIN + 20, y + 22, 'index', { faceIndex: entry.faceIndex }))
    y += 96
  }
  return regions
}
