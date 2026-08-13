import * as THREE from 'three'
import { GOLD, LEATHER } from '../constants.js'

/**
 * Procedural texture factory for the adventure book. Everything the book and
 * its living environment wear — worn leather, aged paper edges, desk wood,
 * tumbling paper scraps, glowing words, gears, polaroid placeholders — is
 * generated at runtime on canvases. The repository ships no binary assets
 * and nothing can 404.
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
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += data[((y + dy + h) % h) * w + ((x + dx + w) % w)]
          n++
        }
      }
      out[y * w + x] = sum / n
    }
  }
  return out
}

/** Worn brown leather: mottled, scratched, stitched, sun-bleached at the edges. */
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
      const g = (Math.random() - 0.5) * 16 + (n - 0.5) * 34
      const i = (y * size + x) * 4
      d[i] = Math.max(0, Math.min(255, d[i] + g * 1.15))
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + g * 0.9))
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + g * 0.65))
    }
  }
  ctx.putImageData(img, 0, 0)

  // decades of scratches
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const len = 20 + Math.random() * 90
    const a = Math.random() * Math.PI
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(210,180,140,0.14)' : 'rgba(20,12,6,0.22)'
    ctx.lineWidth = 0.8 + Math.random()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }
  // dents / dark patches
  for (let i = 0; i < 8; i++) {
    const g2 = ctx.createRadialGradient(
      Math.random() * size, Math.random() * size, 2,
      Math.random() * size, Math.random() * size, 30 + Math.random() * 60
    )
    g2.addColorStop(0, 'rgba(15,9,4,0.22)')
    g2.addColorStop(1, 'rgba(15,9,4,0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, size, size)
  }
  // stitching along the border
  ctx.strokeStyle = 'rgba(190,160,110,0.5)'
  ctx.lineWidth = 2
  ctx.setLineDash([9, 7])
  ctx.strokeRect(size * 0.045, size * 0.045, size * 0.91, size * 0.91)
  ctx.setLineDash([])
  // edge wear vignette (bleached rim, dark corners)
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.74)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(12,7,3,0.55)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return track(tex)
}

/** Normal map derived from a noise heightfield — leather grain and wear under light. */
export function grainNormalTexture(size = 256, strength = 1.8) {
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
      d[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return track(tex)
}

/** Aged paper tone for endpapers and block faces. */
export function paperColorTexture(size = 256) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#dcc492'
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = (Math.random() - 0.5) * 14
    d[i] += g
    d[i + 1] += g
    d[i + 2] += g * 0.6
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return track(tex)
}

/** Irregular, darkened striations for the exposed page-block edges — old, uneven, slightly water-stained. */
export function pageEdgeTexture(w = 64, h = 256) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#d3b578'
  ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 2) {
    const a = 0.06 + Math.random() * 0.26
    const inset = Math.random() * 5
    ctx.fillStyle = `rgba(95,70,35,${a.toFixed(3)})`
    ctx.fillRect(inset, y, w - inset * (0.5 + Math.random()), 1 + (Math.random() > 0.85 ? 1 : 0))
  }
  // age spots / water stains
  for (let i = 0; i < 7; i++) {
    const g = ctx.createRadialGradient(
      Math.random() * w, Math.random() * h, 1,
      Math.random() * w, Math.random() * h, 8 + Math.random() * 26
    )
    g.addColorStop(0, 'rgba(90,60,25,0.28)')
    g.addColorStop(1, 'rgba(90,60,25,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return track(tex)
}

/** Wide desk wood — dark planks with grain streaks. */
export function woodTexture(w = 512, h = 512) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#2a1c10'
  ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 2) {
    const a = 0.04 + Math.random() * 0.1
    const tone = Math.random() > 0.5 ? '60,40,20' : '15,9,4'
    ctx.fillStyle = `rgba(${tone},${a.toFixed(3)})`
    ctx.fillRect(0, y, w, 1 + Math.random() * 2)
  }
  for (let i = 0; i < 10; i++) {
    // knots
    const x = Math.random() * w
    const y = Math.random() * h
    ctx.strokeStyle = 'rgba(12,7,3,0.35)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(x, y, 6 + Math.random() * 10, 3 + Math.random() * 5, Math.random(), 0, Math.PI * 2)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 4)
  return track(tex)
}

