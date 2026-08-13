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
  // fingerprints in the grime
  for (let f = 0; f < 3; f++) {
    const fx = size * (0.15 + Math.random() * 0.7)
    const fy = size * (0.15 + Math.random() * 0.7)
    ctx.strokeStyle = 'rgba(200,175,130,0.08)'
    ctx.lineWidth = 1.6
    for (let i = 0; i < 6; i++) {
      const r = 4 + i * 3.4
      const a0 = Math.random() * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(fx, fy, r, r * 0.7, 0.4, a0, a0 + Math.PI * 1.2)
      ctx.stroke()
    }
  }
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

/** Soft radial shadow blob — used under photos, scraps and artifacts. */
export function shadowBlobTexture(size = 128) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5)
  g.addColorStop(0, 'rgba(20,10,2,0.75)')
  g.addColorStop(0.7, 'rgba(20,10,2,0.3)')
  g.addColorStop(1, 'rgba(20,10,2,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  return track(tex)
}

/** A torn old document with faux handwriting, stains and a burnt corner — taped onto pages. */
export function scrapDocumentTexture(seed = 0, w = 300, h = 380) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  // torn silhouette
  ctx.fillStyle = '#e4d7b4'
  ctx.beginPath()
  ctx.moveTo(10, 14)
  for (let x = 10; x < w - 10; x += 16) ctx.lineTo(x, 6 + Math.random() * 12)
  for (let y = 14; y < h - 12; y += 18) ctx.lineTo(w - 6 - Math.random() * 12, y)
  for (let x = w - 10; x > 10; x -= 16) ctx.lineTo(x, h - 6 - Math.random() * 12)
  for (let y = h - 12; y > 14; y -= 18) ctx.lineTo(6 + Math.random() * 10, y)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(100,70,32,0.55)'
  ctx.lineWidth = 2
  ctx.stroke()
  // stains
  for (let i = 0; i < 4; i++) {
    const g = ctx.createRadialGradient(Math.random() * w, Math.random() * h, 2, Math.random() * w, Math.random() * h, 26 + Math.random() * 50)
    g.addColorStop(0, 'rgba(120,80,30,0.22)')
    g.addColorStop(1, 'rgba(120,80,30,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  // burnt corner
  const bg = ctx.createRadialGradient(w - 16, 16, 2, w - 16, 16, 60)
  bg.addColorStop(0, 'rgba(30,16,5,0.85)')
  bg.addColorStop(0.6, 'rgba(80,45,15,0.4)')
  bg.addColorStop(1, 'rgba(80,45,15,0)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  // faux handwriting — wavy ink lines (no real words, keeps it original)
  ctx.strokeStyle = 'rgba(48,32,14,0.75)'
  ctx.lineWidth = 1.8
  for (let y = 56; y < h - 40; y += 26) {
    ctx.beginPath()
    let px = 26 + Math.random() * 10
    ctx.moveTo(px, y)
    const lineEnd = w - 30 - Math.random() * 40
    while (px < lineEnd) {
      const nx = px + 6 + Math.random() * 10
      ctx.quadraticCurveTo(px + 3, y - 5 - Math.random() * 5, nx, y + (Math.random() - 0.5) * 4)
      px = nx
    }
    ctx.stroke()
  }
  // signature flourish
  ctx.beginPath()
  ctx.moveTo(w * 0.5, h - 30)
  ctx.bezierCurveTo(w * 0.6, h - 48, w * 0.72, h - 16, w * 0.85, h - 34)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** Handwritten caption strip for a photograph (transparent background). */
export function photoCaptionTexture(text, w = 512, h = 96) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(55,38,18,0.9)'
  ctx.font = '600 40px "Caveat", cursive'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let t = String(text)
  if (t.length > 40) t = t.slice(0, 38) + '…'
  ctx.fillText(t, w / 2, h / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** A small desk map — coastline, dashed route, X marks the spot. */
export function deskMapTexture(w = 512, h = 384) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#dbc998'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(110,85,45,${(Math.random() * 0.08).toFixed(3)})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6)
  }
  const edge = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.72)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(80,50,18,0.45)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, w, h)
  // coastline
  ctx.strokeStyle = 'rgba(60,42,20,0.8)'
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(30, h * 0.7)
  for (let x = 30; x < w - 30; x += 24) {
    ctx.quadraticCurveTo(x + 8, h * 0.7 + Math.sin(x * 0.05) * 40 - Math.random() * 18, x + 24, h * 0.7 + Math.sin((x + 24) * 0.045) * 42)
  }
  ctx.stroke()
  // hatching for the sea
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(60,42,20,0.3)'
  for (let y = h * 0.78; y < h - 16; y += 10) {
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.lineTo(w - 24, y + Math.random() * 4)
    ctx.stroke()
  }
  // dashed route to an X
  ctx.setLineDash([8, 8])
  ctx.strokeStyle = 'rgba(140,40,28,0.85)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(60, 60)
  ctx.quadraticCurveTo(w * 0.4, h * 0.15, w * 0.55, h * 0.35)
  ctx.quadraticCurveTo(w * 0.7, h * 0.52, w * 0.78, h * 0.42)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(w * 0.78 - 12, h * 0.42 - 12)
  ctx.lineTo(w * 0.78 + 12, h * 0.42 + 12)
  ctx.moveTo(w * 0.78 + 12, h * 0.42 - 12)
  ctx.lineTo(w * 0.78 - 12, h * 0.42 + 12)
  ctx.stroke()
  // compass rose
  ctx.strokeStyle = 'rgba(60,42,20,0.7)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(70, h - 70, 26, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(70, h - 96)
  ctx.lineTo(76, h - 70)
  ctx.lineTo(70, h - 44)
  ctx.lineTo(64, h - 70)
  ctx.closePath()
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** An old letter/envelope for the desk. */
export function letterTexture(w = 384, h = 256) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#e6dab6'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(110,80,40,0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(6, 6, w - 12, h - 12)
  // address squiggles
  ctx.strokeStyle = 'rgba(48,32,14,0.7)'
  ctx.lineWidth = 1.8
  for (let i = 0; i < 3; i++) {
    const y = h * 0.42 + i * 26
    ctx.beginPath()
    ctx.moveTo(w * 0.3, y)
    let px = w * 0.3
    while (px < w * 0.3 + (140 - i * 30)) {
      const nx = px + 8 + Math.random() * 8
      ctx.quadraticCurveTo(px + 4, y - 5, nx, y)
      px = nx
    }
    ctx.stroke()
  }
  // stamp
  ctx.strokeStyle = 'rgba(140,40,28,0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(w - 78, 20, 52, 62)
  ctx.beginPath()
  ctx.moveTo(w - 66, 66)
  ctx.lineTo(w - 52, 36)
  ctx.lineTo(w - 38, 66)
  ctx.stroke()
  // postmark
  ctx.beginPath()
  ctx.arc(w - 100, 50, 24, 0, Math.PI * 2)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return track(tex)
}

