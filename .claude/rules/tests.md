---
paths:
  - "tests/**/*.ts"
---

# Tests

- A test holds a behaviour someone can name: it does one thing and checks what came of it. Its name states that behaviour.
- It is written before its code and seen failing. A refactor gets no new test: the old ones pass unchanged.
- At the cheapest level that sees it: `tests/unit/` for what is worked out without a browser — curves, typing, framing, a move's change, a take run against stand-ins (`tests/unit/fakes.ts`).
- `tests/smoke/` shoots a film of a page on the disk, in a real browser, and checks which frames were kept or what reached the page: never what a frame looks like.
- `tests/cli/` runs the command line as it is run: as a process, on a film file of its own.
- Never how it looks: no colour, size or pixel read off a frame. A film's look is held by a person's eye, on its contact sheet.
- A test and its helpers hold no branch: no `if`, no conditional expression, no `||` or `??`, no `filter`. Cases of one rule are one test that names every case.
- Data with a shape is typed, in tests too.
- The tests are held to formatting alone: no linter, type checker or spelling check reads them.