/** Compass-rose cover emblem with worn gilt ring (transparent background). */
export function emblemTexture(_monogram, size = 512) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const cx = size / 2
  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = GOLD
  ctx.fillStyle = GOLD

  ctx.lineWidth = size * 0.016
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.44, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = size * 0.006
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.385, 0, Math.PI * 2)
  ctx.stroke()

  // compass rose — 8 points, alternating long/short
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const long = i % 2 === 0
    const r = size * (long ? 0.34 : 0.2)
    const wHalf = size * (long ? 0.045 : 0.03)
    const px = Math.cos(a)
    const py = Math.sin(a)
    ctx.beginPath()
    ctx.moveTo(cx + px * r, cx + py * r)
    ctx.lineTo(cx - py * wHalf, cx + px * wHalf)
    ctx.lineTo(cx + py * wHalf, cx - px * wHalf)
    ctx.closePath()
    ctx.globalAlpha = long ? 0.95 : 0.7
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.035, 0, Math.PI * 2)
  ctx.fill()
  // N
  ctx.font = `700 ${size * 0.09}px "IM Fell English SC", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', cx, cx - size * 0.41 + size * 0.0)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return track(tex)
}

/** Gilt spine title, rendered vertically (transparent background). */
export function spineTexture(title, w = 128, h = 512) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = GOLD
  ctx.font = `${w * 0.36}px "Rye", "IM Fell English SC", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(Math.PI / 2)
  ctx.letterSpacing = '5px'
  ctx.fillText(title, 0, 0)
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/**
 * Polaroid-style placeholder for a missing/unset photo: aged instant-photo
 * frame, sketchy landscape doodle, handwritten label. Clearly a stand-in.
 */
export function placeholderImageTexture(label, seed = 0, w = 640, h = 520) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  // aged polaroid frame
  ctx.fillStyle = '#efe4c8'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(120,90,40,0.12)'
  for (let i = 0; i < 250; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5)

  // photo window
  const pad = 30
  const photoH = h - 140
  const tones = ['#3d4a45', '#4a4038', '#39434f', '#4d4430', '#42394d']
  ctx.fillStyle = tones[seed % tones.length]
  ctx.fillRect(pad, pad, w - pad * 2, photoH)
  const g = ctx.createLinearGradient(0, pad, 0, pad + photoH)
  g.addColorStop(0, 'rgba(255,246,220,0.16)')
  g.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = g
  ctx.fillRect(pad, pad, w - pad * 2, photoH)

  // sketchy doodle landscape inside the "photo"
  ctx.strokeStyle = 'rgba(235,225,200,0.75)'
  ctx.lineWidth = 3
  ctx.beginPath()
  const hy = pad + photoH * 0.62
  ctx.moveTo(pad + 14, hy)
  for (let x = pad + 14; x < w - pad - 14; x += 22) {
    ctx.lineTo(x + 22, hy + (Math.sin(x * 0.05 + seed) * 8 + (Math.random() - 0.5) * 6))
  }
  ctx.stroke()
  // mountains
  ctx.beginPath()
  ctx.moveTo(w * 0.28, hy)
  ctx.lineTo(w * 0.42, pad + photoH * 0.26)
  ctx.lineTo(w * 0.56, hy)
  ctx.moveTo(w * 0.48, hy)
  ctx.lineTo(w * 0.62, pad + photoH * 0.34)
  ctx.lineTo(w * 0.74, hy)
  ctx.stroke()
  // sun
  ctx.beginPath()
  ctx.arc(w * 0.72, pad + photoH * 0.24, 22, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = 'italic 500 26px "Caveat", cursive'
  ctx.fillStyle = 'rgba(235,225,200,0.85)'
  ctx.textAlign = 'center'
  ctx.fillText('photo goes here', w / 2, pad + photoH * 0.85)

  // handwritten label on the frame foot
  ctx.fillStyle = 'rgba(60,42,20,0.9)'
  ctx.font = '600 30px "Caveat", cursive'
  wrapCenter(ctx, label || 'set src in bookContent.js', w / 2, h - 66, w - 90, 34)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return track(tex)
}

