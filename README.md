# livereel

[![CI](https://github.com/vrppaul/livereel/actions/workflows/ci.yml/badge.svg)](https://github.com/vrppaul/livereel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/livereel)](https://www.npmjs.com/package/livereel)
[![Node](https://img.shields.io/node/v/livereel)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

https://github.com/user-attachments/assets/23e46e5f-8c42-454d-b66c-8a264813f884

Film your live web app as a directed short: a camera that travels in a window that leans, a light on the block
that matters, a cursor that moves like a hand, captions that come up word by word. The app is real — clicks,
typing and its server's answers happen in it — and every frame is shot on a clock of the film's own, so a slow
server costs the film nothing.

A film is a TypeScript file of steps. An agent writes it for you: livereel comes with a skill that teaches Claude
Code to direct one.

## Why not a screen recording

- **The film keeps its own time.** A frame is a moment of the film, however long the browser took to draw it:
  waits, slow answers and loading vanish, and the camera moves as smoothly at 60 frames a second, or the rate the
  film names, as it was written. Where the camera or a title, code or the terminal moves fast, a frame is shot
  several times along the way and blended, as a film camera's open shutter blurs what moves.
- **The page is live.** livereel films the app itself, in Chromium, not a copy of it: a click is a real click and
  a reply is the server's.
- **It is directed, not cut.** The camera frames a block by its selector, the light follows what the caption
  talks about, and the film is written in a director's words: `camera.onto`, `light.to`, `caption.show`.

## Quick start

It needs Node 22.20 or later and ffmpeg on the path. A film is an ES module: the project's `package.json` says
`"type": "module"`, or the film's file is named `.mts`. livereel runs a film with its types stripped; it checks
what the film hands each of its functions, as the film is defined and its steps as it is served, and refuses a
value of the wrong kind where it stands (`camera.onto's air is "80": it is a number`). The editor or the project's
type checker finds more.

```bash
npm i -D livereel
npx livereel setup                            # the browser a film is shot in; checks ffmpeg
npx livereel shoot film.ts --out out --sheet  # out/film-square.mp4, and a frame a second in out/film-square-sheet.png
```

On Linux the browser may lack system libraries it needs; `npx playwright-core install-deps chromium` installs
them, as livereel's CI does.

`film.ts`, a whole film of a page on the web:

```ts
import { camera, caption, defineFilm, hold, light, play } from 'livereel';

// The line that says what the page is for
const LINE = 'p[lang=en]';

export default defineFilm({
	formats: { square: { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } } },
	address: 'https://example.com/',
	ready: (context) => context.page.locator(LINE).waitFor(),
	steps: () => [
		play({ seconds: 1.2, moves: [camera.onto(LINE, { air: 120 }), light.on(LINE), caption.show('A page, filmed')] }),
		hold({ seconds: 1.5 })
	]
});
```

`examples/example-com.ts` is a longer film, in acts, square or wide; `examples/livereel-promo.ts`, the film at the
top of this page, serves an app of its own by its own command and clicks it for real;
`examples/livereel-recipes.ts` sets a block of that app apart in eighteen ways, an act each — lifted, grown, under
a lens, in layers, spun — each a few moves of pieces, outlines, a lens, groups and the window;
`examples/livereel-flights.ts` flies the eye low over it, a run toward its Refresh button and a dive along its row
of cards.

## For agents

The `reel` skill, [`skills/reel/SKILL.md`](skills/reel/SKILL.md), teaches an agent to direct a film: the story
first, then a storyboard, then the steps, checked frame by frame on contact sheets and stills. Install it with
`npx skills add vrppaul/livereel`, or as a Claude Code plugin:

```
/plugin marketplace add vrppaul/livereel
/plugin install livereel@livereel-marketplace
```

## The command line

| Command | |
|---|---|
| `livereel shoot FILM_FILE --out DIRECTORY` | the film whole, as a video: `film-square.mp4` |
| `livereel clip FILM_FILE --out DIRECTORY --from SECONDS --to SECONDS` | a span of the film, silent, to see a few moments move: `film-square-12-15s.mp4` |
| `livereel still FILM_FILE --out DIRECTORY --at SECONDS` | one frame at a moment, without the video: `film-square-1.5s.jpg` |
| `livereel set FILM_FILE` | the film's app shot once ahead of it, beside the film's file: `film-square.set/` ("The set") |
| `livereel setup` | installs the browser a film is shot in, and looks for ffmpeg |

| Option | Command | |
|---|---|---|
| `--format NAME` | `shoot`, `clip`, `still`, `set` | the format to shoot, of those the film names; a film of one format needs none |
| `--as mp4\|webm\|gif` | `shoot` | the kind of video, MP4 where none is named; `--as mp4 --as gif` makes both from one take |
| `--sheet` | `shoot`, `clip` | the frames side by side, a frame a second: `film-square-sheet.png` |
| `--sheet-rate FRAMES_A_SECOND` | `shoot`, `clip` | how many frames a second the sheet shows: 6 to follow a move as an eye does |
| `--quality draft\|finest` | `shoot`, `clip`, `still` | `finest`, the default, draws at twice the frame's width and height and blurs a fast move as the film says; `draft` draws at the frame's own size, unblurred: quicker and softer. A still keeps the size it is drawn at |
| `--renderer software\|gpu` | `shoot`, `clip`, `still`, `set` | where the frames are drawn: in software, the default, or on the graphics card |
| `--profile` | `shoot`, `clip`, `still` | where the time went: each part of the browser and the footage the frames waited on, its calls, the time each took and its share, the rest, and the blends of exposures. In a room each frame then waits until the card has drawn it, so `stage.draw` is its drawing and `stage.capture` its way out of the browser |

Every file is named after the film's file and its format. `livereel --help` gives each command's usage. A
command that refuses says why on stderr, and exits by whose it is to put right: 1 the film, 2 the command line or
the film's file, 3 the machine: it lacks the browser, ffmpeg, its encoder of the kind asked or a Node new enough,
or its graphics card dropped the room's canvas.

`--renderer gpu` draws the frames on the graphics card, in the same headless browser, and needs no screen: a
blurred film shoots in about a third of the time it takes in software. It reaches the card through Vulkan on
Linux, tried on an Intel card, and through Metal on macOS and Direct3D 11 on Windows, not tried yet. Where it
reaches no card it draws in software all the same and warns: "--renderer gpu reached no graphics card". On Linux
a page keeps its WebGL where Vulkan finds no driver at all, and has none where it finds only Mesa's software one,
lavapipe.

## A film

`defineFilm` makes a film; it always names the first four of these:

| Field | What it says | Read |
|---|---|---|
| `formats` | each format by name: its frame and the screen its page is laid out on | "The frame" |
| `address` | where the page is | "Where the page is" |
| `ready` | `(context) => Promise`, settled once the page stands as the first frame shows it | "Where the page is" |
| `steps` | `(whole, formatName) => steps`, handed the whole screen's pose and the format's name | "How time goes" |
| `serve` | the command that serves the page, where the film starts the app | "Where the page is" |
| `set` | the app shot once ahead, the film shot from its pictures | "The set" |
| `page` | `'static'`, the default, or `'dynamic'` for a page that changes of itself | "Static or dynamic" |
| `stage` | where a dynamic page's stage stands: `'apart'`, the default, or `'inside'` | "Where the stage stands" |
| `colourScheme`, `blurred` | `'light'`, the default, or `'dark'`; blocks the page blurs | "Colour scheme and blurred blocks" |
| `framesPerSecond`, `eye` | the rate, 60; `{ angleOfView }`, 24 | "The frame" |
| `motionBlur` | how a fast move blurs | "Motion blur" |
| `theme`, `fonts` | the look the film opens on, and the font files it brings | "The look" |
| `world` | the world's lights, soft boxes, glow and grain | "The world's light" |
| `drawing`, `things` | `'flat'`, the default, or `'room'`; a module of the film's own three.js | "Flat, or a room", "Things" |
| `sounds`, `music` | livereel's sounds, and a track under the film | "What is heard" |

A target, what a move reads on the page, is a selector, of which a move that takes `every` reads the first
`every` blocks, and a stretch kept sharp in the shade all of them, or a box of the page's screen,
`{ left, top, width, height }` in its pixels, for what a page draws with nothing to select: a canvas, or a frame
exported from a design. A block is read as its move's share begins, where the screen shows it then; the part kept
sharp, on the frames that draw it.

## How time goes

A film is a list of steps:

| Step | |
|---|---|
| `play({ seconds, moves, ease })` | so many seconds of frames; each move runs over its share, on the step's curve where it names none |
| `hold({ seconds })` | so many seconds with nothing moving |
| `cut(...moves)` | moves made at once, between two frames, each set as it stands at its end |
| `act(action)` | the page acted on for real, with Playwright, between two frames: a click, a reply waited for |
| `typing(move)` | as long as the keys of `terminal.type`, `page.type` or `screen.type` take, and a beat after |

`cursor.click` and `typing` give several steps: spread them among the others, `...cursor.click(action)`,
`...typing(page.type(strokes))`. `cursor.hide()` and `terminal.submit()` are made at once: write them in a `cut`.
An act's `action` is handed a `context`: `context.page` is Playwright's `Frame` of the filmed page;
`context.motion.release()` lets the page's own animations run and `context.motion.still()` stills them again;
`context.set.show(name)` shows a state of the film's set.

### A move's share and curve

A move that runs over time takes a share of its step, `within: { start, end }`, from 0 to 1, the whole step
where left out, and a curve of its own, `ease`. A move made at a moment, as `page.act`, `sound.play`,
`screen.shows`, `screen.behind` and `screen.blinks`, takes `within: { start }` alone.

In a play, a move may be timed in the play's seconds instead: `after` seconds from the play's start, its start
where left out, for `takes` seconds, or on to its end where `takes` is left out; a move made at a moment takes
`after` alone. A long play whose moves stand at moments read off a cut or its music is written so; seconds are
held to a microsecond, so a move ends exactly where the next begins or the play ends. One past the play's end,
one timed both ways, and one in a cut are refused.

```ts
play({ seconds: 11.69, moves: [
	eye.onto(ASKED, { fills: 0.94, after: 0, takes: 2.2 }),
	page.act(answered, { after: 9.4 }),
	cursor.press({ after: 3.3, takes: 0.02 })
] })
```

livereel's curves: `linear`, `easeInOutSine` (a step's own), `easeInOutCubic`, `easeInCubic`, `easeOutCubic`,
`easeOutQuint`, and `easeOutBack`, which passes its end by a tenth of the way and settles back on it: a place, a
scale or an angle bounces with it, while what comes up or goes never passes whole or none, and a blur or a length
never passes where it ends. Give it to the move that should bounce, a `to`, a `lean` or a camera move, not to a
whole `play`, nor to a show or a hide, which reach their end a third of the way in and stop there.

Curves of the film's own numbers:

- `cubicBezier(0.4, 0, 0.2, 1)`, as CSS's `cubic-bezier()`.
- `atSpeeds({ settingOff, arriving })` sets off and arrives at those speeds, each from 0 to 3 times the move's
  mean. Two plays of one move run on with no jolt where the second sets off at the speed the first arrived at, in
  its own mean's terms: how far the first went a second as it arrived, times the second's seconds over how far the
  second goes, the two going the same way.
- `softThenHeld(0.4)` sets off from rest, is at its fastest at 0.4 of its time and holds that speed to its end, as
  a dive that runs on does: π/2 ÷ (fastestAt + π/2 × (1 − fastestAt)) times its mean, 1.17 at 0.4.

Two moves of one part, a prop or the page, run at once in a step only where each sets only the values it names
and they name none alike: `window.to` beside `window.lean`, two `effects` of one object, two `look.to`. Otherwise
they run one after the other, by their shares; at once they are refused, by the part or the value:
`two moves on the look's glow at once in one step`.

### Typing

`keystrokes(text, { seed, slipAt, pace })` types the way a person does: unevenly, its rhythm drawn from `seed`, a
slip on letter `slipAt` rubbed out, every gap `pace` times as long, 1 where none is named.
`keystrokes(text, { lettersPerSecond: 12 })` types evenly, a letter every twelfth of a second, the first a twelfth
after the typing starts, as a cut that types on a beat does. `terminal.type`, `page.type` and `screen.type` take
them.

### The page's clock

The page's own time is the film's. Its timers, its animation frames and its date stand still between frames and
run on a frame's length with each, so a note the page takes away after 2 s goes 2 s into the film, however long
the shoot takes, on the same frame in every shot. While an `act`, or the film's `ready`, waits on the page, its
time runs as the wall's, as the page needs it to answer: a search that waits for the typing to stop, data that
loads. The film's time stands through an act, so the page leaves the act ahead of the film and waits for
it: a timer it set ends as far into the film as it said, however long the acts after it took, and an
animation its script draws stands for as long as the act took. A Web Worker's timers, and the date the page
starts at, the machine's, are the wall's.

`page.speed(speed)` sets how many of the page's seconds a second of the film runs: `cut(page.speed(4))` shows a
minute of the site in 15 s, a `play` holding `page.speed(0.5)` slows it through the play, and `page.speed(0)`
stands it still; it runs at 1 until the film sets another. It speeds what the page's script does by its time, its
timers, animation frames and date, and nothing else: an answer from its server comes when it comes, its styles'
animations keep the wall's clock, and while an `act` waits on the page its time runs as the wall's at any speed,
so a page stood still answers a click. The page's animation frames come every 16 ms of its own time, so below a
speed of 0.48 an animation its script draws on each steps less often than the film's frames; each is run, so a
page that draws on every one costs more a frame the faster it runs.

## The frame

A film names its formats, `formats: { square: …, wide: … }`, each a `frame` and the `screen` its page is laid out
on, and is shot in one at a time. A frame's sides are even counts of pixels, as a video holds them.

A film is shot at 60 frames a second, where a fast move runs smooth; `framesPerSecond: 30` shoots half the frames.
Every format of a film shares its rate. A GIF is made at 50 frames a second at most, as a browser holds a GIF's
frame of a hundredth of a second or less ten times as long.

The eye sees 24° across the frame's shorter side, a long lens: a window leant back or a title brought near keeps
its shape, and only a little of its depth shows. `eye: { angleOfView: 40 }` is a wider one, where depth is loud.
Every format of a film shares its angle.

The look was made on frames 1080 pixels on their shorter side, as 1920 × 1080 and 1080 × 1080 are; any other frame
is drawn as such a frame and scaled. The caption, the terminal and the ending keep their share of any frame, and an
angle leans as steeply on any. Every length a film writes on the frame or in the world, a size of the look and of a
split among them, is in pixels of such a frame, called **film pixels** below: on a 1920 × 1080 frame a film pixel
is a pixel of it, on a 1080 × 1920 frame too, and on a 3840 × 2160 frame two. A zoom, in a pose as in `zoomAtMost`,
is the film pixels a page's pixel takes, so a pose and a framing by selector, its `air` in the page's pixels, show
as much of the page on a frame of any size. A pose in numbers is the film's to give per format:
`steps(whole, formatName)` is handed the whole screen's pose and the name of the format shot.

A screen may be taller than the frame, a page laid out whole for the eye to fly low over:
`screen: { width: 1040, height: 5000 }`. A static page's picture is then of the whole of it, taken anew each time
the page changes, and costs as it grows: 1.8 s in software and 0.8 s on a graphics card for 1040 × 5000 at the
finest quality. A picture is taken no larger than Chrome takes one whole ("Limits").

A format names where its captions stand, `captionAt: 'top'`, or at the frame's foot where it names none: a
caption at the top leaves the foot to the keys.

### Places

What stands on the frame stands at a place: `whole`, `left`, `right`, `top`, `bottom`, a name the format gives,
or a box `{ of, left, top, width, height }` in shares of the frame edge to edge, or of the place `of` names,
`left` and `top` 0 and `width` and `height` 1 where left out. A box may reach past the frame. Each reads a name
its own way: on a side, words take their share of the frame and the window the whole room across from
the words' share, so words `at: 'left'` and a window `to('right')` stand clear of each other; `whole` is, for
words, the frame inside the margin they keep from its edges, and for the window the frame itself.

A format may name places of its own, `places`, each a place of livereel's, another of its own, or a box in
either, so one script fits every format: the film says `words` and `page`, and each format says where they stand.

```ts
const FORMATS = {
	square: { frame, screen, places: { words: 'top', page: 'bottom', heading: { of: 'words', height: 0.3 } } },
	wide: { frame, screen, places: { words: 'left', page: 'right', heading: { of: 'words', height: 0.2 } } }
};
play({ seconds: 1, moves: [window.to('page'), title.show(IN_SIX, { at: 'heading' })] });
```

`page: 'right'` is the window's room on the right for the window and the words' share there for words, which read
centred where it names `top`. Refused as the film is defined, by its format: a name of livereel's taken, a place
that names none, and one that stands in itself through others; as the steps are made, by the move: a place its
format has not. Both before anything is shot.

### The split

A format may give a `split`, how its frame is shared between words and the page's window; what it leaves out
stays livereel's:

| Value | What it sets | livereel's |
|---|---|---|
| `wordsShare` | the share of the frame the words take, from the edge they stand on, from 0 to 1 | `0.36` |
| `windowMargin` | how far the window stands in from the frame's edges, in pixels | `72` |
| `wordsMargin` | how far the words stand in from the frame's edges, in pixels | `96` |
| `wordsGap` | how far the words keep from the window's room, in pixels | `48` |

A square's words above the window may take less than a wide frame's beside it:
`square: { frame, screen, split: { wordsShare: 0.28 } }`. A split that leaves the words or the window no room is
refused before anything is shot.

## What the page shows

### Where the page is

A film names its page's `address`. A page someone else serves, a public site or an app already running, needs
nothing more. An app the film should start names the command that serves it, as the project runs its own server:

```ts
address: 'http://localhost:5173/',
serve: 'npx vite --port 5173 --strict-port',
```

livereel runs the command in the film file's folder, asks the address until it answers, a minute at most, shoots,
and stops the command and all it started once the take ends, on Ctrl-C too, as Playwright's `webServer` does. A
command that ends before its page answers is refused with how it ended and what it said last; an address that
answers before the command runs is refused too, as that page would be filmed in its place. Such a page is at an
http or https address on a port the film names, so the command must serve it there. `ready` then waits until the
page stands as the first frame shows it.

What the page shows and its server answers, the app's data or a reply to a click, lives beside the film as data
its server and the film both read (`examples/livereel-promo/acme.ts`), so the film knows what a click brings.

### Static or dynamic

Where a film names nothing, `page: 'static'`, the page is shown as a picture, taken anew after the film changes
it — by its acts, by `page.scrollBy`, `page.scrollTo` and `page.type`, while an act has let its own motion go —
and after any change to its document it makes of itself: a timer, an answer that comes late, data pushed to it.
It is then captured every frame until two captures come out alike, so a hold costs next to nothing.
`page: 'dynamic'` is for a page that changes where its document does not — a canvas, a video, an animation that
ignores reduced motion, a change inside a shadow root — which is then captured every frame.

### Where the stage stands

A static page stands in a tab of its own at the film's address, as a person opens it: its cookies go with its
requests, a sign-in the film makes holds, and a page that refuses to be framed is shown. The stage, a page of
livereel's own, shows a picture of it, as sharp as a camera 2.2 times close needs.

A dynamic page sits live in a frame of the stage, and `stage` says where that stands; `stage: 'inside'` with a
static page is refused:

- `apart`, where none is named: the stage is a file of livereel's, and the page is framed in it as it comes, its
  answers untouched: a redirect lands in the frame, and a page that refuses to be framed is refused, its refusal
  named, wherever the film meets it. To the stage the page is of another site, so its cookies go with none of its
  requests: a sign-in does not hold. A click that moves the top page, as a link to `_top` does, takes the stage
  away, and the film is refused, saying so.
- `inside`, for an app that signs in or refuses to be framed: the stage stands on the app's own address, at
  `/__livereel__/stage.html`, so the page is of the stage's site. Its cookies go with its requests, a sign-in the
  film makes in the frame holds (an act that fills the form, or an address that signs in and sends the page on),
  and a redirect lands in the frame. A page that refuses to be framed is shown: livereel's browser takes the
  refusal off that page's answer alone. The page's address is one a server serves, at http or https.

What `inside` costs:

- The frame is sandboxed short of moving the page it stands in, so a page that breaks out of frames stays in the
  stage, and a link to `_top` does nothing. A popup, a download or storage access is not tried yet.
- Only the app's own site is signed in: a page of another site the frame goes to gets only its cookies of
  `SameSite=None`. Such a page is shown even where it refuses to be framed.
- The app's scripts can reach the stage, which stands on their origin.
- The app's service worker is not tried yet.

### Colour scheme and blurred blocks

The page is asked for its light colour scheme; `colourScheme: 'dark'` asks for the dark one.
`blurred: [selector, …]` names blocks the page blurs wherever it shows them, an address, a key or a name no film
should show: each document the page opens is given a style sheet that blurs them, so a page the film goes on to
blurs them too. A selector Chrome cannot read is refused before anything is shot. A block inside a shadow root is
not blurred, nor one on a page that sets its own adopted style sheets in place of all: check the stills.

### The set

A film of the live page shoots it as it goes: each act waits on the app, and a still at 58 s goes through the 57
before it. A film that names a `set` shoots the app once, ahead, and is then shot from those pictures, with no
app served:

```ts
set: {
	targets: [REFRESH, VISITORS],
	scenario: async (context) => {
		await context.state('opened');
		await context.page.locator(REFRESH).click();
		await context.page.locator(UPDATED).waitFor();
		await context.state('refreshed');
	}
},
```

`livereel set film.ts --format wide` serves the app with the film's `serve`, waits for its `ready` and runs the
scenario, Playwright code that acts on the app as a person would. At each `state(name)`, a name of letters,
digits, dashes and underscores from a letter or digit, it keeps a picture of the screen, 3 times as sharp as the
page where `sharpness` names no other, and where each of the `targets` stands, in `film-wide.set/` beside the film
file. A scenario that fails leaves the set shot before as it was.

The film opens on the first state and shows another by an act, as a click on the app would bring it; `act` and
`page.act` take it the same way:

```ts
...cursor.click(({ set }) => set.show('refreshed')),
```

A move reads its target where the set shot it in the state shown. Refused: a target the set's `targets` leave out,
or one that matched nothing in that state; a scroll, typing and an act that asks for `context.page`, which the
scenario does instead; a set shot on another screen, with other targets or at another sharpness, so shoot it again
after any of them changes; and a set whose file or a picture is missing. A set's pictures change only by the
film's acts, so its page is static.

### Acting on the page

- `act(action)`, and `page.act(action, { within: { start } })` at a moment of a play while its other moves go
  on, act on the page for real. An act takes no time: it is refused only where a scroll or a typing of the page
  runs across its moment, and a move that begins at its moment reads the page it left.
- `page.scrollBy(selector, { pixels })` moves a block's own scroll so many pixels; `page.scrollTo(selector,
  { top })` scrolls the nearest block that scrolls the selector's block until it stands `top` pixels below that
  block's top.
- `page.type(strokes, { keyboard })`, in `typing()`, types real keys into whatever holds the page's keyboard.

The camera stops at a `cursor.click`. To click while it goes on, write the click into a play: the cursor's press,
`page.act` at its end, and its release, each over a share, while `cursor.to` and the camera go their way; the
film's time stands while the page answers. Give the press and the release about 0.09 s and 0.12 s of the play, as
a click's are; they go on a finger's curve whatever the play's. A press begins once the cursor is on the screen,
not on the frame `cursor.to` brings it in on.

```ts
play({ seconds: 3, moves: [
	camera.to({ focusX: 520, focusY: 400, zoom: 1.2 }),
	cursor.to('#dark', { within: { end: 0.4 } }),
	cursor.press({ within: { start: 0.4, end: 0.43 } }),
	page.act((context) => context.page.locator('#dark').click(), { within: { start: 0.43 } }),
	cursor.release({ within: { start: 0.43, end: 0.47 } })
] })
```

### A film's own page

`screen.shows({ html })` shows a film's own page in the filmed page's place: a whole document the film writes in
HTML and CSS, a slide, a terminal, an end card, laid out at the screen's size, framed by the camera, leant and
blurred as the filmed page is, its text sharp however close the camera comes. `screen.shows('filmed')` brings the
filmed page back. In a `cut` it swaps at once; in a `play`, at the moment `within: { start }` names, so a camera
flying fast through the swap smears one into the other.

It stands as written: its scripts do not run, and one that animates or transitions of itself is refused before
the film is shot, as it moves only as the film runs it. An address in it is read from the stage's own folder, so
name an image or a font by a whole address or a `data:` URL; the film's `fonts` set the look's words, not its
pages. While it shows, a move finds blocks on it by their selectors, where they stand as the move begins, as far
as the film has run the page and with what it typed into it, so a light laid on a running page lands on its
block. The filmed page behind it is still acted on, scrolled and typed into. A piece lifted `picture: 'held'` and
a sweep are drawn from a picture of it taken as it stands then. Refused: a piece following the page's picture, a
lens, and the swap while a lens stands.

**A fade.** `screen.shows('filmed', { fade: { seconds: 2.4, ease: easeInOutCubic } })` holds a picture of the
page the screen shows, framed as the camera frames it then, and fades it away over the page coming for that many
seconds of the film's time, on `ease`, `easeInOutSine` where none is named, on past its step. Written first in a
`cut` with a camera move after it, the page going stands as it stood while the camera frames the page coming at
once, closer or farther: one page fading over another, each at its own scale; from there the page going lies on
the page coming where the cut left it, so a camera drawing back after draws both back, and a piece riding its
block off the page going goes with that page. Every move of a cut reads the scene as the moves before it left it.
Written in a `play`, the page going lies on the page coming from the fade's moment. The page going lies over the
screen and the light, under a callout, the pins and the cursor, and the window's shade dims and fades the page
coming alone, so `window.shade({ fade: 1 })` in the same cut, brought to `0` over the next play, brings the page
coming up out of the dark under the one going. Refused: a fade on a page framed live, from a page the window
shades, from a film's own page that runs or is drawn past its screen, and while the screen still fades from the
page before.

**Past the screen.** A film's own page is cut at the screen's edges, `reaches: 'screen'`;
`screen.shows({ html }, { reaches: 'document' })` draws it on past the screen's top and foot as far as its
document runs and the frame sees the window's plane: a window leant back shows what has run past the screen's top
on up the frame, on the screen's ground, its edge and shadow round the sheet. Its sides are the screen's, so lay
the window close enough for the sheet to cover the frame's width where it should. Its run still counts from the
screen's top. Face-on and whole, where the frame sees nothing past the screen, it draws as if cut. The window's
own edge, lifted, still cuts it, and a page on the window's back is cut at the screen. The sheet is laid out in a
frame as tall as it is drawn, so `vh` is the sheet's height, and a block `position: fixed` or `sticky` to the
screen's foot, a prompt, leaps to the sheet's foot as the sheet first shows: lay such a page out in pixels.
Refused: a page with nothing past its screen, and `reaches` on the filmed page.

**Its run.** `screen.scrolls({ html }, { pace: 480 })` runs a film's own page down its scroll at 480 of
its pixels a second until another move of its run, its pace changing from the old to the new over the move's
share of a `play` on the move's curve, or at once in a `cut`; `pace: 0` stops it, a pace below none runs it back
up, and it holds at its top and its end. The run is the page's, kept on either face of the window, or on none. It
is the only way such a page moves; the filmed page scrolls by `page.scrollBy` and `page.scrollTo`. Each exposure
of a frame draws the page where it stood then, so a fast run smears. Refused: `screen.scrolls('filmed')`,
`screen.scrollTo('filmed', …)`, and the run of a page that scrolls nowhere: one the screen holds all of, or whose
body hides what runs past the screen (`overflow: hidden`).

`screen.scrollTo({ html }, '#input', { top: 600 })` brings the page to rest with a block 600 of its pixels below
the screen's top as the move's share of a `play` ends: it goes on at the pace the page runs and comes smoothly to
stand there on a curve of its own, so it takes no `ease`; in a `cut` it stands there at once. The block is
measured where it stands in the page's document, however far the page has run. Refused as it begins: where the
page cannot scroll so far, and where it would turn back on its way, running away from its rest or so fast it would
pass it, more than three times its way's mean pace: stop the page first, or give the move a longer share.

With `judged: { left: 0.85, top: 0.275 }`, a point of the frame in shares of it, that curve is laid across the
frame there: what the eye reads at that point sets off as fast as the page carries it there and slows to rest
however the window leans and the eye and the camera move, and the block still comes to rest where the film names.
Every move of the camera, the window and the eye that starts within the run's share is then begun as the run
begins, reading the scene alone, so start one that reads the page, a block it goes to, once the run rests. Begun
so early, a move reads an object where the moves already running will have carried it, not where a move
beginning after the run, or a scroll of the page, would. Refused: a move that reads the page begun within the
run's share, a point where the eye sees past the window's plane while the page runs, and a run that would pass its
rest across the frame.

**Typing into it.** `screen.type({ html }, keystrokes('/review-ui', { lettersPerSecond: 12 }), { into: '#typed'
})`, in `typing()`, types into the first block its CSS selector `into` matches: from the move's start the block
shows what stands typed as its text, in place of what the page wrote there, each key heard on the film's keyboard
or the `keyboard` named. What stands typed is the page's, kept on either face of the window until the film types
into that block again, anew from nothing; typing into another block keeps it. Text that wraps lengthens the page
from the frame its letter lands on, so a run goes on to the page's new end and a sheet drawn past its screen
reaches as far. Type into a span of text alone, the caret an element beside it:
`<span id="typed"></span><span class="caret"></span>`; a `<textarea>` shows its text, so it is typed into as a
span is. Refused as the move begins: a block that holds elements of its own, an `<input>`, which shows its value,
not its text, a block the page lacks, one that is no HTML element, as an SVG shape, and `screen.type('filmed',
…)`: the filmed page is typed into by `page.type`.

**A blink.** `screen.blinks({ html }, '.caret', { seconds: 1.06 })` blinks the first block the selector matches,
as a terminal blinks its caret: from the move's moment the block fades out on a cosine to none half a blink on and
back to whole, whatever opacity the page's styles give it, a blink every `seconds`, on either face, until the
film blinks it again. Refused: a block the page lacks, one that is no HTML element, and the filmed page, whose own
motion stays stilled.

### A sweep

`screen.sweep({ from, slant, round, width, crest })` in a `play` sweeps the picture the screen shows away by a
band of light, the page as it stands showing behind it: a theme turned dark by `page.act(action, { within: {
start: 0.02 } })` in the same play comes in behind the band. The band crosses what the window shows of the screen
from its left, or the side `from` names, slanted 30° clockwise or as far as `slant` names, 160 film pixels wide
or `width`, its crest in the look's accent as it stands, or running from `crest.start` at its end nearer the top
to `crest.end`. Or a disc opens `round` a block, a selector or a box of the screen, at its middle, its ring
growing from there, or from the nearest point the window shows where it shows no middle, to past the farthest
corner the window shows: its middle rides with the page, its reach is the window's, and its crest runs from
`crest.start` at its top round to `crest.end` at its bottom.

The picture is held as the sweep begins, so put the act a moment after it: an act at the same moment would be
done first and lie under the picture, and the play refuses it; one in a step before lies under it too. The band
crosses the window, not the page: a camera panning against it faster than it goes brings the picture back over
page it had swept. A piece drawn from the page's picture and a lens show the page as it stands, behind the band
already. In a `cut` a sweep ends as it begins, and nothing of it shows. While the screen shows a film's own
page, it sweeps away a picture of that page. Refused: `round` with `from` or `slant`, and a page framed
live, which has no picture.

## What it lies on: the window

`window.to(place, { depth, through, shape, pace })` draws the page back off the frame's edges into a window on the
ground, its corners rounding, its edge and shadow coming up, carries it from one place to another, and,
`window.to('whole')`, brings it back to fill the frame. `through` names places its box passes on the way, on one
curve, as an object's `to` passes them ("The camera"); its lift and depth go from end to end. Start words once the
window has drawn back, so they come up on the ground, not over the page. The words take about a third of the frame,
or the share a format's `split` gives them; the window takes the whole rest, whatever the page's shape.
`window.show({ at: 'whole', from: 'right' })` slides it in whole from past a side of the frame to its place, and
`window.hide({ toward: 'left' })` slides it out as far, where it stays until a move brings it back: with words
sliding the other way in the same step, a push.

The window moves apart from the camera: the camera keeps what it frames framed in whatever window stands, so
`window.to` and `camera.onto` share a step in either order. Inside the window the camera frames as on the whole
frame, but never so far back that ground shows in the window, coming closer than `zoomAtMost` where it must, so a
block wider than the window at that distance is cut at its edges and a phone's page shows a strip of itself;
framed closer, the window stands still and the page grows in it.

`depth` brings the window that many film pixels toward the eye on its way, larger and farther from the frame's
middle as the eye sees it: a slab coming at the eye with its body; a depth below none takes it back. Keep it under
the eye's focal length: a depth that stands the window at the eye or behind it is refused before anything is
shot. A depth goes on the move's curve and is kept where a move names none. Over the whole frame the window stays
the frame itself, flat on it, at any depth. A window off its plane has the page's picture taken as sharp as
livereel's bound, 2.2.

### Leaning

`window.lean({ tilt, turn, roll, over, about })`, in degrees, leans the window and the screen in it by a move of
its own, so it travels and leans in one `play`: `tilt` leans it back from its top edge, `turn` swings it, `roll`
turns it in its own plane, clockwise, and `over` turns it over round its own width as it then stands, swung and
rolled, top away from the eye, as a slab turned over in the hand. A value left out is kept, and 360 is a whole
turn, so `lean({ turn: 360 })` spins it round once; unrolled and unswung, `over` leans it as `tilt` does. It
turns about its middle until a lean names another point of its box, `about`: `'top'`, `'bottom'`, `'left'`,
`'right'`, `'middle'`, or `{ left, top }` in shares of the box, past it too, which stays where it stood as it
turns, so `window.lean({ tilt: 64, roll: 36, about: 'bottom' })` lies the window back on its foot. The point goes
with the box as it travels and is kept until a lean names another, which a lean may do only while the box faces
the frame unturned, as turning about another point would jump. Over the whole frame the camera stands where it
would to show no edge of a face-on screen, so a lean never moves what it frames; leant far, ground may show at the
frame's far corners. A title, code, the terminal, a piece, an outline, a picture, a thing and a group lean the
same way by their own `lean`.

### Up and down

`screen.rise()` brings the screen up out of the ground from where it stands, and `screen.lower()` takes it down
into the ground, the window's shadow and edge with it: over the move's share of a `play`, or at once in a `cut`.

### Its back

`screen.behind({ html }, { upright: 'over' })` puts a film's own page on the window's back, as a slab wears one:
where the eye sees the window's back, the screen shows it in place of its front, mounted so it stands upright once
the window is turned over round its width, `'over'`, or round its upright, `'round'`. The camera frames it as it
frames the front, so a camera close on a block of the front shows that part of the back: bring the camera to the
whole screen before the window turns. The light, the cursor, a callout, the pins and the objects in the window,
which lie on the front, stand unseen meanwhile; in a room the page lies on the body's back. A back that runs from
the first frame is `screen.behind` and `screen.scrolls` of the same page in the opening `cut`.
`screen.behind('none')` takes it off, and the screen is seen through the window's back, mirrored, as with none.

### Its body

In a room the window may have a body, as a tablet has: a slab of metal round the page, its corners the page's
grown by its rim, in place of the window's edge and shadow. `window.body(body, { within })` sets any of its
values; what a move leaves out stays, and the window opens with no body:

| Value | What it sets | livereel's |
|---|---|---|
| `thickness`, `rim` | how thick the slab is, `0` none, and how far its rim reaches past the page all round, in film pixels | `0`, `6` |
| `metal`, `roughness` | the colour of its metal, in hex with no alpha, and how rough it is, from `0`, a mirror, to `1`, matte | `#454b56`, `0.45` |
| `glass` | how strong the clear coat of glass over the page is, `0` to `1`, a whole coat: 4% reflected face-on, more aslant | `0.4` |
| `glint` | how bright the glint of the slab's own strip of light shines at its brightest, `0` none, `1` the page's white | `0` |

A window with a body from the start sets it in a `cut` as the film's first step. The body comes as the edge and
shadow do, as far as the window stands off the ground and the screen has come up in it, so a page over the whole
frame has none. Its metal and glass show the world's light: with no lights and no soft boxes it stands dark.
Turned past edge-on, the window shows the body's back. It is open in front, so a page that fades shows what
stands behind the window. The glass reflects the soft boxes and the lights, more as the eye sees it aslant, and
dims the page under it by as much: a reflection glides over a dark page as the window turns toward a box, and
hardly shows on a white one. It comes with the body, reflects nothing where the world has no light, and stays
over a page that fades.

The `glint` is a strip of light the slab keeps of its own, standing near before it: a soft diagonal sheen,
leaning up to the left, that goes where the slab goes, moves on the glass as the eye moves and grows as the eye
comes near, where the soft boxes, standing at the world's end, stay still on the frame as the eye moves square to
the glass. It shows with no light in the world, and comes and fades as the glass does. In a `play` the body's
lengths, shares and metal go through the values between; in a `cut`, at once. The body is the window's, not the
look's: a theme or `look.to` names none of its values. Flat, the window keeps its edge and shadow.

```ts
world: { softBoxes: [OVERHEAD, KEY] },
steps: () => [
	cut(window.body({ thickness: 30, glass: 0, glint: 0.012 })), // at rest: a faint sheen, no soft boxes on its glass
	...
]
```

## What else stands in the world

### Every object

A title, code, the terminal, a picture, a piece of the page, an outline, a lens, a thing and the ending card are
objects. What they share:

**Where it stands.** An object stands on the frame where its show names nothing, at a place, and rides with the
eye as it moves. Shown `inside: 'world'`, it stands where it is placed while the eye moves past it, as the window
does, and the eye's focus blurs it as it stands off the focus; its place, and its `depth`, are read as from the
eye at rest, so an eye moved near or past it is not kept in front of it. Flat, it is drawn over the window
wherever it stands; in a room the window and its body hide it where it stands behind them. A title, code, the
terminal or a picture shown `inside: 'window'` stands in the page's window, as a small window of code over the
site's: its place is a box in the window's shares, as no name of a place or split of a format is the window's; it
is carried and slides as if the window's box were the frame, is cut at the window's edge, travels and leans with
the window, shows no more than the screen does, and fades as the screen lowers. It grows and rolls flat on the
window, leans or comes toward the eye only with it, and keeps where it stands from the window's top left corner as
the window grows or shrinks.

```ts
code.show(LINES, { at: { left: 0.45, top: 0.6, width: 0.5, height: 0.3 }, inside: 'window' }),
```

**Names.** Several of one kind stand at once by name: `title.show('Pricing', { at: 'top', as: 'heading' })`
stands beside the title, and each move of it names it, `title.hide({ as: 'heading' })`; a move that names none
takes the one called by its kind, `title`, `code`, `piece`. A name is one object's, whatever it shows: a title
shown `as: 'code'` takes the code's place, and from then on a move of code naming it, `code.light(1)`, is refused
as it begins.

**Coming and going.** Each comes up in its own way: words one after another, the terminal growing, the card
rising. Or whole, in a way the film names, `enter`, and goes in one, `leave`, on its step's curve:

```ts
play({ seconds: 0.9, moves: [title.show('Out of nothing', { enter: 'mask' })] }),
play({ seconds: 0.9, moves: [code.show(LINES, { at: 'left', enter: 'wipe' })] }),
play({ seconds: 0.6, moves: [terminal.hide({ leave: 'iris' })] }),
```

`'fade'` fades its figure in; `'mask'` brings it out from behind an edge of its own, out of nothing, its foot
where `edge` names none, so words rise from under a line just below them; `'wipe'` uncovers it from an edge, its
left where none is named; `'iris'` opens it from its middle; `'grow'` grows it from its middle. The figure is the
object's words, pane, the card's lines or the caps, as wide as what it shows: words on one line as that line;
words on more than one line as wide as their box, so a mask or a wipe from a side crosses that width, and an iris
or a grow works from the box's middle. A pane's shadow comes with it, cut as the mask, wipe or iris cuts the pane.
The ground a title card, a caption or the ending stands on comes up meanwhile, whole half-way. Going, the way runs
back. A caption and keys take ways too. Refused: a way with `from` or `toward`, words typed in a way, and an
`edge` for a way that comes from none.

**Slides and pushes.** `show(…, { from: 'right' })` slides a title, code, the terminal, a picture, a thing or the
card in whole from a frame past that edge, and `hide({ toward: 'left' })` slides it out as far, where a plain
`hide()` lets it go where it stands. One shown `from` a side while one of its name stands pushes that one off past
the side across, so the next slide's words push the last one's away. What slides in one step moves a whole frame,
so what leaves and what comes move as one sheet: the window, a title over the whole frame and the card with its
ground among them.

**Carried.** Every object's `to` but a lens's, as `title.to(place, { scale, depth, through })`, carries it to
another place through the boxes between; a title's words stay as they were. It grows about its middle by `scale`
and comes `depth` film pixels toward the eye, less than the eye's focal length, larger and farther from the
frame's middle as the eye sees it. Each is kept where a move leaves it out. `through` names places it passes on
one curve, as `camera.onto` passes blocks ("The camera"): `title.to('right', { through: ['top'] })`.

**Leant.** `title.lean({ tilt, turn, roll, over, about })` leans it as the window leans ("Leaning"). Turned away
from the eye, it shows its back: a title card's ground or a pane blank, and words on no ground nothing, never
mirrored.

**Standing out.** `title.effects({ ring, glow, shadow, blur, colour, melt, fade, scale, depth, as })`, and so
`code.effects`, `terminal.effects`, `piece.effects`, `outline.effects`, `lens.effects` and `picture.effects`, set
how the object stands out. A show takes the same values but `scale` and `depth` as `effects`, so it comes up
standing out from its first frame:

| Value | What it does |
|---|---|
| `shadow` | a shadow in the look's shadow colour, toward the object's foot, so it turns as the object rolls; 0 none to 1 whole |
| `glow`, `ring` | the accent lit round it, and a line of the accent along its edge; 0 to 1 |
| `colour` | the ring and glow in a colour of the film's, `'#5b8def'`: they go to it from the colour they were seen in, or are in it all along where they rise from none; with none they follow the accent as a look's move changes it |
| `blur` | blurred, in film pixels |
| `melt` | `{ toward: 'right', share: 0.6 }`: it melts into nothing at its right side from 0.6 of it in, as two halves of a page melt toward the middle as they part; its shadow and glow follow what is left |
| `fade` | faded into what lies behind it, its shadow and a piece's walls with it, 0 to 1 |
| `scale`, `depth` | grown about its middle where it stands, and brought toward the eye, so a block lifted off the page grows in place though the film knows no place of it |

A shadow and a glow follow what the object shows, a title's letters, a pane's rounded corners, a lens's round
glass; a ring runs round a title's words, or its card, and along the edge of anything else. An outline's own
line, a piece's lines and its hole's line stay in the look's accent. A melt turned to another side while the
object melts is refused. A block lifted: `piece.effects({ shadow: 1, depth: 160 })` beside `window.shade({ dim:
0.6 })`. A piece lifted off a page the shade has softened comes up as soft, `piece.show(PART, { inside: 'world',
effects: { blur: 4, fade: 0.78 } })`, and sharpens as it rises, `piece.effects({ depth: 60, blur: 0, fade: 0 })`,
where a move of its effects in a cut of its own would come a frame late.

### Groups

`group.show({ at, order, as })` places a group at a place, the whole frame where none is named, and an object
shown with `group: 'stack'` stands in it where it would stand on the frame: `piece.show(PANELS, { as: 'panels',
group: 'stack', zIndex: 1 })`. Then `group.lean({ as: 'stack', tilt: 55, roll: -45 })` and `group.to('whole', {
as: 'stack', scale: 0.5 })` turn, grow and bring near everything in it about the group's middle, or the point its
lean names `about`, each object still as its own moves have it: a piece's own `depth` lifts it off the next layer
of a stack. `group.to(place)` carries the group's middle to the place's; it stays as large as it was placed and
grows by `scale`. `group.hide()` fades everything in it and puts it away, a move of one of its objects still
running then setting nothing more.

Its objects are drawn by their `zIndex`, the higher over the lower, and in the order they came where it is alike,
however the group leans. With `order: 'depth'` the farther are drawn behind the nearer, and no `zIndex` is taken:
cards placed round its middle at depths and turns make a ring that `group.lean({ turn: 360 })` spins. A ring set
round the frame's plane puts its far cards behind the page yet draws them over it: bring the group toward the eye
by the ring's reach, `group.to('whole', { depth })`.

An object joins a group only as it comes, standing in it where it would stand on the frame however the group
stands, leant, grown or brought near, so it stands still as it joins and moves with the group after. A place an
object in a group is carried to, and a block its `back` or `to` reads, is read on the frame and stands where it
would once the group is back as placed. An object in a group never slides in or out. Refused: joining a group
grown and leant at once, as what joined would stand stretched, a group growing across and down its own plane alone.

### Titles

`title.show(text, { at, beside, align, size, letterSpacing, lineHeight, words, from, enter, edge, as, inside,
group, zIndex, effects })` brings words up one after another: over the film's ground across the whole frame, a
screen of words that covers the page, or `at` a place, beside the window on the side across:

```ts
play({
	seconds: 1.6,
	moves: [
		window.to('right'),
		camera.onto(CHART),
		title.show(['A real ', { text: 'click', ink: ACCENT }, ', a real server'], { at: 'left', within: { start: 0.5 } })
	]
})
```

So a heading over code, beside a window on the right:

```ts
title.show('Point the camera', { at: { of: 'left', height: 0.2 } }),
code.show(LINES, { at: { of: 'left', top: 0.25, height: 0.75 } }),
```

Words in a place stand in the middle of their box down it, as large as its width lets, centred in `whole`, `top`
and `bottom` and read from the left anywhere else; `align: 'start'` or `'center'` says otherwise. A title's letters
are as large as the look's `titleSize`, and in a place a share of it no larger than the place's width lets a long
word stand on a line; `size` sets one title's own, in film pixels: `title.show('Live', { at: 'left', size: 220 })`.
Its letters stand as far apart as the look's `titleLetterSpacing` and its lines as `titleLineHeight`;
`letterSpacing` and `lineHeight` set one title's own, in times its letters' size, as CSS's `em`: a name drawn 9 px
closer at 300 px, its lines' feet 290 px apart, is `{ size: 185, letterSpacing: -9 / 300, lineHeight: 290 / 300 }`.
A word is never broken: one larger than its place runs past it, so check it on a still. A line break the film
writes breaks the line there, in a title, a caption, a callout, a note and any run:
`'each step:\nwhy, then the code'` stands on two lines wherever the place's width would have broken it, so a
heading on two lines is one title. In a room, a title in the world is cut where its words run past its box farther
than a pane's shadow reaches.

**Beside a part.** `beside` stands a title, in place of a place, off a point of a part: a block of the page,
`part`, a selector or a box of the screen, or an object, `object`, by its name. It stands on the frame, its
letters as large wherever the eye stands, off that point as the eye sees it on each frame, so it goes with the
part as the eye, the window, the camera and the part move. To the part's `right`, its words read from `gap` film
pixels right of the point, their middle level with it; over its `top`, they read from the point, their foot `gap`
above it. The point lies `along` that side, a share from its top or left, its middle where none is named. The
block is read as the move begins. Its box is a frame wide and high off the point, so its words break only where
the film breaks them. Refused beside `beside`: `at`, `inside`, `group` and `align`; `title.to` carries it nowhere,
so hide it and show it anew.

```ts
title.show('what you asked', { beside: { object: 'task', side: 'right', gap: 70 }, size: 66 }),
title.show('ask it anything', { beside: { part: '[data-testid=agent-words]', side: 'top', along: 0, gap: 24 } }),
```

**Into the world.** `title.intoTheWorld({ as })`, in a `cut`, hands a title on the frame, or beside a part, into
the world where the eye sees it as the move begins: square to the eye, as far before it as the frame's plane, or
as the part's point, as large on the frame as it stood, its words going on as they were. From then on the eye
moves past it, and words beside a part stand beside it in the world: lines left standing as the eye dives past
them. Refused: a title in the world already, inside the window or in a group, and one beside a point at the eye
or behind it.

**How words come.** A title's or a caption's words come up in the way `words` names, the look's where it names
none:

```ts
title.show('Out of nothing', { words: 'mask' }),
title.show('agent diff a bit too long again?', { words: { way: 'mask', atOnce: 6.25 } }),
caption.show('Decoded', { words: 'scramble' }),
title.show(['Film your ', { text: 'live', italic: true }, ' app'], { words: { typed: { seed: 3 } } }),
```

Word by word: `'rise'`, out of a blur, livereel's own; `'sharp'`, rising with no blur; `'fade'`, fading up where
they stand; `'blur'`, coming clear out of a blur there; `'mask'`, each word rising from under its own line, on any
number of lines. Three words are on their way at once, each setting off as the one three before it arrives, so
the last arrives as the move ends; `{ way, atOnce: 6.25 }` names how many, any number more than 0. Letter by
letter: `'letters'`, fading up at an even pace; `'scramble'`, each letter a sign drawn by chance, a new one every
two frames, until it settles into its own a few letters behind those coming. Or typed,
`{ typed: { seed, keyboard } }`, its rhythm drawn from `seed` as `keystrokes` draws it and spread over the move's
share, each key heard on the film's keyboard or the one named, a caret after the last letter until all are. Words
that come by letters stand laid out whole from the start, so no line breaks anew as they come; a run's style, ink
and marker come with each letter.

Going, `title.hide({ toward, leave, edge, words, as })`: words that came word by word go one after another at the
pace they came, or as many at once as `words: { atOnce: 8 }` names, the first first, at an even pace unless the
hide names a curve, each in its way, a mask sinking back under its line and cut there, the others sinking or
fading as a rise run back; words that came by letters go all together, and are named no pace. Refused: `words`
with `from` or `enter` on a show, and with `toward` or `leave` on a hide. A callout's and a note's words come in
the look's way.

**Styled words.** What a title, a caption, a callout or a note says is a string, or a list of strings and runs
read one after another. A run is `{ text }` with any of `italic`, `underline`, `strike`, each `true`; `ink`, its
letters' colour; `marker`, the colour of a marker behind it; colours in hex. An underline or a marker runs on
under the space between two words of one run, and stops where the run does. Put the spaces in the strings.

### Captions, callouts, notes, pins and keys

- `caption.show(text, { words, enter, edge })`, `caption.hide({ words, leave, edge })`: words at the frame's
  foot, or its top in a format with `captionAt: 'top'`, coming and going as a title's do, in place of any caption
  shown. A caption and keys stand over the whole frame where they come up, over every object, the keys over the
  caption, one of each.
- `callout.show(target, text, { side })`, `callout.hide()`: words on a card beside a block, pointing at it,
  `above` where none is named, `below`, `left` or `right`. The camera carries it with the page, as it carries the
  light, and the screen's edge does not cut it.
- `note.show(target, text, { at })`, `note.hide()`: words on the ground beside the window and a line from a dot at
  a block's edge out to them. Its words stand in the words' share on the side of the frame clearest of the window,
  or `at` a place beyond it. The line keeps to the block as the camera moves in the window, and the words keep
  beside the window: they move as far as the middle of its edge facing them does, and never lean with it. A note
  whose words would stand over the window, as while the page fills the frame, is refused.
- `pin.show(target, label)`, `pin.clear()`: a numbered mark on a block's top corner, numbered after those laid
  before, its label running out from the block toward the screen's middle; the labels before it quieten. `clear`
  takes them all away.
- `keys.show(['⌘', 'Enter'], { enter, edge })`, `keys.hide({ leave, edge })`: the caps of a shortcut at the
  frame's foot, as the page is sent it in an act; over a caption there they stand over its words, by a gap,
  however many lines they take, rising as its ground comes up.

### Code and the terminal

`code.show(text, { at, longLines, from, enter, edge, as, inside, group, zIndex, effects })` sets a dark pane of
code `at` a place, beside the page's window or alone, its lines coming up one after another, coloured as
TypeScript is, the indent they share dropped. Its letters are as large as `codeSize` lets, smaller where the
widest line would not fit across, `longLines: 'shrink'`, the default, so keep its lines short or give the words a
larger share (`split: { wordsShare: 0.44 }`); `longLines: 'cut'` keeps them at `codeSize` and cuts a line too long
at the pane's edge, as an editor does. The pane stands no taller than its place, and `code.scrollTo(line, { as })`
scrolls longer code until the line, by its number or what it says, stands at its top, a line each
`codeLineHeight` of its letters' size. `code.light('light.on')` lights the line that says `light.on` and dims the
rest; `code.light(2)` lights the second line, counted from 1; `code.light('cursor.to', { through: 'click' })`
lights the lines from one through the line from it on that says the other. Words no line says, or more than one,
and a line past the last are refused, so a line added that says them too never takes the light without a word.
`code.to`, `code.lean`, `code.effects` and `code.hide({ toward, leave, edge, as })` move it as any object.

```ts
play({ seconds: 1.4, moves: [window.to('right'), camera.onto(CARDS), code.show(LINES, { at: 'left' })] }),
play({ seconds: 1, moves: [code.light('camera.onto'), camera.onto(VISITORS)] }),
play({ seconds: 1, moves: [code.light('light.on'), light.on(VISITORS)] }),
```

`terminal.open(title, { at, from, enter, edge, as, inside, group, zIndex, effects })` brings an agent's terminal
up `at` a place, across most of the frame in its middle where none is named (`{ left: 0.07, top: 0.22, width:
0.86, height: 0.56 }` for a few lines); in a `cut`, there at once. `terminal.type(strokes, { keyboard, as })`
types into it, each key heard; `terminal.submit({ as })`, in a `cut`, presses Enter. `terminal.works(lines,
thinking, { thinkingShare, as })` shows the agent thinking, its spinner beside the words `thinking`, for
`thinkingShare` of the move, 0.22 where none is named, then its lines one after another; a line is
`{ kind, text }`, its kind `asked`, `work` (a tool and what it is used on), `said`, `done` or `thinking`.
`terminal.hide({ toward, leave, edge, as })` lets it go where it stands, or slides it out whole `toward` a side.
`terminal.to`, `terminal.lean` and `terminal.effects` move it as any object.

### The light and the cursor

`light.on(target, { dim })` lights a block and dims the rest by `dim`; `light.to(target)` carries the light to
another; `light.off()` puts it out. The block is read as the light comes.

`cursor.to(target, { entering, bow, into })` moves the cursor along an arc, bent by `bow`, a share of its length,
to a block, from `entering`, a point of the screen, where it is not yet on it. It rests a little into what the
screen shows of the block from its left, at most 60 pixels, just under its middle, or at the point `into` names in
shares of that part from its top left corner: `{ into: { left: 0.8, top: 0.75 } }` low at its right.
`cursor.click(action, { sound })` gives the steps of a click: pressed with its click, `act(action)`, let go; the
camera stops at them. `cursor.press({ sound })` and `cursor.release()` press and let go over shares of a play,
while `cursor.to` goes on; `sound` names a file of the film's in place of the click. `cursor.hide()`, in a `cut`,
takes it off the screen. The cursor lies over the screen, not in it, so a shaded page leaves it as sharp and as
bright as the look draws it.

### Pictures

`picture.show(file, { at, from, enter, edge, as, inside, group, zIndex, effects })` shows a film's own picture, a
mark or a logo, from an image file by its path from the film's file: PNG, JPEG, WebP, AVIF, GIF, or an SVG that
names its width and height. It stands over the whole frame or `at` a place, read as the window reads one, as large
as the place holds all of it, in its middle, as wide against as tall as its file. A file that is not there, or
decodes to no picture, is refused before the first frame. Brought near the eye in the world, a room draws it no
denser than its file holds, an SVG as densely as the eye asks, so give it a file at least as large as the frame
shows it. `picture.to`, `picture.lean`, `picture.effects` and `picture.hide({ toward, leave, edge, as })` move it
as any object.

### Pieces of the page

`piece.show(target, { every, air, corner, hole, lines, picture, inside, body, rides, letters, enter, edge, as,
group, zIndex, effects })` lifts a piece of the page onto the frame: the first `every` blocks a selector matches,
together, or a box of the screen, with `air` pixels of the page round them where named, over where the camera
shows them, cut to the part it shows. `piece.to`, `piece.lean` and `piece.effects` move it as any object;
`piece.back({ as })` takes it back over its source as the camera shows it then, face-on and as large as it was,
without spinning back a whole turn; `piece.hide({ toward, leave, edge, sheen, as })` puts it away.

**Its corners.** Lifted off one block alone, its corners, and its hole's, are as round as the page draws the
block's, each read off its `border-radius` as it is lifted, a share of its box or an ellipse's narrower way, as
large as transforms draw it; a block that paints nothing of its own and holds one block as large, as a wrapper holds
a card, is read off the block it holds. So a film never copies the page's shape. A stretch of the page, with `air`
round its blocks, several blocks or a box of the screen, is as round as `corner` names in the page's pixels, square
where none is named. A corner the camera cuts through is square; one on a corner of what the window shows is as
round as the window. Refused: `corner` for one block alone, and a radius it cannot read, as a `calc()`.

**Its picture.** It is drawn from the page's picture, so it shows what the page shows there as the page changes,
and a page scrolled under it shows what scrolls into that part of the screen. Grown flat past 2.2 times, it is
drawn from a picture of its source alone that close, taken anew as the page changes, so a button grown to the
whole frame keeps its edges. Lifted `picture: 'held'`, it is drawn from a picture of its source alone taken as it
is lifted, as sharp as the page's picture where the page stands still: it shows what the page showed there then,
so a thread lifted off a review stays as it was while the diff under it is shot anew. Only a held piece is lifted
off a film's own page. A piece or a lens shows the holes other pieces leave in its part of the screen,
whatever picture it is drawn from. Refused: a `'dynamic'` page, which has no picture, and a window that leans,
rolls or shows its back.

**Carried.** It does not follow the camera after: carried `to` a place it stands as large as the place holds its
source, in its middle, and grows, comes near, leans, rolls and spins as a title does, a blank card when it turns
away.

**Its hole and lines.** `hole: {}` leaves a hole where it was lifted: the ground the page draws behind the block,
read as it is lifted, the first background the blocks round it draw whole, white where none does;
`hole: { ground: '#f6f7f9', line: 'dashed' }` names its colour, which a box of the screen needs, and rings it. The
hole lies on the page, so the camera and the window carry it, and it goes with the piece. `lines: 'solid'` or
`'dashed'` draws two lines from the source, as the camera shows it, to the piece, as an inset is tied to its place
on a map: along the outline round both, so they cross neither; none while one holds the other.

**Onto another block.** `piece.onto(target, { fall, as })` carries it onto another block of the page, as large as
the block holds its source, to lie on the page there. From the frame it lands on the block wherever the camera
goes on the way, and keeps that place on the screen after, the camera framing it as it frames the page, so a
scroll moves the block from under it; it lies in the window from the moment it sets off, flat on it, under what
stands on the frame and cut at the window's edge, and it sets off only lying flat, face-on and at no depth of its
own; it rolls and grows there but never tilts, turns, turns over, comes near or slides out. Lifted `inside:
'world'`, it sets off from where it stands, however the eye stands and the window is brought near or rolled, and
comes down onto the block as it travels: across on the move's curve and down on the curve `fall` names, the
move's where none is named. `piece.onto(ROW, { ease: easeInOutSine, fall: easeInCubic })` moves a line across
evenly eased and brings it down gathering speed. It then lies on the page in the world, on the page's plane, so
it keeps its body and its shadow, is not cut at the window's edge nor shaded with the page, and goes down with the
screen as the page does, its walls shrinking into its face and its shadow fading with it. Refused: `fall` for a
piece that lies on the page from the moment it sets off.

**Letters on letters.** A piece lifted naming the block of its source whose letters it carries,
`piece.show(ROW, { letters: ROW_CODE })`, lands them letter on letter on the block it is carried onto,
`piece.onto(REVIEW_ROW_CODE)`: grown as far as a letter of the block steps against one of its own, its first
letter where the block's starts, its middle on theirs. Where letters start is read off the block's first letter,
past its padding, as the page lays it out, and in a blank line of code off its content box; how far one steps,
off the font they are set in, a block scaled by a transform or `zoom` too. The film names the block because only
it knows which of a source's letters are the block's: a terminal sets the diff's sign before the code, the review
in a column of its own, so the terminal's page holds the code in a span of its own. The source's letters are read
as it is lifted, the block's as it lands. Refused: landing letters on a box of the screen or a hidden block, and
letters on a film's set.

**Riding its block.** `piece.show(TASK, { inside: 'world', rides: 'its block' })` stands it on the page in the
world, off it as freely as anywhere, so it goes where its block goes. The camera framing the page anew and the
window moving carry it as they carry the page; `page.scrollBy` or `page.scrollTo` in a `play` carries it as far
as it scrolls any block whose scroll carries its source, however the film selects that block, so it stays over
its block as a column slides under it. Those blocks are found as it is lifted (for a box of the screen, the block
shown at its middle too): the ones its source stands in as the browser lays it out, past a block placed
`absolute` or `fixed` the one the browser places it from and none between, so a row of a column fixed to the
screen rides no scroll; a block placed `sticky` is taken as carried, though it stops once it sticks. A fade from
the page it was lifted off lays it where it lays that page, its depth staying in film pixels; a page the screen
cut away from with no fade lies where the screen does. Its hole and pit, its lines, what it draws from the page's
picture, its shadow and words beside it go with it. A scroll an act does, or the page does by itself, carries it
nowhere; off a film's own page nothing the film scrolls carries it, nor the page's run. Carried `to` a
place, it stands there and rides on, refused while the window leans; `back` takes it over its source where the
block stands then; `onto` ends the ride. Refused: riding anywhere but in the world, and on a set.

**A body.** A piece lifted `inside: 'world'` may have a body, as a real button rises out of the page as a column:
`piece.show(STORY, { inside: 'world', body: { thickness: 12, glow: 0.02 }, hole: { ground: '#07090d' } })`, then
`piece.effects({ depth: 11.25, shadow: 1 })`. Its walls go back from its face `thickness` of the page's pixels,
matte, of the colour the page shows along the piece's edge as it is lifted, read at the middle of each side 1.5 of
the page's pixels in and the four mixed, or of the colour `walls` names, at the face darkening to 0.35 of it at the
back, with a light inside them, their own hue at a lightness of 0.6, added as strongly as `glow`, 0 to 1. On the
plane it was lifted from they stand behind the page, which hides them; as `depth` brings the face toward the eye they
come up out of it, growing back from the face as it comes and shrinking into it as it goes, and its shadow lies on
that plane under it, as dark as `shadow` is strong, dropped toward its foot and soft as far as the face stands
high. A room only: flat draws the face and its shadow on the face's own plane. Refused: a body anywhere but in the
world.

**A socket or a pit.** The hole a bodied piece leaves may be a socket it rises out of: `hole: { ground:
'#07090d', reach: 3 }` reaches 3 of the page's pixels past the piece's edge each way, its corners as much rounder,
so its ground shows round the walls. Or a pit sunk into the page: `hole: { reach: 3, pit: { depth: 14, glow:
0.018 } }` sinks it that deep, in the page's pixels, its walls the body's colour, 0.6 of it at the mouth and 0.18
at the floor, lit by `glow` as the body's walls are. The page is cleared over its mouth as far as the piece has
come, so a part lifted shows the pit it left and lying back stands in it; it goes down with the screen and stays
as dark while a shade fades the page, unless its piece stands in the shade. A room only: flat draws the hole in its
`ground`. Refused: a pit on a piece with no body.

**In the shade.** A piece lifted off a shaded page may stand in the window's shade, as soft and faded as its page
as far as it has not risen: `shade: { clearAt: 56 }` has the shade reach it and its walls wholly while its face lies
on the page, less as `depth` brings it toward the eye, and not at all from 56 film pixels on; its pit, a hole in the
page, it reaches wholly however far the piece rises, so the pit stays as dark as the soft page round it. The room
blurs it and its pit by the shade's own law, through the eye's lens in light, and fades them in light into what
stands behind the page, so lying on its page a piece shows as the page round it, but for the shade's `dim`, which
stays the screen's alone, and lifted whole it stands sharp and clear: the film writes no blur or fade of its own for
it. A room only, where the shade blurs the whole window: flat draws it as a piece in no shade. Refused: a piece in
the shade anywhere but in the world.

**A sheen.** Wiped away, a piece may trail a light over the page it leaves: `piece.hide({ leave: 'wipe', edge:
'right', sheen: { colour: '#59c470' } })` runs a band along a line that has landed on its row, the line gone
behind the edge and the page's own row there. The light rises from nothing at the edge to its brightest just
behind it and fades over `width`, 48 film pixels where none is named, across the piece's figure, brightest down
its middle, in the look's accent where no `colour` is named. The edge goes on past the figure's far side as far as
the light trails, so the light runs off before the piece is gone. It is blurred and held as the piece is, and
casts none of its shadow. Several such hides in one `play`, each its own `within`, run at once. Refused: a sheen
with any other way of going.

**Emptying a block.** `piece.empties(ROW, { as })` stands the block the piece is to take the place of hidden, the
ground the page draws behind it over its box, both read as the move begins, until the piece goes: a review comes
up with the rows its lines will land on empty. Wiped away while it lies on the page, the piece and the block go
behind one edge, which sets off from the near side of either and runs past the far side of both, the block's own
row coming out behind it and the light over both. Gone any other way, the block comes back as the piece fades.
Refused: a box of the screen, a film's own page on the screen, and a wipe across the block while the piece
stands off the page.

**In the world.** Lifted `inside: 'world'`, a piece stands over its source on the window's plane wherever the eye
stands, aslant too, so it is taken off any part of the screen the window's picture holds: an eye moved close to a
window that reaches past the frame's foot lifts a button it sees there. On the frame, a piece is taken off what
the camera shows alone, and is lifted, as an outline and a lens are, only while the eye looks straight ahead at
the window from before it, its top up the frame.

**Past the screen's foot.** A piece is cut to the screen it is lifted off. To lift a block its scroller hides past
the screen's foot, scroll the scroller till the block shows, lift the piece held and riding, and scroll back, in
three cuts at one moment, no frame drawn between.

### Outlines and lenses

`outline.show(target, { every, line, enter, edge, as, group, zIndex, effects })` rings a block, the first `every`
a selector matches together, or a box of the screen, a little clear of it, `line` `'solid'` where none is named or
`'dashed'`, in the look's accent whatever colour its `effects` take. It is born where the camera shows its target,
as a piece is, from no picture, so a page framed live takes one too. `outline.to`, `outline.lean`,
`outline.effects`, `outline.back({ as })` and `outline.hide({ toward, leave, edge, as })` move it as a piece is
moved.

`lens.show(target, { magnification, size, enter, edge, as, group, zIndex, effects })` stands a round glass, `size`
320 film pixels across, round a block's middle, showing the page under its own middle `magnification` 2 times as
large as the camera does. Aim it at a block whose middle is what it should show, a number's own element, not one
as wide as its card. `lens.to(target, { as })` carries it round another block's middle, what it shows moving under
it; `lens.effects` and `lens.hide({ toward, leave, edge, as })` as any object. A lens is drawn from the page's
picture, so it is refused where a piece is.

### Things

A thing is a film's own three.js, for what no prop draws and three.js draws in a few tens of lines: an end card
standing in the world, a sheet leant over the page. A room only. `things` names a JavaScript module beside the
film, whose default export builds each thing by a name from the stage's own three, and sets it every exposure from
its numbers and how far it has come up, `shown`, keeping nothing else, so a still at one moment drawn twice is its
check:

```js
// things.js
export default {
	card: {
		build: (three) =>
			new three.Mesh(new three.BoxGeometry(300, 180, 12), new three.MeshBasicMaterial({ transparent: true })),
		set: (built, values, shown, three) => {
			built.rotation.y = values.turn * Math.PI;
			built.material.opacity = shown;
		}
	}
};
```

```ts
export default defineFilm({ drawing: 'room', things: './things.js', ... });
// in the steps
const card = { at: 'whole', reach: { width: 300, height: 180 }, values: { turn: 0 }, inside: 'world' } as const;
play({ seconds: 1, moves: [thing.show('card', card)] }),
play({ seconds: 1, moves: [thing.set({ turn: 0.5 }), thing.to('whole', { depth: 600 })] })
```

`thing.show(made, { at, reach, values, inside, from, as })` shows the thing the module builds by the name `made`
at a place, on the frame or `inside: 'world'`; `reach` is how far it reaches across and up, whole, in film
pixels. Its box is that footprint about the place's middle, from whose middle it is built, a unit a film pixel,
its axes three's own, y up the frame. `thing.to(place, { through, scale, depth })`, `thing.lean({ tilt, turn,
roll, over, about })` and `thing.hide({ toward })` move it as any object; `thing.set(values)` moves its numbers,
each from where it stood, only those it was shown with. Its box's corners say how near the focus it stands and how
far it moves for the motion blur, so a fast turn by `set` is shot unblurred. `set` is handed the stage's `three`
for what it makes anew.

In the world it stands in one scene with the window and every other thing, each hiding the others by depth, each
point blurred by how far it stands from the eye's focus; on the frame it rides with the eye, sharp, before the
window. Built of `MeshBasicMaterial` or a `ShaderMaterial` of its own, it is drawn unlit; of
`MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial` or `MeshPhongMaterial`, it is lit by the
world's `lights` and `softBoxes`; of `MeshToonMaterial`, by its lights alone. A thing on the frame is lit as the
eye at rest would see it. One whose material writes no depth, as glass, is seen through: give it
`depthWrite: false`, as `transparent: true` alone still writes depth and hides what stands behind it. It is then
blurred by its own depth, so glass before a sharp page blurs while the page stays sharp, and glass passing through
a fading page is laid under the page behind its plane and over it before. Three lays a mesh's faces in the order
of its materials, so a see-through box of six materials shows its far faces over its near ones: give glass one
material drawn on both sides, `side: DoubleSide`. A see-through `ShaderMaterial` of the film's own is cut at a
fading page's plane only where it sets `clipping: true` with three's clipping chunks. It comes and goes in its own
way alone, as its module draws `shown` (a material it fades is `transparent`), and takes no ways or effects. Use
three.js as it is: build in the module what three does, never a wrapper round it.

Refused as the film is defined: things in a film not drawn as a room, and a module path not ending in `.js`; as
the stage opens, a module that fails to load or exports no builders; as the move is made, a thing inside the
window or in a group; as it begins, a thing the module builds none of; as the frame is drawn, what the module
throws building or setting one; and `thing.set` of a number the thing was not shown with.

### The ending card

`ending.show({ name, line, command }, { from, enter, edge })` brings up the card, and `ending.hide({ toward,
leave, edge })` takes it away, so a film may open on it too. The card stands over the whole frame on the frame's
own ground, rises as it comes, a chime with it, slides in and out whole with its ground, and is never carried or
leant.

## Where it is seen from

### The camera

The camera chooses what of the page the window shows. `camera.to(pose)` goes to a pose: the whole screen's,
`whole`, which `steps` is handed, or one written out, `{ focusX, focusY, zoom }`. `camera.onto(target, { every,
air, zoomAtMost, through, shape, pace })` frames the first `every` blocks a selector matches, or a box of the
screen, at its middle, `air` of the page's pixels round them, 80 where none is named, no closer than
`zoomAtMost`, in whatever window stands, and keeps them framed as the window moves or leans. Frame by selector, so
one script fits every format. Its zoom goes by even steps of scale, 1 to 4 at 2 half way, the point of the page
that stands at one place on the frame at both ends staying there all the way.

Both pass the poses, or the blocks, `through` names on their way, each framed as its own is, on one curve:
`shape: 'smooth'`, the default, or `'straight'`, and `pace: 'even'`, as long a stretch of the way in each equal
share of the move, the default, or `'keys'`, an equal share from each key to the next. `window.to`, every object's
`to`, `group.to` and `eye.to` take `through`, `shape` and `pace` the same way.

The camera at `whole` shows the page as large in a smaller window, cut by its edge: frame the whole screen,
`camera.onto(screen, { air: 0 })` with the screen's box, and the page stays whole in whatever window stands.

### The eye

The eye is what the film is seen from. The page's window and what is shown `inside: 'world'` are seen from
wherever it stands; what stands on the frame, as a caption, rides with it. It rests straight out from the frame's
middle as far as its focal length, looking at the middle: 2540.5 film pixels at the 24° a film sees where it
names no `angleOfView`.

`eye.to({ at, aim, up }, { through, shape, pace })` stands it `at` a spot, looking at the spot `aim` names, each
`{ across, down, out }` in film pixels from the frame's middle, `out` toward whoever watches, its top pointing
`up`, up the frame, `{ across: 0, down: -1, out: 0 }`, until a film turns it. What a move leaves out stays.
`eye.to('rest')` sends it back to rest. To look straight down at the frame, point its up into it,
`{ across: 0, down: 0, out: -1 }`; to roll the picture, turn `up`. Refused: an eye looking at where it stands, or
within 5° of along its up, as one passing over the top of what it looks at with its up kept would, where the
picture spins round; and an up turned half round in one stretch: turn it through a place between.

`eye.onto(target, { fills, middleAt, turned, pace })` brings it before a block of the page, a selector or a box
of the screen, so near that, seen square, the block fills `fills` of the frame along the side it fills most, its
middle at `middleAt`, a point of the frame in shares of it, the middle where none is named:
`eye.onto('#thread', { fills: 0.94, middleAt: { left: 0.5, top: 0.64 } })`. `turned: { round: -40, up: -14 }`,
in degrees, turns it from square about that middle, still looking at it: `round` the page's upright toward its
right, then `up` toward its top, as a soft box stands round the room; its top stays up the page. A stretch of the
page so wide about a point is a box that wide about it, `fills: 1`. The block is read as the move begins, where
the camera shows it in the window. The eye goes there on straight ways, where it stands and where it looks, by
even steps of scale as the camera zooms, `pace: 'scale'`, the default: the page grows by the same ratio in each
equal share, a draw back that eases its growth. `pace: 'even'` goes as far along its way in each share, the page
growing slowly first and fast near the end: a dive straight in. Refused: a share of none, a middle off the frame,
a turn a quarter round or more, a pace of neither kind, and, as it begins, steps of scale from where the eye
stands at or behind the page's plane.

After `eye.onto` or `eye.fly` the eye rides the window, so a window that leans or travels carries it, until
`eye.to` sends it into the room again.

### A flight

`eye.fly(legs, { shape, heading, tip, turning })` flies the eye over the page's window from where it stands, leg
after leg, as a camera over a desk. A leg is one of these, and any may name how long it `takes`:

- `{ to: { over: '#gap', height: 160 } }`: to a spot `height` film pixels over a block's middle.
- `{ to, arriving: 90, bend: 0.5 }`: on a parabola that arrives heading 90°, right along the page, its turn half
  the leg's chord before the spot.
- `{ ahead: 2 }`: straight on, twice as long as the leg before.
- `{ along: figure }`: along a three.js `Curve` of the film's own, x across, y down and z out in film pixels,
  closed or open, as `new CatmullRomCurve3([...], true)` round a block; set off from where the leg starts wherever
  the film drew it, and never changed after it is handed.
- `{ onto: '#corner', fills: 1, middleAt: { left: 0.6, top: 0.89 } }`: to where `eye.onto` would stand square
  before the block, framed as it frames it; the leg sets the gaze there as it ends, straight down onto the page,
  its top up the page, so the flight comes to rest as `eye.onto` stands.

A leg after another leaves heading as that one arrived, but a figure, which leaves as the film drew it. Legs to
spots join smoothly, `shape: 'smooth'`, the default, never higher or lower than the spots either side, a leg to a
spot before a figure arriving heading the way the figure leaves; `'straight'` joins them at corners. The eye goes
as far in each equal share of the move's curve, and straight on past the way's end on a curve that bounces. Or,
where every leg names how long it `takes`, it passes each leg's end at that leg's share of the move's time:
`[{ to: A, takes: 2 }, { to: B, takes: 2.5 }, { to: C, takes: 3 }]` in a move of 7.5 s passes over A at 2 s and B
at 4.5 s, whatever their lengths, setting off from rest and coming to rest, through each leg's end as fast as
from the end before it to the end after it, but never so fast it would run past the next end and back. Timed so,
the flight takes its share of the step unbent, and names no `ease`.

Its gaze is two values: `heading`, degrees from up the page clockwise, and `tip`, how far its sight lifts off the
page, -90 looking straight down onto it, 0 level, 60 up and away. Each is a list of keys, reached by the end of
leg `by` (0 its start), or past it by a share of the next leg, `by: 1.5` half way through leg 2:

- a heading of `degrees: 90`; of `degrees: { toward: '#story' }`, the block's bearing from where the eye stands as
  the key is reached, held from there; `toward: '#story'`, read all along, so it turns back from wherever the
  block now lies and swings as the eye runs near under it; or `along: 'way'`;
- a tip of `degrees: -90`, or `holding: '#story', at: 0.58`, as far as holds the block that share down the frame.

Each key is read where the eye stands as it flies, so a block held stays held all along and on past the last key;
to hold a block through a leg, name the hold at both its ends. Between two keys the gaze eases from one to the
other over the flight's time, a heading the short way round: where the legs are timed, by their times, so a turn
over a first leg of 2 s takes those 2 s however the eye's pace gathers; where they are not, as the way goes. With
none named it keeps how it set off. It never rolls: a roll it set off with eases away by the end of the first leg.
Heading and tip ease apart, `turning: 'apart'`, the default; `turning: 'whole'` turns the view as one rotation
from how the eye looks at one key, or the first leg's end, to how it looks at the next, the roll it set off with
among it: a dive from looking down aslant to looking level along a row, where apart would swing the heading round
ahead of the tip. A turn of heading alone, or of tip alone, goes the same either way. The blocks are read as the
move begins.

```ts
// Turns to a button over the first leg, lifts its sight to hold it through the second, stands square half way
// through the third
eye.fly(LEGS, {
	heading: [{ by: 0, degrees: { toward: '#story' } }, { by: 1.5, degrees: 0 }],
	tip: [{ by: 0, holding: '#story', at: 0.58 }, { by: 1, holding: '#story', at: 0.58 }, { by: 1.5, degrees: -90 }]
});
// A dive: levels by the gap, runs along it level, lifts once past it
eye.fly(
	[
		{ to: { over: '#gap-start', height: 120 }, arriving: 90, bend: 0.5 },
		{ to: { over: '#gap-end', height: 120 } },
		{ ahead: 2 }
	],
	{ heading: [{ by: 0, degrees: 90 }], tip: [{ by: 0, degrees: 0 }, { by: 1, degrees: 0 }, { by: 2, degrees: 60 }] }
);
```

Flat draws the page from a picture no closer than livereel's bound, so a flight low over it shows it soft: draw it
as a room. Refused: no leg; a leg ahead first, or one to where the eye stands; a figure that gives a point of no
numbers, flat or of no length; a way that reaches the page; a height of none; a tip past ±90; a heading toward a
block, or degrees toward one, the eye stands right over as the key is reached; a key by a leg the way has not, by
below 0, by the end of a leg onto a block, or no later than the key before; a leg that takes no time, or one
naming none beside one that names it; an `ease` beside legs that name `takes`; and a `turning` neither `'apart'`
nor `'whole'`.

## What is sharp

### Focus

`eye.focus(on, { aperture })` focuses the eye so far before it, `eye.focus(1800)` in film pixels; at a spot of
the world, `{ across, down, out }`; on a block of the page, `eye.focus('#thread')`, at its middle; on an object,
`eye.focus({ object: 'why' })`, at its middle; or under a point of the frame, `eye.focus({ under: { left: 0.25,
top: 0.26 } })` in shares of it, where the eye sees the window's plane there as each frame is drawn, so the focus
stays under that point while the window leans and turns beneath it. `aperture` opens it that many film pixels
wide, or it stays as wide as it stands; at rest it is open none, all sharp. What stands in the world nearer or
farther than the focus is drawn as a disc `aperture × focal length × |1/focus − 1/distance|` across, as a camera's
lens draws it: with the eye at rest at 24°, a piece at depth 200 focused on with `aperture: 120` leaves the page
behind it a disc of 10, a soft blur.

The window with all in it, and each object shown `inside: 'world'`, blurs; what stands on the frame or in a group
stays sharp, so captions and titles read. Flat, each is as soft as its point nearest the focus, so what the eye
focuses on is sharp; in a room each point is as soft as its own distance has it, so a window leant back is sharp
where the eye focuses and melts beyond. A window on the ground out of focus spreads past its edge, its shadow with
it; a page filling the frame edge to edge blurs into the ground at the frame's edges, so frame it a little closer
to keep them full. A focus shares a step with `eye.to`, and holds on what it was put on as the eye, the window,
the camera and an object move; a focus pulled from one to another goes evenly in how sharp it leaves things.
Refused: a focus behind the eye, on an object that does not stand, under a point off the frame, or under one
where the eye sees past the window's plane as the move begins; where the window turns so the eye sees past its
plane there later, the focus stands as far as can be.

### The shade

`window.shade({ dim, fade, blur, sharp, sharpSoftens, reaching, blurSeen })` sets the page back while something
stands clear of it, a piece lifted off it, a title or code. It sets only what it names, so it shares a `play` with
`window.to`, `window.lean` and another shade naming others.

- `dim` lays the dark over the screen, the light on it included, and `fade` fades the screen into what lies behind
  it, each from 0 none to 1 whole; `window.shade({ dim: 0 })` takes the dark away. One block lit and the rest
  dimmed is `light.on`.
- `blur` blurs the page and the holes in it, in film pixels on the page, so an eye brought near sees it wider.
  `blurSeen: 'on the frame'` has it as wide on the frame wherever the window and the eye stand, as a lens softens
  by a share of the frame: a page going soft as the eye comes in is as soft on the frame at each moment, and an
  eye diving close over a soft page sees no blur grown wide round it. Flat, the page blurs by one width, as written
  where the frame shows it largest, so a page seen aslant is softer where it stands farther; a room blurring the
  whole window does so at every point. `blurSeen: 'on the page'`, livereel's, takes it back.
- `sharp: '.thread'` keeps a part sharp in the blur, a block or a box of the screen, the page softening into the
  blur over half as far as the blur past it: the part lies on the page, so the camera, the window and the eye
  carry it, and a title over the blur stays as sharp as it stands. A move naming another part keeps it sharp from
  the move's start, never slid: to hand the sharp part on mid-glide, bring the blur to 0 over the glide's first
  half and back with the new part over its second. `sharp: 'none'` keeps none. The part is read off the page on
  the first frame that blurs the page after the move names it, and again after every move of the page, an act, a
  typing or a scroll, and every change the page makes of itself, so it stays on its blocks while the page lays them
  out anew under it. It is drawn from the page's picture, so `sharp` is refused on a page framed live and on a
  film's own page.
- `sharp: { blocks: '[data-testid=row], [data-testid=thread]', across: '[data-testid=card]' }` keeps a stretch of
  blocks sharp that no one block is: every block `blocks` matches, together, as wide across as every block `across`
  matches, where named, which may reach past the blocks. A line and the thread under it stay sharp as wide as the
  thread's card, so a bar the page draws down the line's edge and a scroll bar laid over its end stay soft with the
  page round them. Every match counts, one off the screen or laying out nothing too: scope the selectors to the
  part of the page meant.
- `sharpSoftens: 0.75` softens the part kept sharp three quarters of the way toward the blur, the page round it as
  soft as it was: written beside a lift's `effects`, on its curve and in its time, the part softens as far as the
  piece has risen; `sharpSoftens: 0` makes it sharp again. A share, not pixels, so the part is never softer than
  the page round it. With no part kept, a page goes soft round a lift by `blur` alone.
- `reaching: 'window'` has the shade reach the whole window: in a room its blur and fade reach the window's body,
  its rim and sides fading as far as the page, the page, its outline and the body blurred as one, but the part
  kept sharp; flat, they reach the window's edge and shadow. The dim stays the screen's. `reaching: 'page'`,
  livereel's, keeps the window whole while its page goes, as when one page fades over another.

`reaching` and `blurSeen` hold from the move's start. The window's edge and shadow stay as they stand where the
shade reaches the page alone, and what stands over the page stands clear, the cursor too. What lies over the page
in a room's window, a callout or pins, blurs with it.

```ts
play({ seconds: 1.2, moves: [
	window.shade({ blur: 0, ease: easeInOutSine, within: { end: 0.5 } }),
	window.shade({ blur: 6, sharp: NEXT, ease: easeInOutSine, within: { start: 0.5 } })
] })
```

### Motion blur

Where anything moves fast between frames — the camera, the window, the cursor, the light, an object as it
travels, slides, leans or comes up masked, wiped, opened or grown, code as it scrolls, the page in a lens, a
note's words beside the window — a frame is shot several times along the time from the frame before, each as the
film stood then, and blended: as many times as keep the copies a few pixels apart, so the faster the move, the
more. What a move sets as it begins, as a light put on another block, is not blurred, as nothing moved.
`motionBlur: { shutter, exposuresAtMost }` sets either or both: `shutter`, how much of that time the shutter is
open, from just above 0 to 1, 0.5 where none is given, a film camera's half; `exposuresAtMost`, 2 or more, how
many shots the fastest frame is blended from, 16 where none is given, more for a smoother smear and a longer
shoot. `motionBlur: { enabled: false }` turns it off; `--quality draft` shoots without it.

## How the world looks

### The look

`theme` is the look the film opens on, any of its values; what the film leaves out stays livereel's:

| Value | What it sets | livereel's |
|---|---|---|
| `ground` | the ground's colour at its edges | `#0b0e14` |
| `glow` | the colour the ground lightens to toward where `glowX` and `glowY` put it; a ground named without one is of one colour | `#182033` |
| `glowX`, `glowY` | where the ground's glow stands, across and down, each from 0 to 1 | `0.5`, `0.3` |
| `groundLayers` | layers over the ground and its glow, the first over the rest, as CSS's `background` writes them | `'none'` |
| `ink` | the words of titles, captions, callouts, notes and the ending | `#f4f6fa` |
| `quietInk` | what stands back: a quietened pin's label, the ending's line | `#8b95a7` |
| `accent`, `accentInk` | pins' marks and a note's line, and a pin's number on its mark | `#ffb224`, `#10141b` |
| `font` | titles, captions and the ending, as CSS names a family (`'Inter, sans-serif'`) | the system's sans |
| `mono` | the terminal, the code and the ending's command | the system's monospace |
| `titleSize`, `captionSize` | how large a title's and a caption's letters are, in pixels | `92`, `56` |
| `titleWeight`, `captionWeight` | how heavy they are, 100 to 900 | `700`, `650` |
| `titleLetterSpacing`, `titleLineHeight` | how far apart a title's letters stand past where its font sets them, below `0` closer, and how far below one line's foot the next's stands, each in times its letters' size | `-0.03`, `1.08` |
| `titleMargin` | how far in from the frame's sides a title over the whole frame stands, in pixels | `160` |
| `captionGroundHeight` | how far from the frame's foot, or its top, the ground under a caption darkens, in pixels | `380` |
| `noteSize`, `calloutSize`, `pinSize`, `keysSize`, `codeSize` | how large a note's, a callout's, a pin's label's and a key's letters are, and the code's at most, in pixels | `44`, `20`, `26`, `44`, `26` |
| `terminalSize` | how large the terminal's letters are, in pixels | `25` |
| `endingNameSize`, `endingLineSize`, `endingCommandSize` | how large the ending's name, line and command are, in pixels | `96`, `36`, `38` |
| `codeLineHeight` | how tall a line of code stands, in times its letters' size: the step `code.scrollTo` scrolls by | `1.6` |
| `paneCorner` | how round a pane's corners are — the page's window, the code's pane and the terminal alike — in pixels; `0` square | `24` |
| `paneEdge` | the faint edge round a pane, its alpha how faint | `#ffffff1a` |
| `paneShadow`, `paneShadowColour` | how strong a pane's shadow is, from `0` to `1`, and its colour | `1`, `#000` |
| `terminal`, `terminalInk` | the colour of the terminal, the code's pane, the ending's command and keys' caps, and what is written on them | `#10141c`, `#f4f6fa` |
| `codeComment`, `codeString`, `codeNumber`, `codeKeyword`, `codeCall`, `codeKey` | the code's colours by kind: a comment, a string, a number, a word the language keeps, a function called, a key of an object; made for a dark pane | `#8b949e`, `#a5d6ff`, `#79c0ff`, `#ff7b72`, `#d2a8ff`, `#7ee787` |
| `cursorFill`, `cursorEdge` | the cursor's colour and its edge's | `#111`, `#fff` |
| `cursorSize` | how tall the cursor's arrow stands from its tip to its foot, in pixels of the screen it lies on | `33.5` |
| `words` | how words come up where a film names no way: `'rise'`, `'sharp'`, `'fade'`, `'blur'`, `'mask'`, `'letters'` or `'scramble'` | `'rise'` |

