import { INK, INK_SOFT, INK_RED, PAGE_TEX_W, PAGE_TEX_H } from '../constants.js'
import { INDEX_ENTRIES } from '../data/compileBook.js'

/**
 * IndexPage — layout of the printed INDEX and its interactive regions,
 * matching the adventure-journal mockup: numbered entries with little icon
 * doodles, dotted leaders, page numbers, and a decorative red ✗.
 *
 * One entry per content section plus The End, each targeting the section's
 * first page. Deeper pages within a section are deliberately not listed —
 * the Index addresses sections; the ✦ seal navigation reaches every page.
 *
 * Returns UV-space hit regions consumed by the double-click resolver.
 */

const W = PAGE_TEX_W
const H = PAGE_TEX_H
const MARGIN = 118

const TYPE_FONT = (px) => `${px}px "Special Elite", "Courier New", monospace`
const HAND_FONT = (px) => `600 ${px}px "Caveat", cursive`

function uvRect(x0, y0, x1, y1, type, extra = {}) {
  return { u0: x0 / W, v0: 1 - y1 / H, u1: x1 / W, v1: 1 - y0 / H, type, ...extra }
}

// tiny icon doodles per section, keyed by sectionId
const icons = {
  about(ctx, x, y) {
    ctx.beginPath()
    ctx.arc(x, y - 8, 7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 10, y + 12)
    ctx.quadraticCurveTo(x, y - 2, x + 10, y + 12)
    ctx.stroke()
  },
  skills(ctx, x, y) {
    // wrench-ish
    ctx.beginPath()
    ctx.arc(x - 5, y - 5, 6, 0.8, 5.2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 1, y - 1)
    ctx.lineTo(x + 10, y + 10)
    ctx.stroke()
  },
  experience(ctx, x, y) {
    // briefcase
    ctx.strokeRect(x - 10, y - 6, 20, 14)
    ctx.beginPath()
    ctx.moveTo(x - 4, y - 6)
    ctx.lineTo(x - 4, y - 11)
    ctx.lineTo(x + 4, y - 11)
    ctx.lineTo(x + 4, y - 6)
    ctx.stroke()
  },
  projects(ctx, x, y) {
    // flask
    ctx.beginPath()
    ctx.moveTo(x - 4, y - 12)
    ctx.lineTo(x - 4, y - 3)
    ctx.lineTo(x - 11, y + 10)
    ctx.lineTo(x + 11, y + 10)
    ctx.lineTo(x + 4, y - 3)
    ctx.lineTo(x + 4, y - 12)
    ctx.stroke()
  },
  certifications(ctx, x, y) {
    // medal
    ctx.beginPath()
    ctx.arc(x, y + 3, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 5, y - 4)
    ctx.lineTo(x - 8, y - 13)
    ctx.moveTo(x + 5, y - 4)
    ctx.lineTo(x + 8, y - 13)
    ctx.stroke()
  },
  achievements(ctx, x, y) {
    // trophy
    ctx.beginPath()
    ctx.moveTo(x - 8, y - 10)
    ctx.lineTo(x + 8, y - 10)
    ctx.quadraticCurveTo(x + 7, y + 4, x, y + 6)
    ctx.quadraticCurveTo(x - 7, y + 4, x - 8, y - 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 4, y + 11)
    ctx.lineTo(x + 4, y + 11)
    ctx.stroke()
  },
  education(ctx, x, y) {
    // grad cap
    ctx.beginPath()
    ctx.moveTo(x - 12, y - 2)
    ctx.lineTo(x, y - 9)
    ctx.lineTo(x + 12, y - 2)
    ctx.lineTo(x, y + 5)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 8, y)
    ctx.lineTo(x + 9, y + 10)
    ctx.stroke()
  },
  funzone(ctx, x, y) {
    // smiley
    ctx.beginPath()
    ctx.arc(x, y, 9, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillRect(x - 4, y - 4, 2, 3)
    ctx.fillRect(x + 2, y - 4, 2, 3)
    ctx.beginPath()
    ctx.arc(x, y + 1, 5, 0.3, Math.PI - 0.3)
    ctx.stroke()
  },
  contact(ctx, x, y) {
    // envelope
    ctx.strokeRect(x - 11, y - 7, 22, 15)
    ctx.beginPath()
    ctx.moveTo(x - 11, y - 7)
    ctx.lineTo(x, y + 2)
    ctx.lineTo(x + 11, y - 7)
    ctx.stroke()
  },
  'the-end'(ctx, x, y) {
    // flag
    ctx.beginPath()
    ctx.moveTo(x - 6, y + 12)
    ctx.lineTo(x - 6, y - 12)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 6, y - 12)
    ctx.lineTo(x + 10, y - 8)
    ctx.lineTo(x - 6, y - 3)
    ctx.closePath()
    ctx.stroke()
  },
}

export function drawIndexBody(ctx, rnd) {
  const regions = []

  ctx.font = HAND_FONT(30)
  ctx.fillStyle = INK_SOFT
  ctx.textAlign = 'center'
  ctx.fillText('double-click an entry — the pages will turn', W / 2, 330)

  // decorative red ✗ in the top corner (mockup)
  ctx.strokeStyle = INK_RED
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(W - 96, 108)
  ctx.lineTo(W - 60, 146)
  ctx.moveTo(W - 60, 108)
  ctx.lineTo(W - 96, 146)
  ctx.stroke()

  let y = 412
  const rowH = 84
  INDEX_ENTRIES.forEach((entry, i) => {
    const rowTop = y - 42

    // icon doodle
    ctx.strokeStyle = 'rgba(51,38,21,0.75)'
    ctx.fillStyle = 'rgba(51,38,21,0.75)'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    const iconFn = icons[entry.sectionId]
    if (iconFn) iconFn(ctx, MARGIN + 14, y - 12)

    // numbered title
    ctx.fillStyle = INK_SOFT
    ctx.font = TYPE_FONT(22)
    ctx.textAlign = 'left'
    ctx.fillText(String(i + 1).padStart(2, '0'), MARGIN + 44, y - 20)
    ctx.fillStyle = INK
    ctx.font = TYPE_FONT(34)
    ctx.fillText(entry.title.toUpperCase(), MARGIN + 84, y)
    const titleW = ctx.measureText(entry.title.toUpperCase()).width

    // page number
    ctx.textAlign = 'right'
    const numStr = String(entry.pageNumber).padStart(2, '0')
    ctx.fillText(numStr, W - MARGIN, y)
    const numW = ctx.measureText(numStr).width

    // dotted leader
    ctx.fillStyle = INK_SOFT
    const startX = MARGIN + 84 + titleW + 22
    const endX = W - MARGIN - numW - 22
    for (let x = startX; x < endX; x += 15) {
      ctx.beginPath()
      ctx.arc(x + (rnd() - 0.5) * 2, y - 7 + (rnd() - 0.5) * 2, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }

    regions.push(uvRect(MARGIN - 26, rowTop, W - MARGIN + 26, y + 22, 'index', { faceIndex: entry.faceIndex }))
    y += rowH
  })

  return regions
}
