import { create } from 'zustand'

/**
 * Global interaction state. 3D components read from here; the Book component
 * registers an imperative `api` for actions that drive animations
 * (opening, turning, jumping) so keyboard / navigation / index handlers can
 * trigger them without prop-drilling.
 */
// Hidden deep link: opening /#spread=N makes the book open straight to that
// spread (it riffles there physically, same as the close/reopen memory).
const initialSpread = (() => {
  try {
    const m = /spread=(\d+)/.exec(window.location.hash)
    return m ? Math.max(0, parseInt(m[1], 10)) : 0
  } catch {
    return 0
  }
})()

export const useBookStore = create((set, get) => ({
  // Lifecycle
  phase: 'loading', // 'loading' | 'ready'
  setPhase: (phase) => set({ phase }),

  // Book state
  isOpen: false,
  opening: false,
  closing: false,
  spread: 0, // number of sheets turned (0..SHEET_COUNT)
  lastSpread: initialSpread, // remembered across close/reopen (seeded by #spread=N)
  turning: false,

  // A photograph is being dragged — photo interaction takes priority
  photoDrag: false,
  setPhotoDrag: (photoDrag) => set({ photoDrag }),
  setClosing: (closing) => set({ closing }),
  setLastSpread: (lastSpread) => set({ lastSpread }),

  // Held / rotating state
  held: false,

  // Overlays
  navOpen: false,
  focusedImage: null, // image id or null

  // Incremented to request a view reset (orientation + zoom)
  resetToken: 0,

  // Incremented when the Fun Zone easter egg fires (background burst + book wobble)
  eggToken: 0,
  triggerEgg: () => set((s) => ({ eggToken: s.eggToken + 1 })),

  // Imperative animation API, registered by <Book/>
  api: null,
  registerApi: (api) => set({ api }),

  setOpen: (isOpen) => set({ isOpen }),
  setOpening: (opening) => set({ opening }),
  setSpread: (spread) => set({ spread }),
  setTurning: (turning) => set({ turning }),
  setNavOpen: (navOpen) => set({ navOpen }),
  focusImage: (id) => set({ focusedImage: id }),

  pickUp: () => set({ held: true }),
  putDown: () => set((s) => ({ held: false, resetToken: s.resetToken + 1 })),
  requestReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),

  /** Esc semantics: release focused image first, then close navigation. */
  escape: () => {
    const s = get()
    if (s.focusedImage) return set({ focusedImage: null })
    if (s.navOpen) return set({ navOpen: false })
  },
}))