Colours are in hex; sizes in film pixels, scaled to the frame shot, but `cursorSize`, in the screen's pixels.

A font is one the machine has, or one the film brings as a file: `fonts` names each file by its path from the
film's file (TrueType, OpenType or WOFF) under the family the look names it by. One file stands for every weight
and style the look sets it at: a variable font's moves with `titleWeight`, a static one's stays as drawn. Refused
before anything is shot: a font that names nothing the machine has or the film brings, one CSS reads as no family,
and a file read as no font: a fallback nobody asked for is a wrong frame. A family CSS keeps named after it,
`'Inter, sans-serif'`, is a fallback the film asks for.

```ts
fonts: { 'Inter Tight': './InterTight-SemiBold.ttf' },
theme: { font: 'Inter Tight', titleWeight: 600 }
```

The ground's layers are the film's own CSS, laid wherever the ground is: under the window, a title card and the
ending. The ending stands on the frame's own ground, so the pattern stands still as it slides in; a title card
carries its ground with it, so its pattern moves with it. Lengths are in film pixels. The last layer may take a
colour, which covers the ground and its glow. Refused before anything is shot: layers CSS cannot read, and a
picture, `url()`, which the stage would draw only once loaded.

```ts
theme: {
	groundLayers:
		'radial-gradient(#ffffff26 2px, transparent 2.5px) 0 0 / 36px 36px, ' + // a grid of dots
		'linear-gradient(115deg, #ffb22414, transparent 45%)' // a warm light from the left
}
```

