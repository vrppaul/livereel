---
paths:
  - "tests/**/*.ts"
---

# Tests

- A test holds a behaviour someone can name: it does one thing and checks what came of it. Its name states that behaviour.
- It is written before its code and seen failing. A refactor gets no new test: the old ones pass unchanged.
- At the cheapest level that sees it: `tests/unit/` for what is worked out without a browser — curves, typing, framing, a move's change, a take run against stand-ins (`tests/unit/fakes.ts`).
- `tests/smoke/` runs what the unit tests stand in for: a film shot in a real browser, of a page on the disk or an app with a server of its own, and the system's ffmpeg making the video.
- A smoke test checks which frames were kept or what reached the page: never what a frame of the film looks like.
- `tests/cli/` runs the command line as it is run: as a process, on a film file of its own.
- Never how a film looks: no colour, pixel or place read off a frame a film shot. A film's look is held by a person's eye, on its contact sheet; the video's frame size and count are what was asked of it, and are read.
- What ffmpeg works out of images the test made itself, as exposures blended, is read in numbers: the arithmetic is the behaviour, and no frame of a film is read.
- A test and its helpers hold no branch: no `if`, no conditional expression, no `||` or `??`, no `filter`. Cases of one rule are one test that names every case.
- Data with a shape is typed, in tests too.
- The tests are held to formatting alone: no linter, type checker or spelling check reads them.
