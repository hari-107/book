/**
 * Where the reader left each photograph. Keyed by image id, survives page
 * turns, revisits, camera changes and book close/reopen for the whole
 * session — a photo dragged onto the gutter stays on the gutter.
 * Also tracks a monotonically rising "top of the pile" so the most recently
 * handled print always rests above the others.
 */
export const photoPositions = new Map()

let releaseCounter = 0
export function nextTopOffset() {
  releaseCounter += 1
  return (releaseCounter % 10) * 0.006
}
