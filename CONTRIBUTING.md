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
- `moves` — the moves of every prop (`camera.onto`, `light.to`, `cursor.click`) and of the page (`page.scrollTo`), a module each.
- `direction` — what a film is written in: a move's contract, steps (`play`, `cut`, `act`), the film itself, the page as a move reads it.
- `scene` — every prop's state at one moment, and what the stage is handed of it.
- `props` — each drawn part of the scene: its state, and what is worked out of it to draw.
- `domain` — time and curves, geometry, the camera's framing, a person's typing, the errors.

`stage/` is the page the film is shot on: the filmed page sits in its frame, and its script draws each frame from the scene, deciding nothing. It is JavaScript the type checker reads, published as it is written.

## The promo

The README opens on `docs/promo.gif`, livereel's own promo, `examples/livereel-promo.ts`, shot and made a GIF 960 pixels wide at 24 frames a second, its palette worked out for the film; at that width the terminal's text stays readable:

```bash
pnpm livereel shoot examples/livereel-promo.ts --out out/promo --sheet
ffmpeg -i out/promo/livereel-promo.mp4 -vf "fps=24,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" docs/promo.gif
```

The video itself goes on the release on GitHub: `gh release upload vX.Y.Z out/promo/livereel-promo.mp4`.

## Releasing

1. Set `version` in `package.json` and in `.claude-plugin/marketplace.json`, and move the changelog's unreleased entries under it, in one commit.
2. Tag it `vX.Y.Z` and push the tag: `.github/workflows/release.yml` checks the tag names the version, stages the package on npm with its provenance, and makes the release on GitHub. npm trusts the workflow itself (Trusted Publishing on the package's page, allowed to stage alone): no token is kept.
3. Approve the staged version on the package's page on npm, or `npm stage list livereel` and `npm stage approve <stage-id>`, with 2FA: only then is it published.
4. Put the promo's video on the release, as "The promo" above says.

`pnpm pack` builds the package into `dist/` and removes it after; CI shoots a film with the packed package on Node 22.20 on every push.
