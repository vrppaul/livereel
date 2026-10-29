---
paths:
  - "src/**/*.ts"
---

# The engine and the command line

How a module is built is said in its comment at the top. The stage has its own rules, `.claude/rules/stage.md`.

## TypeScript

- Strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; no `any`. A value read from outside — a file, a page, a command's output — is checked where it enters.
- A film runs with its types stripped: every function a film calls checks what it is handed, by its kind or its form (`src/domain/handed.ts`), before it uses it; a kind lives beside the type it checks.
- The curve's kind, `A_CURVE`, lives beside the timing that takes it (`src/direction/move.ts`), not beside `Ease`: `src/domain/time.ts` stands below the errors, which say a moment by it, and a kind there would close a loop of imports.
- Only syntax Node strips (`erasableSyntaxOnly`): no `enum`, no parameter properties; a class writes its fields out.
- A function an interface asks for is written as a property (`readonly begin: (beginning: Beginning) => Change`), so the compiler holds it to its parameter types; a class implements it with a method.
- A move is a plain object made by a function of its module in `src/moves/`, never a class; what a move keeps between frames (the keys pressed into the page) is a class of its own.
- A value made from another is a new value: `withProp(scene, name, state)`, `{ ...light, strength }`. Nothing in a scene is changed in place.
- A choice between kinds is a union with a `kind`, and a `switch` that names every kind: the compiler refuses a kind left out.
- Raise a `LivereelError` of the kind whose it is to put right (`src/domain/errors.ts`) where a person reads the message.

## Time and the frame

- A frame is a moment of the film, `shot / FRAMES_PER_SECOND` seconds in, whatever the browser took: nothing reads the wall clock.
- A move reads what it starts from once, as its share of its step begins, and becomes a change that knows its start and end; its prop at any progress follows from those and the progress alone.
- Two moves of one part — a prop, or the page — share a step only one after the other: `play` and `cut` refuse them at once, unless each sets values of the part the other does not (`Move.valueNames`), as two moves of the look may.
- A move that finds nothing to start from throws as it begins (`present` in `src/direction/move.ts`); nothing checks for it frame by frame.
- A cut is moves set at their end at once; a film changes the scene by moves alone.
- Only an act changes the page itself; a play changes the scene and, for the page's own scroll or keys, does what that frame wants done.
- The page's own motion stays stilled (reduced motion): every move in a film is the film's.
- What changes with time of itself — the spinner, the caret — is worked out from the moment in the prop's state module; the stage keeps no time.
- A function handed to the page runs there alone: it calls nothing of its module.

## The command line

- A command takes its options by name, each command its own, and refuses any other before anything is started.
- What a command says goes through `say`, to stdout.
- What a command warns of as it goes on, stopping nothing, goes through `warn`, to stderr; a part below the command line is handed `warn` as a parameter.
- What a command refuses, `main` writes to stderr; the exit code says whose it is to put right: 1 the film, 2 the command line or film file, 3 the machine, which lacks what a film is shot with (`SetupError`).
