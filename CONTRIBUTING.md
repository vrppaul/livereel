# Contributing

## Setup

```bash
pnpm install
pnpm livereel setup
uvx pre-commit install --hook-type pre-commit --hook-type commit-msg
```

Development runs on Node 24, which runs the source as it stands. ffmpeg comes from the system, and so does uv, which runs pre-commit (`uvx`). pre-commit runs the gates, and makes Python environments of its own for those that are not the project's commands; the instruction files' gate needs Python 3.14.

## Development

```bash
pnpm test                          # unit, a film shot in a real browser, the command line as a process
uvx pre-commit run --all-files     # every gate
pnpm livereel shoot examples/example-com.ts --format square --out out/example --sheet
```

The rules every change is held to are in `AGENTS.md`, and those of each area under `.claude/rules/`.

## Conventions

- Commits follow Conventional Commits; the `commit-msg` hook checks them.
- What changed goes in `CHANGELOG.md`; what is planned, in `TODO.md`.

## Architecture

`src/` is layered, each part building only on those after it, which eslint holds (`LAYERS` in `eslint.config.js`):

- `cli` — the command line: load a film file, shoot it whole or one still, set a machine up.
- `adapters` — Chromium with the stage and the filmed page (`browser/`), ffmpeg making the MP4's picture as frames come, a frame's exposures blended, the sounds laid under it, and each other kind of video made from it (`video/`).
- `studio` — a take: the steps run frame by frame on the film's clock, the scene held, frames handed to footage, several exposures of each the camera crosses fast, and sounds to a track.
- `moves` — the moves of every prop (`camera.onto`, `light.to`, `cursor.click`) and of the page (`page.scrollTo`), a module each.
- `direction` — what a film is written in: a move's contract, steps (`play`, `cut`, `act`), the film itself, the page as a move reads it.
- `scene` — every prop's state at one moment, and what the stage is handed of it.
- `props` — each drawn part of the scene: its state, and what is worked out of it to draw.
- `domain` — time and curves, geometry, the camera's framing and what it shows where, the shutter, a person's typing, the errors.

`stage/` is the page the film is shot on: the filmed page sits in its frame, and its script draws each frame from the scene, deciding nothing. It is JavaScript the type checker reads, published as it is written.

## The promo

The README opens on livereel's own promo, `examples/livereel-promo.ts`, shot wide, as a video with its sound. GitHub plays a video only from its own uploads: drag the MP4 into the README's editor on github.com, which uploads it and writes its `user-attachments` address; put that address alone on its line in the README, and leave the browser's edit unsaved. Shot square, the promo is for a feed. The two formats shoot at once, each in a terminal of its own:

```bash
pnpm livereel shoot examples/livereel-promo.ts --format wide --out out/promo --sheet --renderer gpu
pnpm livereel shoot examples/livereel-promo.ts --format square --out out/promo --sheet --renderer gpu
```

The video goes on the release on GitHub as well: `gh release upload vX.Y.Z out/promo/livereel-promo-wide.mp4`.

## Releasing

1. Set `version` in `package.json` and in `.claude-plugin/marketplace.json`, and move the changelog's unreleased entries under it, in one commit.
2. Tag it `vX.Y.Z` and push the tag: `.github/workflows/release.yml` checks the tag names the version, stages the package on npm with its provenance, and makes the release on GitHub as a draft. npm trusts the workflow itself (Trusted Publishing on the package's page, allowed to stage alone): no token is kept.
3. Approve the staged version on the package's page on npm, or `npm stage list livereel` and `npm stage approve <stage-id>` (npm 11.21 or later; `npx npm@11.21.1 stage …` where the system's npm is older), with 2FA: only then is it published.
4. Put the promo's video on the draft release, as "The promo" above says, and publish the release: `gh release edit vX.Y.Z --draft=false`.

`pnpm pack` builds the package into `dist/` and removes it after; CI shoots a film with the packed package on Node 22.20 on every push to main and every pull request.
