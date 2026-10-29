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
`livereel --help` gives each command's usage. A command that refuses says
why on stderr, and exits by whose it is to put right: 1 the film, 2 the
command line or the film's file, 3 the machine, which lacks what a film is
shot with, as the browser, ffmpeg or its encoder of the kind asked, or a
Node new enough.

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

- `camera.to(pose, { tilt, turn })`, `camera.onto(selector, { every, air, zoomAtMost, side, tilt, turn })`
- `light.on(selector, { dim })`, `light.to(selector)`, `light.off()`
- `callout.show(selector, text, { side })`, `callout.hide()`
- `note.show(selector, text)`, `note.hide()`
- `pin.show(selector, label)`, `pin.clear()`
- `keys.show(caps)`, `keys.hide()`
- `cursor.to(selector, { entering, bow })`, `cursor.click(action, { sound })`, `cursor.press({ sound })`,
  `cursor.release()`, `cursor.hide()`
- `title.show(text, { at, align })`, `title.hide()`
- `code.show(text, { at })`, `code.light(line, { through })`, `code.hide()`
- `caption.show(text)`, `caption.hide()`
- `screen.rise()`, `screen.lower()`
- `terminal.open(title)`, `terminal.type(strokes)`, `terminal.submit()`,
  `terminal.works(lines, thinking, { thinkingShare })`, `terminal.leave()`
- `ending.show({ name, line, command })`, `ending.hide()`, so a film may open on the card too
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

### Titles, and words set their own way

A title is words that come up one after another: over the film's ground
across the whole frame, a screen of words that covers the page, or `at` a
place on the frame, beside the page's window, which the camera frames a
block into on the side across:

```ts
play({
	seconds: 1.6,
	moves: [
		camera.onto(CHART, { side: 'right' }),
		title.show(['A real ', { text: 'click', ink: ACCENT }, ', a real server'], { at: 'left', within: { start: 0.5 } })
	]
})
```

A place is a name, `whole`, `left`, `right`, `top` or `bottom`, or a box in
shares: of the frame edge to edge, or of another place it names `of`, its
`left` and `top` 0 and its `width` and `height` 1 where it leaves them out.
A side is where words stand beside a window on the side across; `whole` is
the frame inside the margin words keep from its edges. A box may reach past
the frame. So a heading over code, beside a window on the right:

```ts
title.show('Point the camera', { at: { of: 'left', height: 0.2 } }),
code.show(LINES, { at: { of: 'left', top: 0.25, height: 0.75 } }),
```

Words in a place stand in the middle of their box down it, as large as its
width lets, centred in `whole`, `top` and `bottom` and read from the left
anywhere else; `align: 'start'` or `'center'` says otherwise.

The page draws back off the frame's edges into a window on the ground, its
corners rounding, its edge and shadow coming up; `camera.onto` without a
`side`, or `camera.to`, brings it back to fill the frame. The words take
about a third of the frame, set as large as their share lets, or the share
a format's `split` gives them (see Formats); the window takes the whole
rest, whatever the page's shape, and shows the part of it the camera
frames. Inside the window the camera frames as in the whole frame: a block
at its middle, as close as its `air` lets, but never so far back that
ground shows in the window, closer than `zoomAtMost` where it must, so a
block wider than the window at that distance is cut at its edges, and a
phone's page shows a strip of itself; framed closer, the window stands still and
the page grows in it. An
angled camera leans the window back or swings it, the page still filling
it; in the whole frame an angled camera stands where the film puts it.
Start the words once the window has drawn back, so they come up on the
ground, not over the page. A film shot in several formats names the sides
for each: the `steps` function is handed the format's name.

A callout is words on a card beside a block of the page, pointing at it:
`callout.show(selector, text, { side })`, its `side` `above` (where none is
named), `below`, `left` or `right` of the block. The camera carries it with
the page, as it carries the light, and the screen's edge does not cut it;
the block is read as the callout comes, as the light's is.

