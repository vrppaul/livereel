---
paths:
  - "examples/**"
---

# Films

A film is a TypeScript file whose default export is made by `defineFilm` (`src/direction/film.ts`). How a film is directed — story, storyboard, shots, checks — is the skill's, `skills/reel/SKILL.md`.

- A film is written as the package is: the same gates read it.
- A step's timing, framing and rhythm — `seconds`, `start`, `end`, `air`, `zoomAtMost`, a typing's `seed` and `pace` — are the film's script, given by keyword where they are used.
- Any other number is a constant named at the top. eslint holds both (`SCRIPT_KEYWORDS` in `eslint.config.js`).
- Every place on the page a film looks at is a named selector at the top of the file: a test id or a role where the page has one, never a class.
- A film is split into acts, a function each, that return their steps; `steps` only puts the acts in order.
- What changes at once is moves handed to `cut` (`cursor.hide()`, `screen.lower()`); what the page does is a named function handed to `act`.
- A film that serves its own page starts it in `serve` and stops it as what `serve` gave is disposed, and leaves nothing running when it ends.
- What the filmed page shows and its server answers — a change, a story, a server's reply — lives beside the film as data alone (`examples/livereel-promo/app/`).
- What the film itself says — its captions, the words typed, an agent's lines in the terminal — is written in the film, not in data beside it, so the film reads whole.
