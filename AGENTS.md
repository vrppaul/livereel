# livereel

Film a live web page: a camera, a light, a cursor and captions over it, frame by frame, on a clock of the film's own.

## Commands

```bash
pnpm install                                              # dependencies
pnpm livereel setup                                       # the browser films are shot in; ffmpeg is the system's
pnpm test                                                 # the tests: unit, a film in a browser, the command line
uvx pre-commit run --all-files                            # every gate a commit runs, over every file
pnpm livereel shoot examples/example-com.ts --format square --out out/example --sheet   # shoot a film
pnpm livereel still examples/example-com.ts --format square --out out/example --at 6.5  # one still of it
```

- The gates are one list, `.pre-commit-config.yaml`, each with its command. A hook that cannot run fails: leave one out only on purpose, by naming it in `SKIP`.
- Develop on Node 24: the source runs as it stands (`node -C source`). The package built for Node 22.20 and later is made by `pnpm pack`.
- Add a dependency with `pnpm add` or `pnpm add -D` and no version: never a hand edit of a dependency list. ffmpeg is the system's.

## How we work

- **Talk short.** A few lines to the owner; details only when asked.
- **Small chunks.** One concept at a time, read in one sitting, working and checked by itself. Never a run through a plan of several phases.
- **Step back first.** Planner, author and reviewer each say first what the piece is for, which whole it serves, whether it is worth doing, why each part it lives in exists and why nothing simpler does.
- A part with no reason that holds is a finding, however old. A why you cannot answer is a question to the owner, never code.
- **Each hands over:** a planner a step and its place in the whole; an author the change and ten lines at most: what, why, how checked, how long, where to look; a reviewer a verdict and its findings.
- **Understand before writing.** No code without full understanding of what exists and where the change belongs.
- **Tests hold behaviour.** A behaviour someone can name gets a test first, at the cheapest level; a look, a refactor or a declaration gets none.
- **Review before presenting.** Read every changed file: the right layer? redundant work? the non-obvious commented? every line needed?
- **A film is looked at.** A change to what a film shows is checked on its contact sheet (`--sheet`) and on each new shot at full size (`still --at`); the last look at the moving film is a person's.
- **Speed is measured.** Say with each piece how long it took and what its slowest step was. A shoot's time is read off `--profile`, before a change and after it: a time claimed is one a profile printed.
- **Weigh, then decide** a dependency, the architecture or what a scene is made of (`src/scene.ts`): name the ways weighed; ask only where none is clearly best.
- Never commit secrets or credentials.
- A commit follows Conventional Commits, `type(scope): description`.
- Planned work is tracked in `TODO.md`, where an item done is removed, not ticked off; what changed, in `CHANGELOG.md`.

## Layers

- `cli` → `adapters` → `studio` → `direction` → `scene` → `props` → `domain`, the parts of `src/`: each builds only on those after it. A part is a folder, or a file of its own (`src/scene.ts`).

## Rules for all code

- A function does one thing; no method does everything.
- A name says what it holds, in whole words: `focusX`, `typed`, `shot`, never `x`, `t`, `i`.
- No literal with a meaning in an expression: a number, a colour, a time or a selector is a named constant, or data a film holds.
- No function inside a function: a helper is a function of its module. A one-line lambda passed to a call is allowed.
- Dependencies are explicit — a constructor's parameters, a function's — so each part is tested by itself.
- A parameter every caller must give has no default, which would hide a missing value. One whose absence is a valid state may have one.
- No alias or shim kept for an old name: whoever imports it is changed.
- Shared code comes with its second user, not before; once there are two, it is written once.
- No function only passes its call on, fixed arguments or none, unless it names a notion its call lacks or hides real work; shorter to write is no reason.

## Only better

Every change leaves the repository better than it found it: cleaner, easier to read, more modular, its architecture more fitting. In every part it touches, not on balance. A change that only works is not done.

- **Construction first.** Before code, settle who owns each state and for how long, which layer it lives in, and the contract. Build nothing nobody asked for.
- **Simplest first.** Build the simplest thing that works. A new state, move, step, gate or module says why nothing simpler does; a reviewer's fix is a proposal.
- **Root cause first.** Before a fix, say why the fault can happen and change that construction. A flag, guard or filter hiding a wrong value is a symptom fix: it needs a reason.
- **Show it with facts, not adjectives.** Say what a reader can check.
- **The verdict is somebody else's.** A chunk is done when an independent reviewer has measured its whole diff against this rule and listed every place that got worse.
- **A regression found becomes a gate** a tool here enforces at the commit, not a test; a gate of our own is built only on the owner's word.
- **What you can name as worse is not committed.** Fix it, or stop and ask.

## Rules by area

Before you change or review code in an area, read its file whole; a brief to another agent names the files.

- `.claude/rules/engine.md` — anything under `src/` but the stage: TypeScript, the scene, moves and steps, time, the command line.
- `.claude/rules/layers.md` — an import between the parts of `src/`, or of the stage.
- `.claude/rules/stage.md` — the stage, `stage/`: what it draws and how.
- `.claude/rules/films.md` — a film, under `examples/`: how one is written.
- `.claude/rules/tests.md` — any test, under `tests/`.
- `.claude/rules/scripts.md` — anything under `scripts/`: the gates of our own.
- `.claude/rules/prose.md` — comments, docstrings, documents, commit messages, reports.
- `.claude/rules/instructions.md` — this file and the rules of each area.
- `skills/reel/SKILL.md` — how an agent directs a film: read it before writing one.
