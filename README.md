# Interactive 3D Book Portfolio

A single-page portfolio whose only element is one realistic, interactive 3D book.
No navigation bars, buttons, or UI chrome — every control is physically part of
the book: embossed logo, printed Index, page-edge turn zones, floating images.

Built with **React Three Fiber**, **@react-three/drei**, **GSAP**, **Zustand**, and **Vite**.
Page curl is a custom bent-mesh deformation driven by a vertex shader (injected
into the standard PBR material), not a physics engine and not a CSS flip.

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
| Click the closed book | Opens it |
| Double-click / double-tap the **outer 15% edge** of a page | Turns forward (right edge) or backward (left edge) |
| Double-click the **emblem stamped at the foot of any page** | Opens the book's own navigation (reaches every page) |
| Double-click an **Index entry** | Jumps to that section |
| Double-click **anywhere else on the book** | Picks it up / puts it down (putting down resets the view) |
| Drag while held | Rotates the book freely on all axes |
| Click / tap a **floating image** | Focuses it with its caption |
| Mouse wheel / pinch | Zoom (clamped) |
| `→` / `←` | Next / previous page |
| `R` | Reset orientation and zoom |
| `Esc` | Release a focused image, then close navigation |

Edge zones glow softly on hover so they are discoverable. They stay live while
the book is held — turning pages and holding are not mutually exclusive.

## Edit your content

All portfolio content lives in **one file**:

```
src/data/bookContent.js
```

- Structure: `section → pages → content blocks → images → navigation target`.
- Every page has a unique `id`; the Index and the logo navigation resolve pages
  through those ids — no component code changes needed.
- The Index always lists exactly the six sections (About Me, Skills, Projects,
  Certifications & Achievements, Experience / Learning Journey, Contact), each
  jumping to the section's first page. Extra pages inside a section are reached
  by turning or via the logo navigation.
- Image entries accept a `src` URL; while `src` is `null` (or fails to load) a
  clearly-labelled generated placeholder is shown — a broken asset never breaks
  the book.

> **Placeholders:** every value marked `[PLACEHOLDER — …]` is intentional stub
> content. No real portfolio information has been invented. Replace each marker
> with your own details.

## Project structure

```
src/
  data/
    bookContent.js      ← the only file you edit for content
    compileBook.js      ← flattens sections into physical faces/sheets
  store/useBookStore.js ← Zustand state (spread, held, nav, focus…)
  three/
    bendMaterial.js     ← vertex-shader page-curl deformation
    pageTexture.js      ← prints page content to canvas textures
    proceduralTextures.js ← leather, paper, edges, emblem, placeholders
    imageCache.js       ← graceful image preloading
  components/
    Book.jsx            ← physical model + interaction orchestration
    Cover.jsx  Spine.jsx  PageBlock.jsx  Page.jsx  TurningPage.jsx
    IndexPage.js        ← Index page layout + hit regions
    FloatingImage(s).jsx  BookNavigation.jsx
    Controls.jsx        ← camera, drag-rotate, zoom, keyboard, touch
    LoadingScreen.jsx
```
