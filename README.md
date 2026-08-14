# The Adventure Book — Interactive 3D Portfolio

A single-page portfolio that is one enormous, ancient, slightly unhinged
adventure book — part explorer journal, part hacker's notebook — alive on a
desk in the gloom. No navigation bars, no buttons, no UI chrome: every
control is physically part of the book (embossed compass seal, printed
INDEX, page-edge turn zones, photographs slapped onto the parchment).

Built with **React Three Fiber**, **@react-three/drei**, **GSAP**, **Zustand**, and **Vite**.
Page curl is a custom bent-mesh deformation driven by a vertex shader (with
in-flight flutter), not a physics engine and not a CSS flip. All textures —
worn leather, aged parchment, stains, doodles, stamps, gears, paper scraps —
are generated procedurally at runtime; the repo ships zero binary assets.

**The damage is real geometry.** Every sheet has deckled (irregular) edges,
and designated sheets carry genuine corner tears and edge bites: the torn
region is missing from the mesh silhouette itself (raycasts pass through it,
the sheet below shows through), with a lifted fiber fringe and painted paper
thickness along the rip — on the resting page AND while that same sheet
turns. Photos, taped documents and the coin artifact float physically above
the parchment and cast soft drop shadows onto it. The book rests on an
explorer's desk: maps, letters, compass, magnifying glass, ink bottle,
pencils, coins, and a candle whose light actually flickers.

---

## Run the project

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev
# → open the printed local URL (usually http://localhost:5173)

# production build + preview
npm run build
npm run preview
```

Requires Node.js 18+.

## How to use the book

| Interaction | Effect |
|---|---|
| Click the closed book | The cover opens with weight |
| Double-click / double-tap the **outer 15% edge** of a page | Turns it — right edge forward (right page bends to the left), left edge backward |
| Double-click the **✦ compass seal** at the foot of any page | Opens the Map of the Book (reaches every page) |
| Double-click an **INDEX entry** | Rapidly but visibly turns pages to that section |
| Double-click **anywhere else on the book** | Picks it up / puts it down (putting down resets the view) |
| Drag while held | Rotates the book freely on all axes |
| **Hold + drag a photograph** | Pick it up and place it anywhere on the spread — it stays where you leave it, page after page |
| Double-click the **red ribbon** or the **spine** (or `C`) | Closes the book — it remembers your spread and reopens there |
| Click / tap a **photograph** | It jumps up to meet you, caption and all |
| Single-click the book | It flinches. Books are ticklish |
| Mouse wheel / pinch | Zoom (clamped) |
| `→` / `←` | Next / previous page |
| `R` | Reset orientation and zoom |
| `M` | Mute the paper (all sounds are synthesized WebAudio foley — no audio files) |
| `Esc` | Release a focused photo, then close the map |
| Click the **compass** on the About pages | The needle spins |
| Click a **section stamp** | It stamps itself again |
| A certain button that says **DO NOT PRESS** | Absolutely nothing. Definitely don't try it |

Edge zones glow softly on hover. They stay live while the book is held.

## Edit your content

All portfolio content lives in **one file**:

```
src/data/bookContent.js
```

- Structure: `section → pages → content blocks → images → navigation target`.
- Every page has a unique `id`; the INDEX and the compass-seal map resolve
  pages through those ids — no component code changes needed.
- The INDEX lists ten sections (About Me, Skills, Experience, Projects,
  Certifications, Achievements, Field Reports, Education, Fun Zone, Contact
  Me) plus The End, each jumping to that section's first page. Deeper pages
  are reached by turning or via the map.
- The **Projects** and **Field Reports** sections are populated with real
  repositories from github.com/hari-107; every description is drawn from the
  repos' own READMEs. Project screenshots are labelled placeholders — set an
  image `src` in bookContent.js to drop in a real screenshot.
- Each section has a `theme` that drives its hand-drawn personality:
  `explorer`, `inventor`, `journal`, `blueprint`, `stamps`, `treasure`,
  `reports`, `scholar`, `chaos`, `letter`.
- Image entries accept a `src` URL; while `src` is `null` (or fails to load)
  a labelled polaroid placeholder is drawn — a broken asset never breaks the
  book.

> **Placeholders:** every value marked `[PLACEHOLDER — …]` is intentional
> stub content. No real portfolio information has been invented. Replace each
> marker with your own details. (The owner name and title-page wording come
> from the project owner's mockup.)

## Fonts

Display/stencil face: **Base 02** by Zone Erogene, embedded verbatim as a
data-URI stylesheet (`src/base02-font.css`). Free for personal,
non-commercial use — see `public/fonts/Base02-LICENSE-Readme.txt` (the author
asks for a donation for commercial use and an email for redistribution).
Supporting faces via Google Fonts: Special Elite (typewriter), Caveat
(handwriting), IM Fell English (old book), Rye (fallback).

## Project structure

```
src/
  data/
    bookContent.js      ← the only file you edit for content
    compileBook.js      ← flattens sections into physical faces/sheets
  store/useBookStore.js ← Zustand state (spread, held, nav, focus, egg…)
  three/
    bendMaterial.js     ← vertex-shader page curl + flutter
    pageTexture.js      ← prints aged-parchment pages (stains, doodles, themes)
    proceduralTextures.js ← leather, paper, scraps, gears, words, wood, polaroids
    imageCache.js       ← graceful image preloading
  components/
    Book.jsx            ← physical model + interaction orchestration
    Cover.jsx  Spine.jsx  PageBlock.jsx  Page.jsx  TurningPage.jsx
    IndexPage.js        ← the 10-entry INDEX layout + hit regions
    FloatingImage(s).jsx  FocusedPhoto.jsx  BookNavigation.jsx
    BackgroundWorld.jsx ← dust, sparks, flying papers, glow words, gears, desk
    Controls.jsx        ← close-up camera, parallax, drag-rotate, zoom, keys
    LoadingScreen.jsx
```
