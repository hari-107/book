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

  // the embossed front-cover leather (color map) + its normal map
  const leather = agedLeatherMaps({ emboss: true, owner: bookMeta.owner, title: bookMeta.title })
  add(leather.map.image, 'front cover leather — color', true)
  add(leather.normalMap.image, 'front cover leather — normals', true)

  // face 4 = sheet 2 front (torn corner, right page) · face 5 = its back (left)
  const picks = [
    [4, 'right'],
    [5, 'left'],
    [2, 'right'],
  ]
  for (const [idx, side] of picks) {
    const { texture } = renderPageFace(FACES[idx], side)
    add(texture.image, `face ${idx} (${side}) — ${FACES[idx].id}`)
  }
  document.getElementById('status').textContent = 'rendered ✓'
}
main()
