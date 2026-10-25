---
paths:
  - "src/livereel/stage/*"
---

# The stage

`src/livereel/stage/stage.html` lays out the stage, `src/livereel/stage/stage.css` styles it, and `src/livereel/stage/stage.js` draws each frame from the scene it is handed.

- The stage draws the scene as `src/livereel/scene.py` hands it over, and decides nothing: what is shown, where and how far along is the film's.
- Nothing on the stage moves of itself: no transition, animation or keyframes in its styles (the `stage-still` hook refuses them), no timer in its script. Every frame is set whole by `apply`.
- A colour is a token on `:root`; a number with a meaning in the script is a named constant at its top.
- What lies over the page — the caption, the terminal, the ending — takes no pointer event: the page is clicked through it.
- What the browser draws wrongly on a moved screen is not used: `backdrop-filter` mirrors what lies under it there, so the light dims and never blurs.
- Biome lints and formats the script and the styles (`biome.json`); its formatting is the one written.
