// Visual verification harness: renders real page faces and the aged-leather
// cover material to canvases so realism can be eyeballed in a browser.
import { FACES } from '../src/data/compileBook.js'
import { renderPageFace } from '../src/three/pageTexture.js'
import { agedLeatherMaps } from '../src/three/proceduralTextures.js'
import { bookMeta } from '../src/data/bookContent.js'

function add(canvas, text, wide = false) {
  canvas.style.width = wide ? '44%' : '30%'
  canvas.style.margin = '1%'
  canvas.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)'
  document.body.appendChild(canvas)
  const label = document.createElement('div')
  label.className = 'lbl'
  label.textContent = text
  document.body.appendChild(label)
}

async function main() {
  try {
    await Promise.all([
      document.fonts.load('64px "Base 02"'),
      document.fonts.load('64px "Rye"'),
      document.fonts.load('30px "Special Elite"'),
      document.fonts.load('600 44px "Caveat"'),
      document.fonts.load('36px "IM Fell English SC"'),
      document.fonts.load('64px "IM Fell English SC"'),
    ])
    await document.fonts.ready
  } catch (e) {
    /* proceed with fallbacks */
  }

  // the physical object library, above the fold
  const objects = await import('../src/three/proceduralTextures.js')
  const strip = [
    [objects.postageStampTexture(2), 'postage stamp'],
    [objects.postcardTexture(1), 'postcard'],
    [objects.newspaperClippingTexture(0), 'newspaper clipping'],
    [objects.handwrittenNoteTexture(3), 'handwritten note'],
    [objects.mapFragmentTexture(5), 'map fragment'],
    [objects.sketchCardTexture(0), 'sketch: gear'],
    [objects.sketchCardTexture(3), 'sketch: robot'],
  ]
  for (const [tex, label] of strip) {
    tex.image.style.width = '12%'
    tex.image.style.margin = '0.5%'
    tex.image.style.boxShadow = '0 6px 20px rgba(0,0,0,0.6)'
    document.body.appendChild(tex.image)
    const l = document.createElement('div')
    l.className = 'lbl'
    l.style.width = '12%'
    l.textContent = label
    document.body.appendChild(l)
  }

  // a clean page (title) vs a filthy one (fun zone) — damage progression
  const f1 = renderPageFace(FACES[1], 'left')
  add(f1.texture.image, 'face 1 — title (clean)')
  const f20 = renderPageFace(FACES[20], 'right')
  add(f20.texture.image, 'face 20 — fun zone (chaos level)')
  const f2 = renderPageFace(FACES[2], 'right')
  add(f2.texture.image, 'face 2 — index (moderate)')

  document.getElementById('status').textContent = 'rendered ✓'
}
main()
