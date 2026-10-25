# Contributing

## Setup

```bash
pnpm install
pnpm livereel setup
uvx pre-commit install --hook-type pre-commit --hook-type commit-msg
```

Development runs on Node 24, which runs the source as it stands. ffmpeg comes from the system. pre-commit runs the gates, two of them in Python environments it makes itself.

## Development

```bash
pnpm test                          # unit, a film shot in a real browser, the command line as a process
uvx pre-commit run --all-files     # every gate
pnpm livereel shoot examples/example-com.ts --out out/example --sheet
```

The rules every change is held to are in `AGENTS.md`, and those of each area under `.claude/rules/`.

## Conventions

- Commits follow Conventional Commits; the `commit-msg` hook checks them.
- What changed goes in `CHANGELOG.md`; what is planned, in `TODO.md`.

## Architecture

`src/` is layered, each part building only on those after it, which eslint holds (`LAYERS` in `eslint.config.js`):

- `cli` — the command line: load a film file, shoot it whole or one still, set a machine up.
- `adapters` — Chromium with the stage and the filmed page (`browser/`), ffmpeg making the video as frames come (`video/`).
- `studio` — a take: the steps run frame by frame on the film's clock, the scene held, frames handed to footage.
- `direction` — what a film is written in: moves, steps (`play`, `cut`, `act`), the film itself.
- `props/<prop>/` — each drawn part of the scene: its state, its moves, its drawer on the stage and its styles.
- `page` — the page's own scroll and keys.
- `scene` — every prop's state at one moment, and what the stage is handed of it.
- `domain` — time and curves, geometry, the camera's framing, a person's typing, the errors.

`src/stage/` is the page the film is shot on: the filmed page sits in its frame, and its script draws each frame from the scene, deciding nothing.

## Releasing

Not yet published. When it is: bump `version` in `package.json` and in the marketplace's entry, move the changelog's unreleased entries under the version, tag `vX.Y.Z`; `pnpm pack` builds the package into `dist/` and removes it after.