`look.to(theme)` changes the look as the film goes, any of the same values. In a `play` it moves there over its
share: a colour through the colours between, a size, a weight, a corner or a shadow through the values between,
a font or `words` half-way, and the ground's layers fading out as the new ones fade in; in a `cut`, at once. A
ground named without a glow takes its glow with it. Fade the ink a little after the ground, or the words pass
through the ground's own grey.

```ts
play({ seconds: 1.2, moves: [look.to({ ground: '#f5efe6', ink: '#1a1a1a' })] }), // the ground turns light
play({ seconds: 1, moves: [look.to({ groundLayers: LINES })] }), // the dots fade into lines
cut(look.to({ font: 'Georgia, serif', paneCorner: 0 })), // a serif, square corners, at once
play({ seconds: 4, moves: [look.to({ glowX: 0.9 }), look.to({ ink: '#1a1a1a' }, { within: { start: 0.5 } })] })
```

### The world's light

`world` is how the world looks as the film opens; what it leaves out stays livereel's, a world of flat light:

| Value | What it sets | livereel's |
|---|---|---|
| `lights` | spotlights standing in the room, each `{ colour, strength, at, aim, angle, softness }` | `[]` |
| `softBoxes` | glowing panels round the room, which faces reflect and are lit by, each `{ colour, brightness, round, up, width, height, lean }` | `[]` |
| `bloom`, `bloomRadius` | how strongly light brighter than the page's white glows round itself, `0` none, as three's bloom takes its strength, and how far the glow spreads, from `0`, nearest, to `1`, widest | `0`, `0.4` |
| `grain` | a faint noise over the ground: `{ levels }`, how many levels of 255 it moves a colour either way, or `{ enabled: false }` | `{ enabled: false }` |

