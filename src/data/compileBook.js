import { sections, structural } from './bookContent.js'

/**
 * Compiles the hierarchical content model into the physical model the 3D
 * book renders from:
 *
 *   faces  — ordered list of page faces. Face i prints as page number i + 1.
 *            Sheet j carries face 2j on its front and face 2j+1 on its back.
 *   spreads — after turning k sheets the open book shows
 *            [ back of sheet k-1 | front of sheet k ] = [ face 2k-1 | face 2k ].
 *
 * Index entries and navigation targets are resolved to face indices here so
 * every page id can be jumped to directly.
 */

function makeFace(page, section, kind) {
  return {
    id: page.id,
    kind, // 'structural' | 'content' | 'blank'
    sectionId: section ? section.id : null,
    sectionTitle: section ? section.title : null,
    heading: page.heading ?? '',
    blocks: page.blocks ?? [],
    images: page.images ?? [],
  }
}

const faces = []
faces.push(makeFace(structural.welcome, null, 'structural'))
faces.push({ ...makeFace({ id: 'index', heading: 'Index', blocks: [], images: [] }, null, 'structural'), isIndex: true })

for (const section of sections) {
  section.pages.forEach((page, i) => {
    const face = makeFace(page, section, 'content')
    if (i === 0) face.isSectionStart = true
    faces.push(face)
  })
}

faces.push(makeFace(structural.end, null, 'structural'))

// A sheet needs two faces — pad with a blank so the count is even.
if (faces.length % 2 !== 0) {
  faces.push({ id: 'blank-pad', kind: 'blank', sectionId: null, sectionTitle: null, heading: '', blocks: [], images: [] })
}

faces.forEach((f, i) => {
  f.faceIndex = i
  f.pageNumber = i + 1
})

export const FACES = faces
export const SHEET_COUNT = faces.length / 2
export const faceById = Object.fromEntries(faces.map((f) => [f.id, f]))

/** Spread index that shows face f. Even faces appear on the right of spread f/2; odd faces on the left of spread (f+1)/2. */
export function spreadForFace(f) {
  return f % 2 === 0 ? f / 2 : (f + 1) / 2
}

/** Exactly six Index entries — one per content section, targeting its first page. */
export const INDEX_ENTRIES = sections.map((s) => {
  const first = faces.find((f) => f.sectionId === s.id)
  return { sectionId: s.id, title: s.title, faceIndex: first.faceIndex, pageNumber: first.pageNumber }
})

/** Everything reachable by the logo navigation — every face, including deeper section pages. */
export const NAV_ITEMS = faces
  .filter((f) => f.kind !== 'blank')
  .map((f) => ({
    id: f.id,
    faceIndex: f.faceIndex,
    pageNumber: f.pageNumber,
    label: f.heading || (f.kind === 'structural' ? 'Colophon' : 'Untitled'),
    sectionTitle: f.sectionTitle,
    isSectionStart: !!f.isSectionStart,
  }))

/** Faces visible on a given spread: [leftFaceIndex|null, rightFaceIndex|null] (null = endpaper). */
export function facesForSpread(spread) {
  const left = spread >= 1 ? 2 * spread - 1 : null
  const right = spread < SHEET_COUNT ? 2 * spread : null
  return [left, right]
}