/** Caption strip texture for a focused photo — torn label style. */
export function captionTexture(text, w = 768, h = 170) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(38,28,14,0.92)'
  roundRect(ctx, 0, 0, w, h, 14)
  ctx.fill()
  ctx.strokeStyle = 'rgba(176,141,62,0.55)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 6])
  roundRect(ctx, 6, 6, w - 12, h - 12, 10)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#ecdcb2'
  ctx.font = '600 38px "Caveat", cursive'
  ctx.textAlign = 'center'
  wrapCenter(ctx, text, w / 2, h / 2 + 8, w - 90, 44)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** Semi-transparent aged tape strip. */
export function tapeTexture(w = 128, h = 48) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(230,215,170,0.55)'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,240,${(Math.random() * 0.12).toFixed(3)})`
    ctx.fillRect(Math.random() * w, 0, 2, h)
  }
  // ragged ends
  ctx.clearRect(0, 0, 3, h)
  ctx.clearRect(w - 3, 0, 3, h)
  for (let y = 0; y < h; y += 4) {
    if (Math.random() > 0.5) ctx.clearRect(0, y, 5, 2)
    if (Math.random() > 0.5) ctx.clearRect(w - 5, y, 5, 2)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

const SCRAP_SCRIBBLES = ['✗', '→', '?', '△', '§', '#', '!']

/** A tumbling background paper scrap with a scribble on it. */
export function paperScrapTexture(seed = 0, w = 128, h = 160) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = ['#e2cfa0', '#d9c28e', '#e8d8b0'][seed % 3]
  // torn silhouette
  ctx.beginPath()
  ctx.moveTo(6, 8)
  for (let x = 6; x < w - 6; x += 12) ctx.lineTo(x, 4 + Math.random() * 8)
  for (let y = 8; y < h - 8; y += 14) ctx.lineTo(w - 4 - Math.random() * 8, y)
  for (let x = w - 6; x > 6; x -= 12) ctx.lineTo(x, h - 4 - Math.random() * 8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(90,65,30,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // faint ruled lines + a scribble
  ctx.strokeStyle = 'rgba(90,65,30,0.25)'
  for (let y = 30; y < h - 20; y += 18) {
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(w - 16, y)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(60,42,20,0.65)'
  ctx.font = '700 42px "Caveat", cursive'
  ctx.textAlign = 'center'
  ctx.fillText(SCRAP_SCRIBBLES[seed % SCRAP_SCRIBBLES.length], w / 2, h / 2 + 14)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** A glowing handwritten word / hacker glyph for the living background. */
export function wordTexture(text, color = '#e8c87a', w = 512, h = 160) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.fillStyle = color
  ctx.font = text.length > 12 ? '600 52px "Caveat", cursive' : '600 64px "Caveat", cursive'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** Faint line-art gear for the deep background. */
export function gearTexture(size = 256, teeth = 12) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const cx = size / 2
  const rOuter = size * 0.46
  const rInner = size * 0.34
  ctx.clearRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(200,170,110,0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const a1 = ((i + 0.35) / teeth) * Math.PI * 2
    const a2 = ((i + 0.5) / teeth) * Math.PI * 2
    const a3 = ((i + 0.85) / teeth) * Math.PI * 2
    ctx.lineTo(cx + Math.cos(a0) * rOuter, cx + Math.sin(a0) * rOuter)
    ctx.lineTo(cx + Math.cos(a1) * rOuter, cx + Math.sin(a1) * rOuter)
    ctx.lineTo(cx + Math.cos(a2) * rInner, cx + Math.sin(a2) * rInner)
    ctx.lineTo(cx + Math.cos(a3) * rInner, cx + Math.sin(a3) * rInner)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.12, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * size * 0.13, cx + Math.sin(a) * size * 0.13)
    ctx.lineTo(cx + Math.cos(a) * size * 0.3, cx + Math.sin(a) * size * 0.3)
    ctx.stroke()
  }
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
