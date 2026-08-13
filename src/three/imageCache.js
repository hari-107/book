import * as THREE from 'three'

/**
 * Preloads real image assets referenced by bookContent. A failed or missing
 * asset resolves to `null` and the floating image system falls back to a
 * clearly labelled generated placeholder — a broken asset can never break
 * the book or expose a black texture.
 */
export const imageTextureCache = new Map()

export function preloadImageTextures(images) {
  const loader = new THREE.TextureLoader()
  return Promise.all(
    images
      .filter((img) => img.src)
      .map(
        (img) =>
          new Promise((resolve) => {
            loader.load(
              img.src,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace
                tex.anisotropy = 4
                imageTextureCache.set(img.id, tex)
                resolve()
              },
              undefined,
              () => {
                imageTextureCache.set(img.id, null)
                resolve()
              }
            )
          })
      )
  )
}
