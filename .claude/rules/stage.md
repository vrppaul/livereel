---
paths:
  - "stage/*"
---

# The stage

`stage/stage.html` lays out the stage, `stage/stage.css` gives every prop its look, and `stage/stage.js` answers the browser adapter and the room under `window.stage` (`StageApi` in `src/adapters/browser/stage.ts`).
The script is JavaScript with its types in JSDoc, which the type checker reads; the page runs it as it is written.
Beside it, `stage/set.html`, `stage/set.css` and `stage/set.js` are the page a film's set is shown on, in the filmed page's tab: one state's picture at a time, answering under `window.filmSet` (`SetApi` in `src/adapters/browser/set.ts`).

- The stage draws the scene as `src/scene.ts` hands it over, and decides nothing: what is shown, where and how far along is the film's.
- Every prop has its drawer in each exposure of `stage/stage.js` (`exposureOf`), the look in `LOOK`, one for every exposure; the type checker refuses a prop without one.
- The world's light and glow have no drawer: the room alone draws them (`stage/room.js`, `stage/lighting.js`); its grain is drawn on both stages by `WorldDrawer`.
- Nor have the window's body, a piece's body with the shadow it casts, and the pit a piece's hole sinks into the page: the room alone draws them (`stage/body.js`, `stage/piece-body.js`); flat draws the hole in its ground.
- A drawer finds its elements once, by the `data-prop` of its root, one in each surface its prop stands in, and the `data-part` of each element under it; the look's drawer draws on the stage's root, where every rule reads it.
- But the block a film types into on a page of its own is found by the film's CSS selector in that page's document, each time it is written (`typedBlockOf`).
- A drawer sets its prop's numbers, and the colours a film gives or the engine reads off the page (a hole's ground), as bare custom properties, and writes its words; the stylesheet makes the numbers places, sizes and shades.
- The grain's strength alone is set as attributes, the weights of its SVG filter, which CSS cannot set.
- The script writes no style, but for pictures, each set whole as a `url()` custom property: the page's on the stage's root, one a piece or a sweep holds, or a film's own, on its element; CSS takes no address out of one.
- A script reads a token back only where the room draws by it: how far past its box a surface of markup reaches (`--reach-past-the-box`), and the screen's ground under the page's picture.
- What a drawer is handed by name it names in a class or an attribute: a piece's styles, a callout's `data-side`, a title's `data-align` and `data-words-down`.
- Nothing on the stage moves of itself: no transition, animation or keyframes in its styles (stylelint refuses them), no timer or clock in its script (eslint refuses them). Every frame is set whole by `apply`.
- A colour, a shadow or a gradient is a token; the stylesheet names tokens (stylelint refuses one written elsewhere).
- An object's figure stands in a part of its own, `way`, which a way of livereel's is drawn on: its transform, opacity and cut are the way's, and a rule that lays it out by its class sets none of them (stylelint refuses one).
- A value of the film's look is set on the root every frame (`LookDrawer`); every other token, and what follows from the look, is in `stage/tokens.css`.
- What lies over the page — the title, the caption, the terminal, the ending — takes no pointer event: the page is clicked through it.
- What the browser draws wrongly on a moved screen is not used: `backdrop-filter` mirrors what lies under it there, so the light dims and never blurs.