A light stands `at` a spot of the room and aims at another, `aim`, as the eye does, in film pixels from the
frame's middle; `angle` is how far its cone opens from its middle, and `softness` its edge, 0 sharp to 1. It falls
off by the square of the distance: its `strength` is how bright a white face square to it stands at the spot it
aims at, 1 its whole colour, so a thing there stands as bright as written and one coming toward the light
brightens; aim a light at where its thing stands. A light whose aim `world.to` moves farther brightens whatever
else it lights, by the square of how much farther the aim stands. A soft box lights rough faces as well as glossy
ones; it stands turned `round` from straight toward the eye at rest, to the right for more degrees, and `up` from
level, spans `width` and `height` degrees seen from the room's middle, is turned `lean` degrees round its own
middle, and is brightest along its middle. Each colour is hex with no alpha. The lights and the reflections stay
where they stand as the eye moves. They cast no shadow. A still of a polished sphere shows where each glint falls.

```ts
const MIDDLE = { across: 0, down: 0, out: 0 }; // the frame's middle, where the window stands at rest

world: {
	lights: [
		{ colour: '#ffffff', strength: 1.2, at: { across: 150, down: -2000, out: 400 }, aim: MIDDLE, angle: 30, softness: 1 },
		{ colour: '#2a5cff', strength: 1, at: { across: -1700, down: -250, out: -1000 }, aim: MIDDLE, angle: 35, softness: 1 }
	],
	softBoxes: [
		{ colour: '#ffffff', brightness: 12, round: 0, up: 75, width: 33, height: 33, lean: 0 }, // overhead
		{ colour: '#ffffff', brightness: 30, round: -15, up: 24, width: 9, height: 39, lean: 24 } // a key, high on the left
	]
}
```