A note is words on the ground across from the page's window, in the
words' share of the frame, and a line drawn from a dot at a block's edge
out to them: `note.show(selector, text)`. It names a block without
covering the page; the line keeps to the block as the page moves in the
window, and the words keep to their share, level with the block as far as
it lets. A note needs a window: one shown while the page fills the frame
is refused. Its words stand across from the side the window stands on,
so while it stands the camera moves only inside the window: a
`camera.onto` to another side, or out to the whole frame, and a
`camera.to`, are refused until `note.hide()` has taken it away.

Pins mark a path: `pin.show(selector, label)` lays a numbered mark on a
block's top corner, numbered after those laid before, its label running
out from the block toward the screen's middle; the labels before it
quieten. `pin.clear()` takes them all away.

Keys: `keys.show(['⌘', 'Enter'])` sets the caps of a shortcut at the
frame's foot, as the page is sent it in an act, and they rise clear of a
caption there as its ground comes up; `keys.hide()` takes them away.

Code is a second screen beside the page's window, or alone: `code.show(text, { at })`
sets a dark pane of code in its place, its lines coming
up one after another, coloured as TypeScript is, the indent they share
dropped. Its letters are as large as `codeSize` lets, smaller where the
widest line would not fit across, so keep its lines short or give the words
a larger share (`split: { wordsShare: 0.44 }`). `code.light(2)` lights its
second line, counted from 1, and dims the rest, `code.light(2, { through: 4 })`
lines 2 to 4, so a line lights as the page does what it says:

```ts
play({ seconds: 1.4, moves: [camera.onto(CARDS, { side: 'right' }), code.show(LINES, { at: 'left' })] }),
play({ seconds: 1, moves: [code.light(1), camera.onto(VISITORS, { side: 'right' })] }),
play({ seconds: 1, moves: [code.light(2), light.on(VISITORS)] }),
```

`code.hide()` takes it away; a light past its last line is refused.

What a title, a caption, a callout or a note says is a string, or a list of strings
and runs, read one after another. A run is `{ text }` set any of these
ways: `italic`, `underline`, `strike`, each `true`; `ink`, the colour of its
letters; `marker`, the colour of a marker behind it; a colour in hex
(`#7c5cff`). An underline or a marker runs on under the space between two
words of one run, and stops where the run does.

### Theme and look

`defineFilm` takes a `theme`, the look the film opens on, any of its
values; what the film leaves out stays livereel's:

| Value | What it sets | livereel's |
|---|---|---|
| `ground` | the ground's colour at its edges | `#0b0e14` |
| `glow` | the colour the ground lightens to toward where `glowX` and `glowY` put it; a ground named without one is of one colour | `#182033` |
| `ink` | the words of titles, captions, callouts, notes and the ending | `#f4f6fa` |
| `quietInk` | what stands back: a quietened pin's label, the ending's line | `#8b95a7` |
| `accent`, `accentInk` | pins' marks and a note's line, and a pin's number on its mark | `#ffb224`, `#10141b` |
| `font` | the font of titles, captions and the ending, as CSS names a family (`'Inter, sans-serif'`) | the system's sans |
| `mono` | the font of the terminal, the code and the ending's command | the system's monospace |
| `titleSize`, `captionSize` | how large a title's and a caption's letters are, in pixels | `92`, `56` |
| `windowCorner` | how round the corners of the page's window and the code's pane are, in pixels; `0`, square | `24` |
| `windowEdge` | the faint edge round the window and the code's pane, its alpha how faint | `#ffffff1a` |
| `windowShadow`, `windowShadowColour` | how strong the shadow of the window and the code's pane is, from `0`, none, to `1`, and its colour | `1`, `#000` |
| `terminal`, `terminalInk` | the colour of the terminal and the code's pane, and what is written in them | `#10141c`, `#f4f6fa` |
| `glowX`, `glowY` | where the ground's glow stands, across and down, each from 0 to 1 | `0.5`, `0.3` |
| `titleWeight`, `captionWeight` | how heavy a title's and a caption's letters are, 100 to 900 | `700`, `650` |
| `noteSize`, `calloutSize`, `pinSize`, `keysSize`, `codeSize` | how large a note's, a callout's, a pin's label's and a key's letters are, and the code's at most, in pixels | `44`, `20`, `26`, `44`, `26` |
| `cursorFill`, `cursorEdge` | the cursor's colour and its edge's | `#111`, `#fff` |
| `wordsMotion` | how words come up: `'soft'`, rising out of a blur; `'sharp'`, rising with no blur; `'still'`, fading up where they stand | `'soft'` |

