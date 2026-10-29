---
paths:
  - "stage/*"
---

# The stage

`stage/stage.html` lays out the stage, `stage/stage.css` gives every prop its look, and `stage/stage.js` answers the browser adapter under `window.stage` (`StageApi` in `src/adapters/browser/stage.ts`).
The script is JavaScript with its types in JSDoc, which the type checker reads; the page runs it as it is written.

- The stage draws the scene as `src/scene.ts` hands it over, and decides nothing: what is shown, where and how far along is the film's.
- Every prop has its drawer in `DRAWERS` of `stage/stage.js`; the type checker refuses a prop without one.
- A drawer finds its elements once, by the `data-prop` of its root and the `data-part` of each element under it.
- A drawer sets its prop's numbers, and the colours a film gives, as bare custom properties, and writes its words; the stylesheet gives the numbers their units and makes them places, sizes and shades. The script writes no style.
- What a drawer is handed by name it names in a class or an attribute: a piece's styles, a title's or a callout's `data-side`.
- Nothing on the stage moves of itself: no transition, animation or keyframes in its styles (stylelint refuses them), no timer or clock in its script (eslint refuses them). Every frame is set whole by `apply`.
- A colour, a shadow or a gradient is a token in `stage/tokens.css`; the stylesheet names tokens (stylelint refuses one written elsewhere).
- What lies over the page — the title, the caption, the terminal, the ending — takes no pointer event: the page is clicked through it.
- What the browser draws wrongly on a moved screen is not used: `backdrop-filter` mirrors what lies under it there, so the light dims and never blurs.