Boxes as bright as these light a matte thing strongly too. Refused as the film is defined: a light whose cone
opens 90° or more, or that aims at the spot it stands at, and a soft box spanning 180° or more, or turned up past
straight up.

In a room, light brighter than white, a glint on a thing or on the window's body, may glow round itself as a lens
blooms: `bloom` says how strongly, `bloomRadius` how far, the same share of the frame at any size. Only light
brighter than the page's white glows, so a white page and its letters never do; a face lit far past white glows
wide. A glint covering a share of a pixel at the world's edge over the ground comes out dimmer, and may not glow.
The glow lies over the whole frame, titles and the cursor too. `bloom: 0.45, bloomRadius: 0.4` is a strong
studio glow.

A glow fading across a dark ground falls into bands, as eight bits hold a colour in 255 steps. `grain: { levels: 1
}` lays a noise over the ground that hides where one step meets the next: each colour of each pixel moved by about
so many levels either way, still from frame to frame and alike on every shot; at one level a few colours in a
hundred move two. It lies on the ground alone, its layers and the ending's ground with it, under the window and
all else, so a page and the words over it stand as drawn. Flat or a room alike.

`world.to(world)` changes the world as the film goes. In a `play` the glow's strength and spread and the grain's
levels move through the values between, a grain turned off from none; lights as many as those standing move
light by light, each to the one in its place, its colour, strength, spots, cone and softness through the values
between, so a light fades in from `strength: 0` (write the list with it at 0 first); lights of another number, and
the soft boxes, change whole half-way. In a `cut`, at once. Refused by its name: a value of the world in a theme
or `look.to`, and one of the look in a world.

