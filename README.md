# livereel

Film a live web page as a directed short: a camera that leans and travels,
a light on the block that matters, a cursor that moves like a hand, captions
that come up word by word. The page is real — clicks, typing and its
server's answers happen in it — and every frame is shot on a clock of the
film's own, so a slow server costs the film nothing and a film shot twice
is the same film.

No video editor, no React: a film is a Python file of steps, shot in
Chromium through Playwright and made a video with ffmpeg.

## Quick start

```bash
uv sync
uv run playwright install chromium     # the browser a film is shot in; ffmpeg comes from your system
uv run livereel shoot examples/example_com.py --out out --sheet
```

`out/example_com.mp4` is the film; `out/example_com-sheet.png` holds a frame
a second, the whole film at a glance. `livereel still FILM --out DIR --at 6.5`
shoots one still instead, and `--draft` shoots at the frame's own size,
quicker and softer.

## A film

A film is a Python file that names `PRODUCTION`, a `Production`: the sizes
it is shot at, the page's address while it is served, the page's first
state, and the steps. `examples/example_com.py` is a whole one. Its steps
read like this:

```python
Play(
    seconds=1.1,
    moves=[
        Camera(onto=ENGLISH, air=80, zoom_at_most=2),
        LightOn(target=ENGLISH, within=Share(start=0.3)),
        CaptionIn(text="It exists to be an example", within=Share(start=0.4)),
    ],
    ease=ease_in_out_cubic,
),
hold(1.3),
*click(follow_the_link),
```

- `Play(seconds, moves, ease)` — so many seconds of frames; each move sets
  its part of the scene from how far along it is: `Camera`, `LightOn`,
  `LightTo`, `LightOff`, `CursorTo`, `Press`, `CaptionIn`, `CaptionOut`,
  `ScrollBy`, `ScrollTo`, `TypeIntoPage`, and a drawn agent's terminal with
  `TypeInTerminal` and `AgentWorks`.
- `Cut(change)` — the scene changed at once.
- `Act(action)` — the page acted on for real, between two frames.

## For agents

The `reel` skill, `skills/reel/SKILL.md`, teaches an agent to direct a
film: the story first, then a storyboard, then the steps, checked frame by
frame. Once the repository is published it installs as claude-review's
skill does, with `npx skills add`, or through the plugin marketplace.

## Development

See `CONTRIBUTING.md`.

## License

MIT
