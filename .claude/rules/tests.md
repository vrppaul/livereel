---
paths:
  - "tests/**/*.ts"
---

# Tests

- A test holds a behaviour someone can name: it does one thing and checks what came of it. Its name states that behaviour.
- It is written before its code and seen failing. A refactor gets no new test: the old ones pass unchanged.
- At the cheapest level that sees it: `tests/unit/` for what is worked out without a browser — curves, typing, framing, a move's change, a take run against stand-ins (`tests/unit/fakes.ts`).
- `tests/smoke/` shoots a film of a page on the disk, in a real browser, and checks which frames were kept or what reached the page: never what a frame of the film looks like.
- `tests/cli/` runs the command line as it is run: as a process, on a film file of its own.
- Never how a film looks: no colour, size or pixel read off a frame a film shot. A film's look is held by a person's eye, on its contact sheet.
- What ffmpeg works out of images the test made itself is read in numbers: three black exposures and a white one blend to a grey of 64. The arithmetic is the behaviour; no frame of a film is read.
- A test and its helpers hold no branch: no `if`, no conditional expression, no `||` or `??`, no `filter`. Cases of one rule are one test that names every case.
- Data with a shape is typed, in tests too.
- The tests are held to formatting alone: no linter, type checker or spelling check reads them.