```ts
play({ seconds: 2, moves: [world.to({ bloom: 0.45 }), world.to({ lights: [KEY] }, { within: { start: 0.5 } })] })
```

### Flat, or a room

`drawing` says how the stage draws a frame. `'flat'`, the default, draws as the browser draws a page, the window
and each object on a layer of their own. `'room'` draws the world in WebGL as one scene with one depth, as a 3D
program does, a static page from its own picture; a dynamic page cannot be drawn so, as it stands live in a frame
of its own site, which the browser hands WebGL blank. Shoot a room with `--renderer gpu`.

```ts
export default defineFilm({ drawing: 'room', ... });
```

| | Flat | Room |
|---|---|---|
| A window leant or brought near | as soft as the browser draws a layer in 3D, about one of its pixels a page's pixel | as sharp as the page's picture; what lies over the page in the window as dense as the page's device scale |
| The eye's focus | each plane as soft as its point nearest the focus | each point by its own distance; what stands nearer the eye than all else is blurred apart, its blurred edge showing what it hides |
| The shade's blur and fade, a fast move's blur | in the screen's colours, as the browser blends | in linear light, as a lens gathers it: light words on a dark page stay brighter, a glint streaks as bright as it shines; markup over the page, a film's own page, the holes and a sweep's picture still blend in the screen's colours |
| The window's body | its edge and shadow | a slab of metal and glass, `window.body` |
| A piece's body and pit | its face and shadow; a hole in its `ground` | walls, sockets and pits |
| Markup in the world, a title or a pane | over the window wherever it stands | hidden by the window and its body where it stands behind them, drawn as densely as the eye magnifies it, a picture no denser than it holds |
| The cursor | over the page | over all the world drawn, a lifted piece and its shadow too, never blurred by the focus |
| Things | refused | drawn ("Things") |
| Bloom | none | light past the page's white glows ("The world's light") |

