// Visual verification harness: renders real page faces (including torn ones)
// to canvases so the parchment realism can be eyeballed in a browser.
import { FACES } from '../src/data/compileBook.js'
import { renderPageFace } from '../src/three/pageTexture.js'

async function main() {
  try {
    await Promise.all([
      document.fonts.load('64px "Rye"'),
      document.fonts.load('30px "Special Elite"'),
      document.fonts.load('600 44px "Caveat"'),
      document.fonts.load('36px "IM Fell English SC"'),
    ])
    await document.fonts.ready
  } catch (e) {
    /* proceed with fallbacks */
  }

  // face 4 = sheet 2 front (torn corner, right page) · face 5 = its back (left)
  // face 2 = INDEX · face 1 = title · face 20 = bottom-bite sheet 10 front
  const picks = [
    [4, 'right'],
    [5, 'left'],
    [2, 'right'],
    [1, 'left'],
    [20, 'right'],
    [8, 'right'],
  ]
  for (const [idx, side] of picks) {
    const { texture } = renderPageFace(FACES[idx], side)
    const canvas = texture.image
    canvas.style.width = '31%'
    canvas.style.margin = '1%'
    canvas.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)'
    document.body.appendChild(canvas)
    const label = document.createElement('div')
    label.className = 'lbl'
    label.textContent = `face ${idx} (${side}) — ${FACES[idx].id}`
    document.body.appendChild(label)
  }
  document.getElementById('status').textContent = 'rendered ✓'
}
main()
