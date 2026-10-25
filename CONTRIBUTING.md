# Contributing

## Setup

```bash
uv sync
uv run playwright install chromium
uv run pre-commit install --hook-type pre-commit --hook-type commit-msg
```

ffmpeg comes from the system. Node is needed for one hook: Biome, run through `npx`, lints the stage.

## Development

```bash
uv run pytest tests                  # unit, the gates' own tests, and a film shot in a real browser
uv run pre-commit run --all-files    # every gate
uv run livereel shoot examples/example_com.py --out out/example --sheet
```

The rules every change is held to are in `AGENTS.md`, and those of each area under `.claude/rules/`.

## Conventions

- Commits follow Conventional Commits; the `commit-msg` hook checks them.
- What changed goes in `CHANGELOG.md`; what is planned, in `TODO.md`.

## Architecture

`src/livereel/` is layered, each module building only on those after it, which import-linter holds:

- `cli` — the command line: shoot a film file, whole or one still.
- `studio` — a `Production` put on the stage in a browser and shot; the frames made a video.
- `steps` — what a film is a list of: `Play`, `Cut`, `Act`.
- `moves` — the parts of a scene that change: camera, light, cursor, captions, the page's scroll and keys, a drawn terminal.
- `film` — the film being shot: the stage, the page, the scene, which frames are kept.
- `framing`, `keys` — where the camera stands for a block; how a person types.
- `scene`, `geometry`, `easing` — what a frame is made of, and how a move speeds up and settles.

`src/livereel/stage/` is the page the film is shot on: the page being filmed sits in its frame, and its script draws each frame from the scene, deciding nothing.

## Releasing

Not yet published. When it is: bump `version` in `pyproject.toml` and the plugin's, move the changelog's unreleased entries under the version, tag `vX.Y.Z`.
