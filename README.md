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

livereel is not on npm yet: until it is, install it from a packed copy of
this repository (`pnpm pack`, then `npm i -D ./livereel-0.1.0.tgz`). It
needs Node 22.20 or later, and ffmpeg on the path. A film is an ES module:
the project's `package.json` says `"type": "module"`.

```bash
npm i -D livereel
npx livereel setup                                  # the browser a film is shot in; checks ffmpeg
npx livereel shoot film.ts --out out --sheet
```

`film.ts`, a whole film of a page on the web:

```ts
import { atAddress, camera, caption, defineFilm, hold, light, play } from 'livereel';

// The line that says what the page is for
const LINE = 'p[lang=en]';

export default defineFilm({
	format: { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } },
	serve: () => Promise.resolve(atAddress('https://example.com/')),
	ready: (context) => context.page.locator(LINE).waitFor(),
	steps: () => [
		play({ seconds: 1.2, moves: [camera.onto(LINE, { air: 120 }), light.on(LINE), caption.show('A page, filmed')] }),
		hold({ seconds: 1.5 })
	]
});
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
- `cut(...moves)` — moves made at once, between two frames:
  `cut(cursor.hide())`, `cut(terminal.open(title), screen.lower())`.
- `act(action)` — the page acted on for real, between two frames.

## For agents

The `reel` skill, `skills/reel/SKILL.md`, teaches an agent to direct a
film: the story first, then a storyboard, then the steps, checked frame by
frame. Once the repository is published it installs with `npx skills add`,
or as a plugin: `/plugin marketplace add` with the repository, then
`/plugin install livereel@livereel-marketplace`.

## Development

See `CONTRIBUTING.md`.

## License

MIT
