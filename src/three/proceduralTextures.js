import * as THREE from 'three'
import { GOLD, IVORY, LEATHER } from '../constants.js'

/**
 * Procedural texture factory. Everything the book wears — leather grain,
 * paper stock, page-edge striations, normal maps for wear — is generated at
 * runtime on canvases, so the repository ships no binary assets and nothing
 * can 404.
 */

const registry = []
function track(tex) {
  registry.push(tex)
  return tex
}
export function disposeAllProceduralTextures() {
  registry.forEach((t) => t.dispose())
  registry.length = 0
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function noiseField(w, h, rand = Math.random) {
  const data = new Float32Array(w * h)
  for (let i = 0; i < data.length; i++) data[i] = rand()
  // one blur pass to soften
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = (x + dx + w) % w
          const yy = (y + dy + h) % h
          sum += data[yy * w + xx]
          n++
        }
      }
      out[y * w + x] = sum / n
    }
  }
  return out
}

/** Dark navy leather / book-cloth color map with mottling and vignette wear. */
export function leatherColorTexture(size = 512) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = LEATHER
  ctx.fillRect(0, 0, size, size)

  const field = noiseField(64, 64)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = field[((y >> 3) % 64) * 64 + ((x >> 3) % 64)]
      const g = (Math.random() - 0.5) * 14 + (n - 0.5) * 26
      const i = (y * size + x) * 4
      d[i] = Math.max(0, Math.min(255, d[i] + g))
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + g))
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + g * 1.15))
    }
  }
  ctx.putImageData(img, 0, 0)

  // subtle wear at edges
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.72)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(8,10,18,0.5)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return track(tex)
}

/** Normal map derived from a noise heightfield — gives leather its grain and subtle wear under light. */
export function grainNormalTexture(size = 256, strength = 1.4) {
  const w = size
  const h = size
  const field = noiseField(w, h)
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = field[y * w + ((x - 1 + w) % w)]
      const r = field[y * w + ((x + 1) % w)]
      const u = field[((y - 1 + h) % h) * w + x]
      const dn = field[((y + 1) % h) * w + x]
      let nx = (l - r) * strength
      let ny = (u - dn) * strength
      const nz = 1
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= len
      ny /= len
      const i = (y * w + x) * 4
      d[i] = (nx * 0.5 + 0.5) * 255
      d[i + 1] = (ny * 0.5 + 0.5) * 255
      d[i + 2] = (nz / len * 0.5 + 0.5) * 255
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return track(tex)
}

/** Warm ivory paper for endpapers and page-block tops. */
export function paperColorTexture(size = 256) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = IVORY
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = (Math.random() - 0.5) * 9
    d[i] += g
    d[i + 1] += g
    d[i + 2] += g * 0.8
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return track(tex)
}

/** Horizontal striations for the exposed page-block edges (fore-edge, head, tail). */
export function pageEdgeTexture(w = 64, h = 256) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#e9dfc6'
  ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 2) {
    const a = 0.05 + Math.random() * 0.16
    ctx.fillStyle = `rgba(120,100,66,${a.toFixed(3)})`
    ctx.fillRect(0, y, w, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return track(tex)
}

/** Gold embossed monogram emblem for the cover (transparent background). */
export function emblemTexture(monogram, size = 512) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const cx = size / 2
  ctx.clearRect(0, 0, size, size)

  ctx.strokeStyle = GOLD
  ctx.lineWidth = size * 0.018
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.42, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = size * 0.006
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.36, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = GOLD
  ctx.font = `600 ${size * 0.42}px "Playfair Display", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(monogram, cx, cx + size * 0.02)

  // laurel-ish ticks
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const r1 = size * 0.455
    const r2 = size * 0.475
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1)
    ctx.lineTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2)
    ctx.lineWidth = size * 0.004
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return track(tex)
}

/** Gold spine title, rendered vertically (transparent background). */
export function spineTexture(title, w = 128, h = 512) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = GOLD
  ctx.font = `600 ${w * 0.42}px "Playfair Display", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(Math.PI / 2)
  ctx.letterSpacing = '6px'
  ctx.fillText(title, 0, 0)
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

const PLACEHOLDER_TONES = ['#31404f', '#4a3b4f', '#3d4a38', '#54452f', '#2f4547', '#4f3838']

/** Generated stand-in for a missing/unset image asset. Clearly marked, never broken. */
export function placeholderImageTexture(label, seed = 0, w = 640, h = 460) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  const tone = PLACEHOLDER_TONES[seed % PLACEHOLDER_TONES.length]
  ctx.fillStyle = tone
  ctx.fillRect(0, 0, w, h)

  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, 'rgba(255,255,255,0.10)')
  grad.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(240,230,205,0.55)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.strokeRect(18, 18, w - 36, h - 36)
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(240,230,205,0.9)'
  ctx.font = `500 30px "EB Garamond", serif`
  ctx.textAlign = 'center'
  ctx.fillText('Placeholder image', w / 2, h / 2 - 26)
  ctx.font = `italic 400 22px "EB Garamond", serif`
  ctx.fillStyle = 'rgba(240,230,205,0.7)'
  wrapCenter(ctx, label || 'Set src in bookContent.js', w / 2, h / 2 + 14, w - 100, 28)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return track(tex)
}

/** Caption strip texture for a focused floating image. */
export function captionTexture(text, w = 768, h = 160) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(24,20,14,0.88)'
  roundRect(ctx, 0, 0, w, h, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(201,166,89,0.5)'
  ctx.lineWidth = 2
  roundRect(ctx, 4, 4, w - 8, h - 8, 14)
  ctx.stroke()
  ctx.fillStyle = '#efe6d0'
  ctx.font = `italic 500 34px "EB Garamond", serif`
  ctx.textAlign = 'center'
  wrapCenter(ctx, text, w / 2, h / 2 - (text.length > 60 ? 18 : 0) + 10, w - 90, 42)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapCenter(ctx, text, cx, y, maxW, lineH) {
  const words = String(text).split(/\s+/)
  let line = ''
  const lines = []
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  const startY = y - ((lines.length - 1) * lineH) / 2
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH))
}