/** Compass face for the desk compass. */
export function compassFaceTexture(size = 256) {
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const cx = size / 2
  ctx.fillStyle = '#e8dcc0'
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.48, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(60,42,20,0.85)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cx, size * 0.44, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    ctx.lineWidth = i % 4 === 0 ? 3 : 1.4
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * size * 0.36, cx + Math.sin(a) * size * 0.36)
    ctx.lineTo(cx + Math.cos(a) * size * 0.43, cx + Math.sin(a) * size * 0.43)
    ctx.stroke()
  }
  // needle
  ctx.fillStyle = 'rgba(150,40,30,0.9)'
  ctx.beginPath()
  ctx.moveTo(cx, cx - size * 0.3)
  ctx.lineTo(cx + size * 0.05, cx)
  ctx.lineTo(cx - size * 0.05, cx)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(50,38,20,0.9)'
  ctx.beginPath()
  ctx.moveTo(cx, cx + size * 0.3)
  ctx.lineTo(cx + size * 0.05, cx)
  ctx.lineTo(cx - size * 0.05, cx)
  ctx.closePath()
  ctx.fill()
  ctx.font = `700 ${size * 0.1}px "IM Fell English SC", serif`
  ctx.fillStyle = 'rgba(60,42,20,0.9)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', cx, cx - size * 0.33)
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
