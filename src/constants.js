// Physical dimensions of the book (world units).
// The book is the dominant object — wide, thick, physically substantial.
export const PAGE_W = 1.3 // page width (spine to fore-edge)
export const PAGE_H = 1.7 // page height
export const COVER_W = 1.37 // cover overhangs the pages
export const COVER_H = 1.79
export const COVER_T = 0.06 // thick leather board
export const SHEET_T = 0.02 // chunky paper sheets

// Interaction
export const EDGE_ZONE = 0.15 // outer 15% of a page's width turns the page

// Canvas texture resolution for page faces (matches PAGE_W / PAGE_H ratio)
export const PAGE_TEX_W = 1024
export const PAGE_TEX_H = 1340

// Camera — close, like sitting at a desk in front of the book.
// (Controls recomputes the actual fit per viewport aspect.)
export const CAMERA_FOV = 42
export const CAMERA_DEFAULT_Z = 2.5
export const CAMERA_MIN_Z = 1.8
export const CAMERA_MAX_Z = 4.8
export const FIT_HALF_W = 1.47 // half-width the camera must keep in frame
export const FIT_HALF_H = 0.99 // half-height the camera must keep in frame

// The desk surface sits just under the book's bottom edge
export const DESK_Y = -0.9

// Ink & material palette — aged adventure journal
export const INK = '#332615' // faded dark-brown ink
export const INK_SOFT = '#6b5638'
export const INK_FADED = 'rgba(51,38,21,0.55)'
export const IVORY = '#e8d5a8' // aged parchment
export const IVORY_DEEP = '#caa96a'
export const LEATHER = '#4a3020' // worn brown leather
export const GOLD = '#b08d3e' // worn brass/gold
export const MARKER_YELLOW = 'rgba(240,205,60,0.55)'
export const INK_BLUE = 'rgba(35,60,110,0.5)'
export const INK_RED = 'rgba(150,40,30,0.7)'