What a room costs and needs:

- In software a frame takes about 150 times as long as on the graphics card; livereel says so as it starts. On the
  card, drawing is a room's slowest step. Glass, a page fading or coming up while a thing stands in the world,
  markup standing in the world, and what stands nearest the eye while the focus blurs it each make a frame slower
  to draw.
- What lies over the page in the window stays as dense as the frame, so a window brought near shows it magnified,
  softer than the page under it. A window that comes from far to cover the frame is laid where it ends and started
  far, `window.to(COVERING, { depth: -3000 })` then `{ depth: 0 }`, never laid small and brought near.
- Markup standing in the world is drawn as densely as the eye magnifies it, up to the graphics card's largest
  texture; one that would ask more is drawn part by part, each as dense as the eye magnifies it and only as far as
  the frame shows it. What shows a picture is drawn no denser than the picture holds: a piece at the zoom its
  picture was taken at, 2.2, or a sharper one's own; a film's own picture at its file's pixels; an SVG as densely
  as the eye asks. Nearer than that, the eye sees the picture stretched. Where the frame shows more of the window's
  plane than the card holds in one texture, as the eye flying low over a tall screen does, what lies over the page
  is drawn less densely; a page's picture larger than the card's largest texture is shrunk whole to fit it.
- It draws through Chrome's HTML-in-Canvas, an experiment behind a flag livereel turns on: livereel pins the
  browser `npx livereel setup` installs, and refuses a browser without it, or one that gives the page no WebGL, as
  the machine's to put right.
