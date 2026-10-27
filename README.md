# livereel

[![CI](https://github.com/vrppaul/livereel/actions/workflows/ci.yml/badge.svg)](https://github.com/vrppaul/livereel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/livereel)](https://www.npmjs.com/package/livereel)
[![Node](https://img.shields.io/node/v/livereel)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

https://github.com/user-attachments/assets/90a9e558-4e24-42bc-8d82-b0d30c2dc9ac

Film your live web app as a directed short: a camera that leans and
travels, a light on the block that matters, a cursor that moves like a
hand, captions that come up word by word. The app is real — clicks, typing
and its server's answers happen in it — and every frame is shot on a clock
of the film's own, so a slow server costs the film nothing.

A film is a TypeScript file of steps. An agent writes it for you: livereel
comes with a skill that teaches Claude Code to direct one.

## Why not a screen recording

- **The film keeps its own time.** A frame is a moment of the film, however
  long the browser took to draw it: waits, slow answers and loading vanish,
  and the camera moves as smoothly at 30 frames a second as it was written.
  Where it moves fast, a frame is shot several times along its way and
  blended, as a film camera's open shutter blurs what moves.
- **The page is live.** livereel films the app itself, in Chromium, not a
  copy of it: a click is a real click and a reply is the server's.
- **It is directed, not cut.** The camera frames a block by its selector,
  the light follows what the caption talks about, and the film is written
  in a director's words: `camera.onto`, `light.to`, `caption.show`.

## Quick start

It needs Node 22.20 or later and ffmpeg on the path. A film is an ES module:
the project's `package.json` says `"type": "module"`, or the film's file is
named `.mts`. livereel runs a film with its types stripped; it checks what
the film hands each of its functions, as the film is defined and its steps
as it is served, and refuses a value of the wrong kind where it stands
(`camera.onto's air is "80": it is a number`). The editor or the project's
type checker finds more.

```bash
npm i -D livereel
npx livereel setup                            # the browser a film is shot in; checks ffmpeg
npx livereel shoot film.ts --out out --sheet  # out/film-square.mp4, and a frame a second in out/film-square-sheet.png
```

On Linux the browser may lack system libraries it needs;
`npx playwright-core install-deps chromium` installs them, as livereel's CI
does.

`film.ts`, a whole film of a page on the web:

```ts
import { atAddress, camera, caption, defineFilm, hold, light, play } from 'livereel';

// The line that says what the page is for
const LINE = 'p[lang=en]';

export default defineFilm({
	formats: { square: { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } } },
	serve: () => atAddress('https://example.com/'),
	ready: (context) => context.page.locator(LINE).waitFor(),
	steps: () => [
		play({ seconds: 1.2, moves: [camera.onto(LINE, { air: 120 }), light.on(LINE), caption.show('A page, filmed')] }),
		hold({ seconds: 1.5 })
	]
});
```

`examples/example-com.ts` is a longer film, in acts, square or wide;
`examples/livereel-promo.ts`, the film at the top of this page, serves an
app of its own and clicks it for real.

## For agents

The `reel` skill, [`skills/reel/SKILL.md`](skills/reel/SKILL.md), teaches an
agent to direct a film: the story first, then a storyboard, then the steps,
checked frame by frame on contact sheets and stills. Install it with
`npx skills add vrppaul/livereel`, or as a Claude Code plugin:

```
/plugin marketplace add vrppaul/livereel
/plugin install livereel@livereel-marketplace
```

## The command line

| Command | |
|---|---|
| `livereel shoot FILM_FILE --out DIRECTORY` | the film whole, as a video: `film-square.mp4` |
| `livereel still FILM_FILE --out DIRECTORY --at SECONDS` | one frame at a moment, without the video: `film-square-1.5s.jpg` |
| `livereel setup` | installs the browser a film is shot in, and looks for ffmpeg |

| Option | Command | |
|---|---|---|
| `--format NAME` | `shoot`, `still` | the format to shoot, of those the film names; a film of one format needs none |
| `--as mp4\|webm\|gif` | `shoot` | the kind of video, an MP4 where none is named; `--as mp4 --as gif` makes both from one take, each at the film's own frame and rate |
| `--sheet` | `shoot` | a frame a second side by side: `film-square-sheet.png` |
| `--quality draft\|finest` | `shoot`, `still` | `finest`, the default, shoots at twice the frame's width and height and blurs a fast camera as the film says; `draft` shoots at the frame's own size, unblurred: quicker and softer |
| `--renderer software\|gpu` | `shoot`, `still` | where the frames are drawn: in software, the default, or on the graphics card |

Every file is named after the film's file and the format it is shot in.
`livereel --help` gives each command's usage.

`--renderer gpu` draws the frames on the graphics card, in the same headless
browser, and needs no screen: the promo, wide and blurred, took 271 s
against 495 s, its frames alike. It reaches the card through Vulkan on
Linux, tried on an Intel card; through Metal on macOS and Direct3D 11 on
Windows, not tried yet. Where it reaches no graphics card, it draws the
frames in software all the same and warns of it ("--renderer gpu reached no
graphics card"). On Linux, where that was tried, a page keeps its WebGL
where Vulkan finds no driver at all, and has none where it finds only
Mesa's software one, lavapipe.

## What a film is written with

A film is a list of steps:

| Step | |
|---|---|
| `play({ seconds, moves, ease })` | so many seconds of frames; each move runs over its share of the step |
| `hold({ seconds })` | so many seconds with nothing moving |
| `cut(...moves)` | moves made at once, between two frames |
| `act(action)` | the page acted on for real, with Playwright: a click, a reply waited for |
| `typing(move)` | as long as the keys of `terminal.type` or `page.type` take, and a beat after |

and the moves of each part of the scene:

- `camera.to(pose, { tilt, turn })`, `camera.onto(selector, { every, air, zoomAtMost, tilt, turn })`
- `light.on(selector, { dim })`, `light.to(selector)`, `light.off()`
- `cursor.to(selector, { entering, bow })`, `cursor.click(action, { sound })`, `cursor.press({ sound })`,
  `cursor.release()`, `cursor.hide()`
- `caption.show(text)`, `caption.hide()`
- `screen.rise()`, `screen.lower()`
- `terminal.open(title)`, `terminal.type(strokes)`, `terminal.submit()`,
  `terminal.works(lines, thinking, { thinkingShare })`, `terminal.leave()`
- `ending.show({ name, line, command })`
- `page.scrollBy(selector, { pixels })`, `page.scrollTo(selector, { top })`, `page.type(strokes)`
- `sound.play(file)`

`cursor.click` and `typing` give several steps, spread among the others:
`...cursor.click(action)`. An act's `action` is handed a `context`, whose
`context.page` is Playwright's `Frame` of the filmed page.

A pose is the whole screen's, `whole`, which `steps` is handed, or
`lookingAt(pose, focusX, focusY, zoom)`. Every move that runs over time
takes a share of its step, `within: { start, end }`, and a curve of its own,
`ease`: `linear`, `easeInOutSine` (a step's own), `easeInOutCubic`,
`easeOutCubic` or `easeOutQuint`. `keystrokes(text, { seed, slipAt, pace })`
types the way a person does: unevenly, with a slip now and then.

### Formats

A film names its formats, `formats: { square: …, wide: … }`, each a frame
and the screen its page is laid out on, and is shot in one at a time. A
framing by selector fits any frame; a pose given in numbers is the film's to
give per format, as `steps(served, whole, formatName)` is handed the whole
screen's pose and the name of the format it is shot in. A frame's sides are
even counts of pixels, as a video holds them.

### Where the stage stands

Your app sits in a frame of the stage, a page of livereel's own.
`defineFilm` takes `stage`:

- `apart`, where none is named: the stage is a file of livereel's, and the
  page is framed in it as it comes, nothing of its answers touched: a
  redirect lands in the frame, and a page that refuses to be framed is
  refused, its refusal named, as the frame opens it or wherever the film
  meets it after. To the stage the page is a page of another site, so its
  cookies go with none of its own requests: a sign-in does not hold. A
  click that moves the top page, as a link to `_top` does, takes the stage
  away, and the film is refused, saying so.
- `inside`, for an app that signs in or refuses to be framed: the stage
  stands on the app's own address, at `/__livereel__/stage.html`, so the
  page is of the stage's own site. Its cookies go with each of its
  requests, a sign-in the film makes in the frame holds (an `act` that fills
  the form, or an address that signs in and sends the page on), and a
  redirect lands in the frame. A page that refuses to be framed is shown:
  livereel's browser takes the refusal off that page's answer alone. The
  page's address is one a server serves, at http or https.

What `inside` costs:

- The frame is sandboxed short of moving the page it stands in, so a page
  that breaks out of frames stays in the stage, and a link to `_top` does
  nothing. A real app, claude-review, was filmed whole under it; what it
  changes for a popup, a download or storage access is not tried yet.
- Only the app's own site is signed in: a page of another site the frame
  goes to gets only its cookies of `SameSite=None`. Such a page is shown
  even where it refuses to be framed, as IANA's is in
  `examples/example-com.ts`.
- The app's scripts can reach the stage, which stands on their origin.
- The app's service worker is not tried yet.

### Sound

A film is heard: a click as the cursor presses, a key for every stroke
typed, a chime as the ending comes up, each on its own frame. These are
livereel's own, quiet and CC0 ([`sounds/`](sounds/LICENSE.md)), the keys
recorded on real keyboards, each key one of four strikes in turn.
`defineFilm` takes:

- `sounds: { keyboard }`, the keyboard the keys are heard on: `membrane`
  where none is named, `mechanical`, `mechanical-bright`, `butterfly`,
  `laptop` or `clicky`;
- `sounds: { click, key, ending }`, any of them: a file of the film's own in
  its place, a path from the film's file, or `{ enabled: false }` to turn it
  off, as `sounds: { key: { enabled: false } }`. The click and the ending
  may stand beside a keyboard; a key given so takes the keyboard's place,
  and is never named beside it;
- `sounds: { enabled: false }` for none of livereel's;
- `music: { file, volume }`, a track under the whole film, `volume` 1 as
  loud as the file, cut to the film's length and faded out at its end.

`cursor.click(action, { sound })` and `cursor.press({ sound })` give one
click a file of its own, and `sound.play(file)` plays a file of the film's
at a moment of a step. The WebM carries the sound; a GIF holds none.

### Motion blur

Where the camera moves fast between frames, a frame is shot several times
along its way from the frame before and blended: as many times as keep the
copies a few pixels apart, so the faster the move, the more. `defineFilm`
takes `motionBlur: { shutter, exposuresAtMost }`, either or both:

- `shutter`, how much of that way the shutter is open for: 1, the whole of
  it, where none is given, and 0.5 a film camera's half;
- `exposuresAtMost`, how many shots the fastest frame is blended from: 8
  where none is given, more for a smoother smear and a longer shoot.

`motionBlur: { enabled: false }` turns it off; `--quality draft` shoots
without it.

## How it works

```
film.ts ──steps──▶ take ──scene, frame by frame──▶ stage page ──Playwright screenshot──▶ ffmpeg ──▶ film-square.mp4 ──▶ .webm, .gif
                    │  │                                                                    ▲
                    │  └──sounds, each on its frame─────────────────────────────────────────┘
                    └──acts, scrolls, keys──▶ your app, live in the stage's frame
```

The stage is a page of livereel's own: your app sits in its frame, and the
camera, the light and the captions are drawn around and over it from the
scene of each frame. The stage decides nothing and keeps no time; the film's
clock is its frames.

## Limits

- What livereel films: public pages, and apps served on your machine. An
  app that signs in is filmed with `stage: 'inside'`, signed in by the film
  itself; a session the person signs in to themselves (two factors, a
  sign-in elsewhere) is not taken yet ([`TODO.md`](TODO.md)).
- Chromium alone, headless.
- The page is asked for reduced motion and the light colour scheme. A page
  that animates anyway runs those animations on the wall clock, so two shots
  of it differ there.
- A page that refuses to be framed (`X-Frame-Options`, a CSP's
  `frame-ancestors`) is shown only on the stage inside the app ("Where the
  stage stands").

## Development

[`CONTRIBUTING.md`](CONTRIBUTING.md): the setup, the gates, how the source is
laid out, and how a release is made.

## License

MIT
