---
paths:
  - "src/stage/*"
  - "src/props/*/draw.ts"
  - "src/props/*/*.css"
---

# The stage

`src/stage/stage.html` lays out the stage, and `src/stage/main.ts` answers the browser adapter under `window.stage` (`src/stage/contract.ts`).
Each prop's drawer, `src/props/*/draw.ts`, draws its prop from what it is handed. esbuild bundles them into one script and one stylesheet.

- The stage draws the scene as `src/scene.ts` hands it over, and decides nothing: what is shown, where and how far along is the film's.
- Every prop has its drawer in `src/stage/drawers.ts`; the compiler refuses a prop without one.
- A drawer finds its elements once, by the `data-prop` of its root and the `data-part` of each element under it.
- Nothing on the stage moves of itself: no transition, animation or keyframes in its styles (stylelint refuses them), no timer in its script. Every frame is set whole by `apply`.
- A colour, a shadow or a gradient is a token in `src/stage/tokens.css`; every other stylesheet names tokens (stylelint refuses a colour written elsewhere).
- What lies over the page — the caption, the terminal, the ending — takes no pointer event: the page is clicked through it.
- What the browser draws wrongly on a moved screen is not used: `backdrop-filter` mirrors what lies under it there, so the light dims and never blurs.