Colours are in hex; sizes in pixels of a frame 1080 on its shorter side,
scaled to the frame shot. A font falls back to livereel's where the system
has none; one CSS reads as no family is refused before anything is shot.

The look changes as the film goes, by a move like any other:
`look.to(theme)`, any of the same values. In a `play` it moves there over
its share of the step: a colour through the colours between, a size, a
weight, a corner or a shadow through the values between, and a font or
`wordsMotion`, which have none between, half-way; in a `cut`, at once.

```ts
play({ seconds: 1.2, moves: [look.to({ ground: '#f5efe6', ink: '#1a1a1a' })] }),  // the ground turns light
cut(look.to({ font: 'Georgia', windowCorner: 0 })),                               // a serif, square corners, at once
play({ seconds: 6, moves: [look.to({ glowX: 0.9, glowY: 0.1 }), camera.onto(CHART)] }) // the glow drifts as the camera goes
```

A ground named without a glow takes its glow with it, as in a theme; what
a move leaves out stays as the look stands.

### The page: its colour scheme, and what it blurs

`defineFilm` takes `colourScheme: 'dark'` for a page filmed in its dark
scheme; it is asked for the light one where a film names none. It takes
`blurred: [selector, …]` for blocks the page blurs wherever it shows them,
an address, a key or a name no film should show: each document the page
opens is given a style sheet that blurs them, so a page the film goes on to
blurs them too. A selector Chrome cannot read is refused before anything
is shot. A block inside a shadow root is not blurred, nor one on a page that
sets its own adopted style sheets in place of all: check the stills.

### Formats

A film names its formats, `formats: { square: …, wide: … }`, each a frame
and the screen its page is laid out on, and is shot in one at a time. A
frame's sides are even counts of pixels, as a video holds them.

The stage's look was made on frames 1080 pixels on their shorter side, as
1920 × 1080 and 1080 × 1080 are; on any other frame it is drawn as on such
a frame and scaled to the one shot. The caption, the terminal and the
ending keep their share of any frame, and an angle leans as steeply on any.
A zoom, in a pose as in `zoomAtMost`, is the frame's
pixels a page's pixel takes on such a frame, so a pose and a framing by
selector, its `air` in the page's pixels, show as much of the page on a
frame of any size. A pose given in numbers is the film's to give per
format, as `steps(served, whole, formatName)` is handed the whole screen's
pose and the name of the format it is shot in.

A format may give a `split` of its own, how its frame is split between
words and the page's window, any of its values; what it leaves out stays
livereel's:

| Value | What it sets | livereel's |
|---|---|---|
| `wordsShare` | the share of the frame the words take, from the edge they stand on, from 0 to 1 | `0.36` |
| `windowMargin` | how far the window stands in from the frame's edges, in pixels | `72` |
| `wordsMargin` | how far the words stand in from the frame's edges, in pixels | `96` |
| `wordsGap` | how far the words keep from the window's room, in pixels | `48` |

Pixels are of a frame 1080 on its shorter side, as the theme's are. A
square's words above the window may take less of it than a wide frame's
beside it: `square: { frame, screen, split: { wordsShare: 0.28 } }`. A
split that leaves the words or the window no room on its frame is refused
before anything is shot.

A format names where its captions stand, `captionAt: 'top'`, or at the
frame's foot where it names none: a square may caption its top and a wide
frame its foot, and a caption at the top leaves the foot to the keys.

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
- The page is asked for reduced motion, and for the light colour scheme
  unless the film names the dark one. A page that animates anyway runs
  those animations on the wall clock, so two shots of it differ there.
- A page that refuses to be framed (`X-Frame-Options`, a CSP's
  `frame-ancestors`) is shown only on the stage inside the app ("Where the
  stage stands").

## Development

[`CONTRIBUTING.md`](CONTRIBUTING.md): the setup, the gates, how the source is
laid out, and how a release is made.

## License

MIT
