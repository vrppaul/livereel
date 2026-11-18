---
paths:
  - "src/**"
  - "stage/**"
  - "eslint.config.js"
---

# The layers

The order of the parts is in `AGENTS.md`, under Layers.

- What a film is made of is worked out without a browser and without Node: `domain`, `props`, `scene`, `moves` and `studio` import neither Playwright nor Node's own modules and read no wall clock; `direction` takes their types alone.
- The moves of every prop and of the page (`src/moves/`) build on `direction`; the package's entry (`src/index.ts`) on the moves and what a film is written with.
- A part imports another by its relative path, to its `.ts` file; the package never imports itself by its name. eslint refuses an import against these (`LAYERS` in `eslint.config.js`).
- The stage, `stage/`, holds the pages a film is shot with: JavaScript the type checker reads, published and run as it is written.