- Where the graphics card drops the room's canvas, out of memory or reset, the shoot, clip or still ends at the
  frame that dropped it, saying so with its moment, as the machine's to put right: never a video or a still of the
  blank page Chrome shows in its place.

## What is heard

A film is heard: a click as the cursor presses, a key for every stroke typed, a chime as the ending comes up, each
on its own frame. These are livereel's own, quiet and CC0 ([`sounds/`](sounds/LICENSE.md)), the keys recorded on
real keyboards, each key one of four strikes in turn. `defineFilm` takes:

- `sounds: { keyboard }`, the keyboard the keys are heard on: `membrane`, an office keyboard (Cherry KC 1000),
  where none is named; `mechanical` (WhiteFox); `mechanical-bright`, a brighter, sharper one; `butterfly`, a
  MacBook Pro's of 2018; `laptop`, another laptop's; or `clicky`, a loud click with its release;
- `sounds: { click, key, ending }`, any of them: a file of the film's own in its place, by its path from the
  film's file, any kind ffmpeg reads, or `{ enabled: false }` to turn it off, as
  `sounds: { key: { enabled: false } }`. The click and the ending may stand beside a keyboard; a key given so
  takes the keyboard's place, and is never named beside it;
- `sounds: { keyVolume }`, how loud every key is heard, on any keyboard or from a file in its place: 1 as loud
  as its file. livereel's keys peak about 12 dB under its click: set about 4 for keys heard under music;
- `sounds: { enabled: false }` for none of livereel's but a keyboard a typing names;
- `music: { file, volume }`, a track under the whole film, `volume` 1 as loud as the file, cut to the film's
  length and faded out at its end.

`cursor.click(action, { sound })` and `cursor.press({ sound })` give one click a file of its own;
`page.type(strokes, { keyboard })`, `terminal.type(strokes, { keyboard })` and `screen.type` type on another of
livereel's keyboards, heard whatever the film says of its keys; `sound.play(file)` plays a file of the film's as
its share begins, and moves nothing, so it shares a step with anything. The MP4 and the WebM carry the sound; a
GIF holds none.

## A film its own page draws

A film that outgrows its steps, a world of its own in three.js or a canvas drawn by hand, is a page of the film's
that draws each moment itself, and livereel shoots it as any film: at its rate, whole, as a clip of a span, or a
still.

```ts
import { defineDrawnFilm } from 'livereel';

export default defineDrawnFilm({
	formats: { wide: { frame: { width: 1920, height: 1080 } } },
	address: 'http://127.0.0.1:8741/film.html',
	serve: 'npx http-server -p 8741 -a 127.0.0.1',
	framesPerSecond: 60
});
```

Its page is served as any film's is: here a plain server of the film's folder, which reaches three.js in
`node_modules` by the page's import map. It answers livereel by one global, set as its script runs, before
anything it waits on:

```js
globalThis.livereelDrawnFilm = {
	ready: loaded, // a promise, settled once it can draw
	duration: 70.9, // how long the film is, in seconds
	at: (seconds) => draw(seconds) // the frame at a moment, settled once drawn
};
```

The page is opened at the frame's size, a page's pixel a frame's, and draws as finely as it wants, so `--quality`
asks nothing of it. Its `duration` is read once `ready` settles, so a page may set it then. A moment must draw the
same however the page was asked before, as a still or a clip draws it alone, and nothing on the page may move of
itself, as its time is the wall's. Refused as the film's: a page that sets no such global or one in no form of it,
fails or throws as it gets ready, says a length that is no number of seconds, or throws as it draws. Such a film
is shot with no motion blur and no sound yet.

## Limits

- What livereel films: public pages, and apps served on your machine. An app that signs in is filmed signed in by
  the film itself, as a static page, or as a dynamic one with `stage: 'inside'`; a session the person signs in to
  themselves (two factors, a sign-in elsewhere) is not taken yet ([`TODO.md`](TODO.md)).
- A static page is pictured as sharp as a camera 2.2 times close needs: a camera closer still, by `zoomAtMost` or
  a pose's zoom, shows its text softer. A piece grown closer, flat, is drawn from a picture of its own that close;
  a held one, a leant one and a lens are not.
- A picture of the page, or of a part of it, is taken no larger than Chrome takes one whole: no side past the
  65,500 px a JPEG holds, nor, on a graphics card, past the card's largest texture (16,384 px on an Intel Iris
  Xe), and no more than 2 GiB. One asked larger is taken as large as it may, softer, and livereel warns once,
  naming the zoom past which a camera or a piece shows it softer: at the finest quality, a screen 1040 wide is
  pictured as sharp as a camera 2.2 times close needs up to 3,723 px tall on such a card, and up to 14,886 in
  software.
- A lens magnifies by the camera's zoom alone, and a note's words and pins' labels place themselves by the
  window's box on the frame's plane: neither follows an eye moved from rest.
- Chromium alone, headless.
- The page is asked for reduced motion, and for the light colour scheme unless the film names the dark one. A
  page whose styles animate anyway runs those animations on the wall clock, as the film's time holds its scripts
  alone, so two shots of it differ there; on a static page, a hold shows it stopped where it was captured. The
  page's text caret stands shown and never blinks.
- A page that refuses to be framed (`X-Frame-Options`, a CSP's `frame-ancestors`) is shown as a static page, or
  as a dynamic one on the stage inside the app ("Where the stage stands").

## Development

[`CONTRIBUTING.md`](CONTRIBUTING.md): the setup, the gates, how the source is laid out, and how a release is made.

## License

MIT
