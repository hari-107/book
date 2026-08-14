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

function upscaleNoise(ctx, W2, H2, cellsX, cellsY, tone, maxAlpha, rand = Math.random) {
  const tiny = makeCanvas(cellsX, cellsY)
  const tctx = tiny.getContext('2d')
  const img = tctx.createImageData(cellsX, cellsY)
  for (let i = 0; i < cellsX * cellsY; i++) {
    img.data[i * 4] = tone[0]
    img.data[i * 4 + 1] = tone[1]
    img.data[i * 4 + 2] = tone[2]
    img.data[i * 4 + 3] = Math.pow(rand(), 2.2) * maxAlpha * 255
  }
  tctx.putImageData(img, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(tiny, 0, 0, W2, H2)
  ctx.restore()
}

export function sobelNormalFromCanvas(heightCanvas, strength = 2.4) {
  const w = heightCanvas.width
  const h = heightCanvas.height
  const src = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data
  const lum = (x, y) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4
    return (src[i] + src[i + 1] + src[i + 2]) / 765
  }
  const out = makeCanvas(w, h)
  const octx = out.getContext('2d')
  const img = octx.createImageData(w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx = (lum(x - 1, y) - lum(x + 1, y)) * strength
      let ny = (lum(x, y - 1) - lum(x, y + 1)) * strength
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
  octx.putImageData(img, 0, 0)
  return out
}

/**
 * Photo-real aged leather for the journal covers. Paints color, height and
 * roughness canvases together — cracks are dark AND depressed AND slightly
 * glossy-edged; scuffs are pale AND matte; stains are dark AND oily. The
 * front cover variant blind-embosses the tooling frame, compass rose and the
 * owner's name into the material itself (with patchy worn gold-leaf
 * remnants) instead of pasting bright graphics on top.
 */
export function agedLeatherMaps({ emboss = false, owner = '', title = '', size = 1024 } = {}) {
  const color = makeCanvas(size, size)
  const cctx = color.getContext('2d')
  const height = makeCanvas(size, size)
  const hctx = height.getContext('2d')
  const rough = makeCanvas(size, size)
  const rctx = rough.getContext('2d')

  // --- base -----------------------------------------------------------
  cctx.fillStyle = '#38220f'
  cctx.fillRect(0, 0, size, size)
  hctx.fillStyle = '#808080'
  hctx.fillRect(0, 0, size, size)
  rctx.fillStyle = '#9c9c9c' // base roughness ~0.61
  rctx.fillRect(0, 0, size, size)

  // large tonal patina — decades of handling and sun
  upscaleNoise(cctx, size, size, 5, 5, [16, 8, 3], 0.5)
  upscaleNoise(cctx, size, size, 5, 5, [92, 58, 30], 0.32)
  upscaleNoise(cctx, size, size, 13, 13, [70, 42, 20], 0.3)
  upscaleNoise(cctx, size, size, 34, 34, [20, 10, 4], 0.28)
  upscaleNoise(rctx, size, size, 9, 9, [255, 255, 255], 0.16)
  upscaleNoise(rctx, size, size, 9, 9, [0, 0, 0], 0.14)

  // leather grain — fine pore speckle in color and height
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const light = Math.random() > 0.5
    cctx.fillStyle = light ? 'rgba(120,80,45,0.06)' : 'rgba(10,5,2,0.08)'
    cctx.fillRect(x, y, 1.3, 1.3)
    hctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
    hctx.fillRect(x, y, 1.3, 1.3)
  }

  // crack network — meandering dried-leather cracks, deeper near edges
  const crack = (x, y, steps, ang) => {
    cctx.strokeStyle = `rgba(12,6,2,${0.3 + Math.random() * 0.3})`
    cctx.lineWidth = 1 + Math.random() * 1.8
    hctx.strokeStyle = 'rgba(0,0,0,0.5)'
    hctx.lineWidth = cctx.lineWidth + 1.2
    rctx.strokeStyle = 'rgba(40,40,40,0.35)' // crack valleys keep old finish → glossier
    rctx.lineWidth = cctx.lineWidth
    cctx.beginPath()
    hctx.beginPath()
    rctx.beginPath()
    cctx.moveTo(x, y)
    hctx.moveTo(x, y)
    rctx.moveTo(x, y)
    for (let s = 0; s < steps; s++) {
      ang += (Math.random() - 0.5) * 0.9
      x += Math.cos(ang) * (6 + Math.random() * 14)
      y += Math.sin(ang) * (6 + Math.random() * 14)
      cctx.lineTo(x, y)
      hctx.lineTo(x, y)
      rctx.lineTo(x, y)
      if (Math.random() > 0.82) {
        // fork
        let bx = x
        let by = y
        let ba = ang + (Math.random() > 0.5 ? 0.9 : -0.9)
        cctx.moveTo(bx + Math.cos(ba) * 20, by + Math.sin(ba) * 20)
        cctx.lineTo(bx, by)
      }
    }
    cctx.stroke()
    hctx.stroke()
    rctx.stroke()
  }
  for (let i = 0; i < 26; i++) crack(Math.random() * size, Math.random() * size, 8 + Math.random() * 16, Math.random() * Math.PI * 2)
  // dense crackle near the corners
  for (const [cx, cy] of [[0, 0], [size, 0], [0, size], [size, size]]) {
    for (let i = 0; i < 18; i++) {
      crack(cx + (Math.random() - 0.5) * size * 0.3, cy + (Math.random() - 0.5) * size * 0.3, 3 + Math.random() * 5, Math.random() * Math.PI * 2)
    }
  }

  // scuffs — pale abraded patches and streaks (matte in roughness)
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const rr = 20 + Math.random() * 70
    const g = cctx.createRadialGradient(x, y, 2, x, y, rr)
    g.addColorStop(0, `rgba(146,108,66,${(0.08 + Math.random() * 0.12).toFixed(3)})`)
    g.addColorStop(1, 'rgba(146,108,66,0)')
    cctx.fillStyle = g
    cctx.fillRect(0, 0, size, size)
    const rg = rctx.createRadialGradient(x, y, 2, x, y, rr)
    rg.addColorStop(0, 'rgba(255,255,255,0.3)')
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    rctx.fillStyle = rg
    rctx.fillRect(0, 0, size, size)
  }

  // oily dark stains (glossier)
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const rr = 30 + Math.random() * 90
    const g = cctx.createRadialGradient(x, y, 2, x, y, rr)
    g.addColorStop(0, 'rgba(8,4,1,0.28)')
    g.addColorStop(1, 'rgba(8,4,1,0)')
    cctx.fillStyle = g
    cctx.fillRect(0, 0, size, size)
    const rg = rctx.createRadialGradient(x, y, 2, x, y, rr)
    rg.addColorStop(0, 'rgba(0,0,0,0.35)')
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    rctx.fillStyle = rg
    rctx.fillRect(0, 0, size, size)
  }

  // worn edges: pale abraded rim where the finish rubbed off — soft streaks
  // running ALONG each edge (never hard-edged dots)
  for (let i = 0; i < 150; i++) {
    const t = Math.random()
    const e = Math.floor(Math.random() * 4)
    const horizontal = e < 2
    let x, y
    const inset = 4 + Math.pow(Math.random(), 2) * 26
    if (e === 0) (x = t * size), (y = inset)
    else if (e === 1) (x = t * size), (y = size - inset)
    else if (e === 2) (x = inset), (y = t * size)
    else (x = size - inset), (y = t * size)
    const len = 14 + Math.random() * 50
    const thick = 2 + Math.random() * 6
    const rx = horizontal ? len : thick
    const ry = horizontal ? thick : len
    const g = cctx.createRadialGradient(x, y, 0.5, x, y, Math.max(rx, ry))
    g.addColorStop(0, `rgba(150,112,68,${(0.05 + Math.random() * 0.09).toFixed(3)})`)
    g.addColorStop(1, 'rgba(150,112,68,0)')
    cctx.save()
    cctx.translate(x, y)
    cctx.scale(horizontal ? 1 : thick / len, horizontal ? thick / len : 1)
    cctx.translate(-x, -y)
    cctx.fillStyle = g
    cctx.beginPath()
    cctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2)
    cctx.fill()
    cctx.restore()
    const rg = rctx.createRadialGradient(x, y, 0.5, x, y, Math.max(rx, ry))
    rg.addColorStop(0, 'rgba(255,255,255,0.12)')
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    rctx.save()
    rctx.translate(x, y)
    rctx.scale(horizontal ? 1 : thick / len, horizontal ? thick / len : 1)
    rctx.translate(-x, -y)
    rctx.fillStyle = rg
    rctx.beginPath()
    rctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2)
    rctx.fill()
    rctx.restore()
  }
  const grime = cctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size * 0.74)
  grime.addColorStop(0, 'rgba(0,0,0,0)')
  grime.addColorStop(1, 'rgba(8,4,1,0.5)')
  cctx.fillStyle = grime
  cctx.fillRect(0, 0, size, size)
  // rounded-rim illusion: height falls off at the outer border
  const rim = hctx.createRadialGradient(size / 2, size / 2, size * 0.62, size / 2, size / 2, size * 0.75)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.55)')
  hctx.fillStyle = rim
  hctx.fillRect(0, 0, size, size)

  // faint fingerprints in the grime — barely-there smudges
  for (let f = 0; f < 2; f++) {
    const fx = size * (0.2 + Math.random() * 0.6)
    const fy = size * (0.2 + Math.random() * 0.6)
    cctx.strokeStyle = 'rgba(160,125,80,0.03)'
    cctx.lineWidth = 1.4
    for (let i = 0; i < 5; i++) {
      const r = 4 + i * 3
      const a0 = Math.random() * Math.PI * 2
      cctx.beginPath()
      cctx.ellipse(fx, fy, r, r * 0.7, 0.4, a0, a0 + Math.PI * 0.9)
      cctx.stroke()
    }
  }

  // --- blind embossing (front cover only) -------------------------------
  if (emboss) {
    const embossStroke = (draw) => {
      // dark impression in color, depression in height, patchy leaf remnants
      cctx.save()
      cctx.strokeStyle = 'rgba(10,5,2,0.6)'
      cctx.fillStyle = 'rgba(10,5,2,0.6)'
      draw(cctx)
      cctx.restore()
      hctx.save()
      hctx.strokeStyle = 'rgba(0,0,0,0.85)'
      hctx.fillStyle = 'rgba(0,0,0,0.85)'
      draw(hctx)
      hctx.restore()
    }
    const leafRemnants = (draw, alpha = 0.55, wear = 130) => {
      const tmp = makeCanvas(size, size)
      const tctx = tmp.getContext('2d')
      tctx.strokeStyle = `rgba(190,150,80,${alpha})`
      tctx.fillStyle = `rgba(190,150,80,${alpha})`
      draw(tctx)
      // wear the leaf away in patches
      tctx.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < wear; i++) {
        tctx.beginPath()
        tctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 26, 0, Math.PI * 2)
        tctx.fill()
      }
      cctx.drawImage(tmp, 0, 0)
    }

    // tooling frames
    const frame = (inset, lw) => (ctx2) => {
      ctx2.lineWidth = lw
      ctx2.strokeRect(size * inset, size * inset, size * (1 - 2 * inset), size * (1 - 2 * inset))
    }
    embossStroke(frame(0.06, 4))
    embossStroke(frame(0.075, 2))
    leafRemnants(frame(0.06, 2))

    // compass rose, upper center — thin tooled linework, heavily worn
    const cx = size / 2
    const cy = size * 0.34
    const rose = (ctx2) => {
      ctx2.lineWidth = 2.6
      ctx2.beginPath()
      ctx2.arc(cx, cy, size * 0.115, 0, Math.PI * 2)
      ctx2.stroke()
      ctx2.lineWidth = 1.4
      ctx2.beginPath()
      ctx2.arc(cx, cy, size * 0.096, 0, Math.PI * 2)
      ctx2.stroke()
      // degree ticks between the rings
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2
        ctx2.lineWidth = i % 8 === 0 ? 2 : 1
        ctx2.beginPath()
        ctx2.moveTo(cx + Math.cos(a) * size * 0.099, cy + Math.sin(a) * size * 0.099)
        ctx2.lineTo(cx + Math.cos(a) * size * 0.112, cy + Math.sin(a) * size * 0.112)
        ctx2.stroke()
      }
      // slim outline points, not solid star fills
      ctx2.lineWidth = 1.8
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2 + 0.04
        const long = i % 2 === 0
        const r = size * (long ? 0.082 : 0.048)
        const w2 = size * (long ? 0.009 : 0.006)
        ctx2.beginPath()
        ctx2.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        ctx2.lineTo(cx - Math.sin(a) * w2, cy + Math.cos(a) * w2)
        ctx2.lineTo(cx + Math.sin(a) * w2, cy - Math.cos(a) * w2)
        ctx2.closePath()
        ctx2.stroke()
        if (long) ctx2.fill()
      }
      ctx2.beginPath()
      ctx2.arc(cx, cy, size * 0.006, 0, Math.PI * 2)
      ctx2.fill()
    }
    embossStroke(rose)
    leafRemnants(rose, 0.38, 170)

    // owner name + title — old book face, blind-embossed with worn gilt
    const nameDraw = (ctx2) => {
      ctx2.textAlign = 'center'
      ctx2.textBaseline = 'middle'
      ctx2.font = `${size * 0.062}px "IM Fell English SC", serif`
      ctx2.fillText(owner, cx, size * 0.585)
      ctx2.font = `${size * 0.036}px "IM Fell English SC", serif`
      const prev = ctx2.letterSpacing
      ctx2.letterSpacing = `${size * 0.014}px`
      ctx2.fillText(title, cx + size * 0.007, size * 0.675)
      ctx2.letterSpacing = prev || '0px'
      // small tooling diamond between
      ctx2.beginPath()
      ctx2.moveTo(cx, size * 0.625)
      ctx2.lineTo(cx + size * 0.008, size * 0.633)
      ctx2.lineTo(cx, size * 0.641)
      ctx2.lineTo(cx - size * 0.008, size * 0.633)
      ctx2.closePath()
      ctx2.fill()
    }
    embossStroke(nameDraw)
    leafRemnants(nameDraw)
  }

  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const normalMap = new THREE.CanvasTexture(sobelNormalFromCanvas(height, 2.6))
  const roughnessMap = new THREE.CanvasTexture(rough)
  return { map: track(map), normalMap: track(normalMap), roughnessMap: track(roughnessMap) }
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
  ctx.fillStyle = '#e0d4b4'
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
  ctx.fillStyle = '#d9c69c'
  ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 2) {
    const a = 0.06 + Math.random() * 0.28
    const inset = Math.random() * 5
    const cream = Math.random() > 0.72
    ctx.fillStyle = cream ? `rgba(240,230,204,${(a * 0.9).toFixed(3)})` : `rgba(95,70,35,${a.toFixed(3)})`
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

/** Spine title — worn blind emboss with faded gilt, rendered vertically (transparent background). */
export function spineTexture(title, w = 128, h = 512) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(Math.PI / 2)
  ctx.letterSpacing = '6px'
  ctx.font = `${w * 0.3}px "IM Fell English SC", serif`
  // dark impression, then patchy faded gilt
  ctx.fillStyle = 'rgba(10,5,2,0.7)'
  ctx.fillText(title, 1, 1)
  ctx.fillStyle = 'rgba(178,140,74,0.5)'
  ctx.fillText(title, 0, 0)
  ctx.restore()
  // wear the gilt away in patches
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 26; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 12, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
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

/**
 * Themed physical fragments stuck onto pages — the scrapbook layer.
 * kinds: 'graph' (engineer's grid + sketch), 'blueprint' (blue grid plan),
 * 'classified' (redacted strip), 'sticky' (aged sticky note), 'ticket'
 * (expedition ticket stub with perforation).
 */
export function themedScrapTexture(kind, seed = 0, w = 240, h = 180) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  const rnd = () => Math.random()
  switch (kind) {
    case 'graph': {
      ctx.fillStyle = '#e7dfc8'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(120,140,150,0.35)'
      ctx.lineWidth = 1
      for (let x = 0; x <= w; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y <= h; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      // pencil sketch: a bracketed mechanism
      ctx.strokeStyle = 'rgba(60,55,50,0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(w * 0.2, h * 0.3, w * 0.3, h * 0.35)
      ctx.beginPath()
      ctx.arc(w * 0.68, h * 0.48, h * 0.18, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w * 0.5, h * 0.48)
      ctx.lineTo(w * 0.5 + h * 0.18, h * 0.48)
      ctx.stroke()
      ctx.font = '600 16px "Caveat", cursive'
      ctx.fillStyle = 'rgba(60,55,50,0.85)'
      ctx.fillText('fig. ' + ((seed % 7) + 1), w * 0.2, h * 0.24)
      break
    }
    case 'blueprint': {
      ctx.fillStyle = '#2c4a66'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(200,225,255,0.3)'
      ctx.lineWidth = 1
      for (let x = 0; x <= w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y <= h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      ctx.strokeStyle = 'rgba(235,245,255,0.9)'
      ctx.lineWidth = 2
      ctx.strokeRect(w * 0.15, h * 0.25, w * 0.4, h * 0.42)
      ctx.beginPath()
      ctx.moveTo(w * 0.55, h * 0.46)
      ctx.lineTo(w * 0.78, h * 0.46)
      ctx.stroke()
      ctx.strokeRect(w * 0.72, h * 0.34, w * 0.14, h * 0.24)
      ctx.font = '12px "Special Elite", monospace'
      ctx.fillStyle = 'rgba(235,245,255,0.9)'
      ctx.fillText('PLAN B', w * 0.15, h * 0.18)
      break
    }
    case 'classified': {
      ctx.fillStyle = '#ddd0ac'
      ctx.fillRect(0, 0, w, h)
      ctx.font = '20px "Special Elite", monospace'
      ctx.fillStyle = 'rgba(150,40,30,0.8)'
      ctx.fillText('CLASSIFIED', 16, 32)
      // typed lines with redactions
      for (let y = 58; y < h - 16; y += 24) {
        ctx.fillStyle = 'rgba(60,48,30,0.6)'
        ctx.fillRect(16, y, w - 32, 2)
        if (Math.random() > 0.4) {
          ctx.fillStyle = 'rgba(25,18,10,0.9)'
          ctx.fillRect(16 + Math.random() * 80, y - 12, 40 + Math.random() * 80, 16)
        }
      }
      break
    }
    case 'sticky': {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#e8d489'
      ctx.fillRect(6, 6, w - 12, h - 12)
      const g = ctx.createLinearGradient(0, h - 40, 0, h)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(120,95,40,0.25)')
      ctx.fillStyle = g
      ctx.fillRect(6, 6, w - 12, h - 12)
      ctx.font = '600 26px "Caveat", cursive'
      ctx.fillStyle = 'rgba(60,45,20,0.9)'
      const notes = ['fix this!!', 'genius idea →', 'do NOT forget', 'why??', 'ship it.', 'needs coffee', 'ask past me']
      ctx.fillText(notes[seed % notes.length], 18, h / 2)
      break
    }
    case 'ticket': {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#d9c390'
      ctx.fillRect(4, h * 0.2, w - 8, h * 0.6)
      // perforation
      ctx.fillStyle = 'rgba(24,20,16,1)'
      for (let y = h * 0.2; y < h * 0.8; y += 10) {
        ctx.beginPath()
        ctx.arc(w * 0.72, y + 4, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(90,65,30,0.6)'
      ctx.lineWidth = 2
      ctx.strokeRect(4, h * 0.2, w - 8, h * 0.6)
      ctx.font = '16px "Special Elite", monospace'
      ctx.fillStyle = 'rgba(70,50,25,0.9)'
      ctx.fillText('EXPEDITION', 16, h * 0.42)
      ctx.font = '13px "Special Elite", monospace'
      ctx.fillText('ADMIT ONE', 16, h * 0.62)
      ctx.save()
      ctx.translate(w * 0.86, h / 2)
      ctx.rotate(Math.PI / 2)
      ctx.font = '14px "Special Elite", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(String(1000 + ((seed * 37) % 9000)), 0, 0)
      ctx.restore()
      break
    }
    default: {
      ctx.fillStyle = '#e2cfa0'
      ctx.fillRect(0, 0, w, h)
    }
  }
  // grime pass for all
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(90,65,30,${(rnd() * 0.06).toFixed(3)})`
    ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5)
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
