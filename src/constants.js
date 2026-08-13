// Physical dimensions of the book (world units).
export const PAGE_W = 1.15 // page width (spine to fore-edge)
export const PAGE_H = 1.62 // page height
export const COVER_W = 1.21 // cover is slightly larger than pages
export const COVER_H = 1.7
export const COVER_T = 0.035 // cover board thickness
export const SHEET_T = 0.013 // visual thickness of one paper sheet

// Interaction
export const EDGE_ZONE = 0.15 // outer 15% of a page's width turns the page

// Canvas texture resolution for page faces (matches PAGE_W / PAGE_H ratio)
export const PAGE_TEX_W = 1024
export const PAGE_TEX_H = 1442

// Camera
export const CAMERA_DEFAULT_Z = 4.3
export const CAMERA_MIN_Z = 2.5
export const CAMERA_MAX_Z = 6.5

// Colors
export const INK = '#2a241c'
export const INK_SOFT = '#5d5344'
export const IVORY = '#f2e9d6'
export const IVORY_DEEP = '#e6dabf'
export const LEATHER = '#20283e' // dark navy book cloth / leather
export const GOLD = '#c9a659'
