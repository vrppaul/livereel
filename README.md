# livereel

Film a live web page as a directed short: a camera that leans and travels,
a light on the block that matters, a cursor that moves like a hand, captions
that come up word by word. The page is real — clicks, typing and its
server's answers happen in it — and every frame is shot on a clock of the
film's own, so a slow server costs the film nothing and a film shot twice
is the same film.

No video editor, no React: a film is a TypeScript file of steps, shot in
Chromium through Playwright and made a video with ffmpeg as it is shot.

## Quick start

livereel needs Node 22.20 or later, and ffmpeg on the path.

```bash
npm i -D livereel
npx livereel setup                                  # the browser a film is shot in; checks ffmpeg
npx livereel shoot film.ts --out out --sheet
```

`out/film.mp4` is the film; `out/film-sheet.png` holds a frame a second,
the whole film at a glance. `livereel still FILM --out DIR --at 6.5` shoots
one still instead, and `--draft` shoots at the frame's own size, quicker
and softer.

## A film

A film's default export is `defineFilm`: the sizes it is shot at, how its
page is served, the page's first state, and the steps.
`examples/example-com.ts` is a whole one. Its steps read like this:

```ts
play({
	seconds: 1.1,
	moves: [
		camera.onto(ENGLISH, { air: 80, zoomAtMost: 2 }),
		light.on(ENGLISH, { within: { start: 0.3 } }),
		caption.hide({ within: { end: 0.3 } }),
		caption.show('It exists to be an example', { within: { start: 0.4 } })
	],
	ease: easeInOutCubic
}),
hold({ seconds: 1.3 }),
...cursor.click(followTheLink),
```

- `play({ seconds, moves, ease })` — so many seconds of frames; each move
  sets its prop of the scene over its share of the step: `camera`,
  `screen`, `light`, `cursor`, `caption`, `ending`, a drawn agent's
  `terminal`, and the `page`'s own scroll and keys.
- `cut(change)` — the scene changed at once.
- `act(action)` — the page acted on for real, between two frames.

## For agents

The `reel` skill, `skills/reel/SKILL.md`, teaches an agent to direct a
film: the story first, then a storyboard, then the steps, checked frame by
frame. Once the repository is published it installs with `npx skills add`,
or through the plugin marketplace.

## Development

See `CONTRIBUTING.md`.

## License

MIT
