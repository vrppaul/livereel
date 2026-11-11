# livereel

[![CI](https://github.com/vrppaul/livereel/actions/workflows/ci.yml/badge.svg)](https://github.com/vrppaul/livereel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/livereel)](https://www.npmjs.com/package/livereel)
[![Node](https://img.shields.io/node/v/livereel)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

https://github.com/user-attachments/assets/23e46e5f-8c42-454d-b66c-8a264813f884

Film your live web app as a directed short: a camera that travels in a
window that leans, a light on the block that matters, a cursor that moves like a
hand, captions that come up word by word. The app is real — clicks, typing
and its server's answers happen in it — and every frame is shot on a clock
of the film's own, so a slow server costs the film nothing.

A film is a TypeScript file of steps. An agent writes it for you: livereel
comes with a skill that teaches Claude Code to direct one.

## Why not a screen recording

- **The film keeps its own time.** A frame is a moment of the film, however
  long the browser took to draw it: waits, slow answers and loading vanish,
  and the camera moves as smoothly at 60 frames a second, or the rate the
  film names, as it was written.
  Where the camera or a title, code or the terminal moves fast, a frame is
  shot several times along the way and blended, as a film camera's open
  shutter blurs what moves.
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

`examples/example-com.ts` is a longer film, in acts, square or wide;
`examples/livereel-promo.ts`, the film at the top of this page, serves an
app of its own by its own command and clicks it for real; `examples/livereel-recipes.ts` sets a
block of that app apart in eighteen ways, an act each — lifted, grown, under
a lens, in layers, spun — each a few moves of pieces, outlines, a lens,
groups and the window; `examples/livereel-flights.ts` flies the eye low over
it, a run toward its Refresh button and a dive along its row of cards.

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
| `livereel clip FILM_FILE --out DIRECTORY --from SECONDS --to SECONDS` | a span of the film, silent, to look at a few moments in motion without making the whole: `film-square-12-15s.mp4` |
| `livereel still FILM_FILE --out DIRECTORY --at SECONDS` | one frame at a moment, without the video: `film-square-1.5s.jpg` |
| `livereel set FILM_FILE` | the film's set, its app shot once ahead of the film, beside the film's file: `film-square.set/` ("The set") |
| `livereel setup` | installs the browser a film is shot in, and looks for ffmpeg |

| Option | Command | |
|---|---|---|
| `--format NAME` | `shoot`, `clip`, `still`, `set` | the format to shoot, of those the film names; a film of one format needs none |
| `--as mp4\|webm\|gif` | `shoot` | the kind of video, an MP4 where none is named; `--as mp4 --as gif` makes both from one take, each at the film's own frame and rate |
| `--sheet` | `shoot`, `clip` | its frames side by side, a frame a second: `film-square-sheet.png` |
| `--sheet-rate FRAMES_A_SECOND` | `shoot`, `clip` | how many frames a second the sheet shows: 6 to follow a move as an eye does |
| `--quality draft\|finest` | `shoot`, `clip`, `still` | `finest`, the default, shoots at twice the frame's width and height and blurs a fast move as the film says; `draft` shoots at the frame's own size, unblurred: quicker and softer. A room scales a video's frame down to the frame's own size on the graphics card, by the filter ffmpeg scales the flat stage's frames by; a still keeps its frame at the size it is drawn |
| `--renderer software\|gpu` | `shoot`, `clip`, `still`, `set` | where the frames are drawn: in software, the default, or on the graphics card |
| `--profile` | `shoot`, `clip`, `still` | where the shoot's time went: each part of the browser and the footage the frames waited on, its calls, the time each took and its share, the rest, and the blends of exposures; a room's frame is waited on until the graphics card has drawn it, so `stage.draw` is its drawing and `stage.capture` its way out of the browser, a wait a shoot without `--profile` does not make |

Every file is named after the film's file and the format it is shot in.
`livereel --help` gives each command's usage. A command that refuses says
why on stderr, and exits by whose it is to put right: 1 the film, 2 the
command line or the film's file, 3 the machine, which lacks what a film is
shot with, as the browser, ffmpeg or its encoder of the kind asked, or a
Node new enough.

`--renderer gpu` draws the frames on the graphics card, in the same headless
browser, and needs no screen: the promo, wide and blurred, took 98 s
against 289 s, a fast move's blur made at once on the card. It reaches the card through Vulkan on
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
| `act(action)` | the page acted on for real, with Playwright, between two frames: a click, a reply waited for; a cut of `page.act`, which does it at a moment of a play |
| `typing(move)` | as long as the keys of `terminal.type` or `page.type` take, and a beat after |

and the moves of each part of the scene:

- `camera.to(pose, { through })`, `camera.onto(target, { every, air, zoomAtMost, through })`; `through` names the poses,
  or the blocks, the camera passes on its way, each framed as its own is, on one curve: `shape: 'smooth'`, where none is
  named, or `'straight'`, and `pace: 'even'`, as long a stretch of the way in each equal share of the move, where none
  is named, or `'keys'`, an equal share from each key to the next. Every object's `to` and `group.to` take the places
  they pass the same way, `title.to('right', { through: ['top'] })`
- `eye.to({ at, aim, up }, { through })`: the eye the film is seen from, standing `at` a spot, looking at the spot
  `aim` names, each `{ across, down, out }` in pixels of a frame 1080 high from the frame's middle, `out` toward whoever
  watches, and its top pointing `up`, up the frame, `{ across: 0, down: -1, out: 0 }`, until a film turns it. It rests
  straight out from the middle as far as its focal length, looking at the middle: 2540.5 for the 24° a film sees where
  it names no `eye: { angleOfView }`; `eye.to('rest')` sends it back there. The page's window, and what a film shows
  `inside: 'world'`, are seen from wherever it stands; what stands on the frame, a caption, rides with it. What a move
  leaves out stays; an eye looking at where it stands, or within 5° of along its up, as one passing over the top of
  what it looks at with its up kept would, where the picture spins round, is refused, and so is an up turned half
  round in one stretch: point its up into the frame, `{ across: 0, down: 0, out: -1 }`, to look straight down at it
- `eye.fly(legs, { shape, heading, tip })`: the eye flown over the page's window from where it stands, leg after leg:
  `{ to: { over: '#gap', height: 160 } }` to a spot `height` pixels of a frame 1080 high over a block's middle,
  `{ to, arriving: 90, bend: 0.5 }` on a parabola that arrives heading 90° (right along the page), its turn half the
  leg's chord before the spot, `{ ahead: 2 }` straight on, twice as long as the leg before, and `{ along: figure }`
  along a figure of the film's own, any three.js `Curve` with its x across, y down and z out in pixels of a frame
  1080 high, closed or open, set off from where the leg starts wherever the film drew it, and never changed after it
  is handed. A leg after another leaves heading as that one arrived, but a figure, which leaves as the film drew it.
  Legs to spots join smoothly, `shape: 'smooth'`, never higher or lower than the spots either side, a leg to a spot
  before a figure arriving heading the way the figure leaves; or at corners, `'straight'`. The eye goes as far in
  each equal share of the move's own curve, and straight on past the way's end on a curve that bounces. Its gaze is
  two values apart: the heading, degrees from up the page clockwise, and the tip, how far its sight lifts off the
  page, -90 looking straight down onto it, 0 level.
  Each follows rules reached by the end of a leg: degrees, a heading `toward` a block or `along: 'way'`, a tip
  `holding` a block that share down the frame, each read where the eye stands as it flies, so a block held stays held
  all along and on past the last key; between two rules the gaze eases from one to the other by the way flown, a
  heading the short way round, `heading: [{ by: 0, toward: '#story' }, { by: 2, degrees: 0 }]`, `tip: [{ by: 0,
  holding: '#story', at: 0.58 }, { by: 1, holding: '#story', at: 0.58 }, { by: 2, degrees: -90 }]`. It never rolls: a
  roll it set off with eases away by the end of the first leg. The blocks are read as the move begins; the eye then
  rides the window, so a window that leans or travels carries it, until `eye.to` sends it into the room. Flat, the
  page is drawn from a picture no closer than livereel's bound, so a flight low over it shows it soft. Refused: no
  leg, a leg ahead first or one to where the eye stands, a figure that gives a point of no numbers, flat or of no
  length, a way that reaches
  the page, a height of none, a tip past ±90, a heading toward the block the eye arrives right over, a key by a leg
  the way has not or no later than the key before
- `eye.onto(target, { fills, middleAt, turned })`: the eye brought before a block of the page, a selector or a box of
  the screen: so near that, seen square, the block fills `fills` of the frame along the side it fills most,
  `eye.onto('#thread', { fills: 0.94 })`; its middle at `middleAt` of the frame, `{ left: 0.5, top: 0.64 }` in shares
  of it, the frame's middle where none is named; and turned from square about that middle, looking at it,
  `turned: { round: -40, up: -14 }` in degrees, `round` the page's upright toward its right, then `up` toward its top,
  as a soft box stands round the room, square where none is named; its top up the page. A stretch of the page about a
  point, as the promo's stages look, is a box that wide about it, `fills: 1`. The block is read as the move begins,
  where the camera shows it in the window; the eye goes there from where it stands, where it stands and looks each on
  a straight way, and rides the window, as a flight leaves it, so a window that leans or travels carries it, until
  `eye.to` sends it into the room. Refused: a share of none, a middle off the frame, a turn a quarter round or more
- `eye.focus(on, { aperture })`: the eye focused so far before it, `eye.focus(1800)`, at a spot of the world, on a
  block of the page, `eye.focus('#thread')`, on an object, `eye.focus({ object: 'why' })`, or under a point of the
  frame, `eye.focus({ under: { left: 0.25, top: 0.26 } })` in shares of it, where the eye sees the window's plane
  there as each frame is drawn, so the focus stays under that point while the window leans and turns beneath it;
  and open `aperture`
  pixels of a frame 1080 high wide; it rests open none, all sharp. What stands in the world nearer or farther than the
  focus is drawn as a disc `aperture × focal length × |1/focus − 1/distance|` across, as a camera's lens draws it:
  the window, with all in it, and each object shown `inside: 'world'`, each as soft as its point nearest the focus, so
  what the eye focuses on is drawn sharp; drawn as a room, each point of the window and of each such object as soft
  as its own distance has it, so a window leant back is sharp where the eye focuses and melts beyond; what stands on
  the frame or in a group stays sharp. It shares a step with `eye.to`, and holds on what it was put on as the eye moves; a focus pulled from
  one to another goes evenly in how sharp it leaves things. A focus on what stands behind the eye is refused, and one
  under a point off the frame, or where the eye sees past the window's plane as the move begins; where the window
  turns so the eye sees past its plane there later, the focus stands as far as can be
- `window.to(place, { depth })`, `window.show({ at, from })`, `window.hide({ toward })`, `window.lean({ tilt, turn, roll, over, about })`,
  `window.shade({ dim, fade, blur, sharp })`, `window.body({ thickness, rim, metal, roughness, glass }, { within })`
- `light.on(target, { dim })`, `light.to(target)`, `light.off()`
- `callout.show(target, text, { side })`, `callout.hide()`
- `note.show(target, text, { at })`, `note.hide()`
- `pin.show(target, label)`, `pin.clear()`
- `keys.show(caps, { enter, edge })`, `keys.hide({ leave, edge })`
- `cursor.to(target, { entering, bow })`, `cursor.click(action, { sound })`, `cursor.press({ sound })`,
  `cursor.release()`, `cursor.hide()`
- `title.show(text, { at, beside, align, size, letterSpacing, lineHeight, from, enter, edge, words, as, inside, group, zIndex })`,
  `title.to(place, { scale, depth })`, `title.lean({ tilt, turn, roll, over, about })`, `title.hide({ toward, leave, edge, words })`
- `code.show(text, { at, from, enter, edge, longLines, as, inside, group, zIndex })`,
  `code.to(place, { scale, depth })`, `code.lean({ tilt, turn, roll, over, about })`, `code.light(line, { through })`,
  `code.scrollTo(line)`,
  `code.hide({ toward, leave, edge })`; each move of a title or code takes `as` to name which
- `caption.show(text, { enter, edge, words })`, `caption.hide({ leave, edge, words })`; a caption and keys stand over the
  whole frame where they come up, over every object, the keys over the caption, one of each
- `screen.rise()`, `screen.lower()`, `screen.shows(page, { within })`, `screen.behind(page, { upright, within })`,
  `screen.shows(page, { reaches })`, `screen.scrolls(page, { pace })`, `screen.scrollTo(page, selector, { top })`,
  `screen.type(page, strokes, { into, keyboard })`, `screen.sweep({ from, slant, round, width, crest })`
- `terminal.open(title, { at, from, enter, edge, inside, group, zIndex })`, `terminal.type(strokes, { keyboard })`,
  `terminal.submit()`, `terminal.works(lines, thinking, { thinkingShare })`, `terminal.to(place, { scale, depth })`,
  `terminal.lean({ tilt, turn, roll, over, about })`, `terminal.leave({ toward, leave, edge })`; the terminal stands `at` a place, read as
  the window reads one, across most of the frame in its middle where none is named; each move of it takes `as` to
  name which
- `piece.show(target, { every, air, corner, hole, lines, picture, body, enter, edge, as, inside, group, zIndex })`,
  `piece.to(place, { scale, depth })`, `piece.onto(target)`, `piece.lean({ tilt, turn, roll, over, about })`, `piece.back()`,
  `piece.hide({ toward, leave, edge })`; a piece of the page lifted off a selector's blocks or a box of the screen, with
  `air` pixels of the page round them where named, onto the frame, its corners and its hole's as round as `corner` names,
  in the page's pixels (a rounded card's own `border-radius`), square where it names none, and as round as the window
  at a corner standing on a corner of what the window shows, leaving a `hole: { ground, line }` and drawing `lines` to its
  source where named; drawn from the page's picture as it changes, or, `picture: 'held'`, from a picture of its source
  held as it is lifted; `inside: 'world'`, with a `body: { thickness, walls, glow }` where named; carried `onto` another
  block, it lies on the page there, in the window, and keeps that place on the screen as the camera moves; each move of
  it takes `as` to name which
- `outline.show(target, { every, line, enter, edge, as, group, zIndex })`, `outline.to(place, { scale, depth })`,
  `outline.lean({ tilt, turn, roll, over, about })`, `outline.back()`, `outline.hide({ toward, leave, edge })`; a ring round a
  selector's blocks or a box of the screen, `'solid'` or `'dashed'`; each move of it takes `as` to name which
- `lens.show(target, { magnification, size, enter, edge, as, group, zIndex })`, `lens.to(target)`,
  `lens.hide({ toward, leave, edge })`; a round glass over the page, showing what lies under its middle magnified; each
  move of it takes `as` to name which
- `picture.show(file, { at, from, enter, edge, as, inside, group, zIndex })`, `picture.to(place, { scale, depth })`,
  `picture.lean({ tilt, turn, roll, over, about })`, `picture.hide({ toward, leave, edge })`; a picture of the film's own, a
  mark or a logo, from an image file by its path from the film's file (PNG, JPEG, WebP, AVIF, GIF, or an SVG that
  names its width and height), over the whole frame or `at` a place, read as the window reads one, drawn as large as
  the place holds all of it, in its middle, as wide against as tall as its file; a file that is not there, or decodes
  to no picture, is refused before the first frame. It is drawn at the frame's density wherever it stands, as all
  markup is: brought near the eye in the world it is magnified, as a title is; each move of it takes `as` to name which
- `thing.show(made, { at, reach, values, inside: 'world', from, as })`, `thing.to(place, { through, scale, depth })`,
  `thing.lean({ tilt, turn, roll, over, about })`, `thing.set(values)`, `thing.hide({ toward })`: a thing of the film's own
  three.js, built by the film's things module by the name `made`, in a room alone ("Flat, or a room")
- `title.effects({ ring, glow, shadow, blur, colour, melt, scale, depth })`, and so `code.effects`,
  `terminal.effects`, `piece.effects`, `outline.effects`, `lens.effects` and `picture.effects`: how the object stands out, ringed and
  glowing in the accent or a `colour` of the film's, casting a shadow, blurred, melting toward a side, grown or
  brought toward the eye where it stands
- `group.show({ at, order })`, `group.to(place, { scale, depth })`, `group.lean({ tilt, turn, roll, over, about })`,
  `group.hide()`; a group of objects, turned, grown and brought near as one, each object in it as its own moves have
  it, drawn by the `zIndex` its show names, the higher over the lower, or, with `order: 'depth'`, the farther behind
  the nearer; each move of it takes `as` to name which
- `ending.show({ name, line, command }, { from, enter, edge })`, `ending.hide({ toward, leave, edge })`, so a film may
  open on the card too;
  the card stands over the whole frame on the frame's own ground, slides in and out whole, and is never carried or
  leant
- `page.scrollBy(selector, { pixels })`, `page.scrollTo(selector, { top })`, `page.type(strokes, { keyboard })`,
  `page.act(action, { within: { start } })`, `page.speed(speed)`
- `sound.play(file)`

A target is a selector, the first `every` blocks it matches, or a box of the
page's screen, `{ left, top, width, height }` in its pixels, for what a page
draws with nothing to select: a canvas, or a frame exported from a design.

`cursor.click` and `typing` give several steps, spread among the others:
`...cursor.click(action)`. An act's `action` is handed a `context`, whose
`context.page` is Playwright's `Frame` of the filmed page.

The camera stops at those steps. To click while it goes on, write the click
into a play: the cursor's press, `page.act` at its end, and its release, each
over a share of the step, while `cursor.to` and the camera go their way. The
film's time stands while the page answers, and a move that begins at the act's
moment reads the page the act left. An act takes no time: it is refused only
where a scroll or a typing of the page runs across its moment. The press and
the release take their shares in the play's seconds, so give them about
0.09 s and 0.12 s of it, as a click's are.

```ts
play({ seconds: 3, moves: [
  camera.to({ focusX: 520, focusY: 400, zoom: 1.2 }),
  cursor.to('#dark', { within: { end: 0.4 } }),
  cursor.press({ within: { start: 0.4, end: 0.43 } }),
  page.act((context) => context.page.locator('#dark').click(), { within: { start: 0.43 } }),
  cursor.release({ within: { start: 0.43, end: 0.47 } })
] })
```

A pose is the whole screen's, `whole`, which `steps` is handed, or one
written out, `{ focusX, focusY, zoom }`. The camera chooses what of the page
the window shows, its zoom going by even steps of scale, 1 to 4 at 2 half
way, the point of the page that stands at one place on the frame at both
ends staying there all the way; the window leans, `window.lean({ tilt, turn,
roll, over, about })`, the screen in it with it, by a move of its own, so it travels
and leans in one `play`. Every move that runs over time
takes a share of its step, `within: { start, end }`, and a curve of its own,
`ease`: `linear`, `easeInOutSine` (a step's own), `easeInOutCubic`,
`easeOutCubic`, `easeOutQuint`, or `easeOutBack`, which passes its end and
settles back on it; or one of a film's own numbers: `cubicBezier(0.4, 0,
0.2, 1)` as CSS's `cubic-bezier()`, `atSpeeds({ settingOff, arriving })`,
which sets off and arrives at those speeds, each from 0 to 3 times its
mean, so a move set off at the speed the one before arrived at, counted in
its own mean's terms, runs on from it with no jolt, and `softThenHeld(0.4)`, which sets off
from rest, is at its fastest at 0.4 of its time and holds that speed to its
end, as a dive that runs on does. `keystrokes(text, { seed, slipAt, pace })`
types the way a person does: unevenly, with a slip now and then;
`keystrokes(text, { lettersPerSecond: 12 })` types evenly, a letter every
twelfth of a second, the first a twelfth after the typing starts, as a cut
that types on a beat does.

### Titles, and words set their own way

A title is words that come up one after another: over the film's ground
across the whole frame, a screen of words that covers the page, or `at` a
place on the frame, beside the page's window on the side across:

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

A place is a name, `whole`, `left`, `right`, `top` or `bottom` or one the
format names (below, "Formats"), or a box in shares: of the frame edge to
edge, or of another place it names `of`, its `left` and `top` 0 and its `width` and `height` 1 where it leaves them out.
A name is each one's own: on a side, words take their share of the frame
and the window the whole room across from the words' share on the other
side, so words `at: 'left'` and a window `to('right')` stand clear of each
other; `whole` is, for words, the frame inside the margin they keep from its
edges, and for the window the frame itself. A box may reach past the frame.
So a heading over code, beside a window on the right:

```ts
title.show('Point the camera', { at: { of: 'left', height: 0.2 } }),
code.show(LINES, { at: { of: 'left', top: 0.25, height: 0.75 } }),
```

Words in a place stand in the middle of their box down it, as large as its
width lets, centred in `whole`, `top` and `bottom` and read from the left
anywhere else; `align: 'start'` or `'center'` says otherwise. A title's
letters are as large as the look's `titleSize`, and in a place a share of
it no larger than the place's width lets a long word stand on a line;
`size` sets one title's own, in pixels of a 1080 frame, over the whole
frame or in a place alike: `title.show('Live', { at: 'left', size: 220 })`.
Its letters stand as far apart as the look's `titleLetterSpacing` and its
lines as far apart as `titleLineHeight`; `letterSpacing` and `lineHeight`
set one title's own, each in times its letters' size, as CSS's `em`, so
they hold at any size. The claude-review promo's name, drawn 9 px closer
at 300 px, its lines' feet 290 px apart:
`title.show('claude review', { at, size: 185, letterSpacing: -9 / 300, lineHeight: 290 / 300 })`.
A word is never broken: one larger than its place runs past it, so check
it on a still. A line break the film writes breaks the line there, in a
title, a caption, a callout or a note, and in any run of its words:
`title.show('each step:\nwhy, then the code', { at })` stands on two lines
wherever the place's width would have broken it. In a room, a title standing in the world is cut where its
words run past its box farther than a pane's shadow reaches.

A title stands `beside` a part in place of a place: a block of the page,
`part`, a selector or a box of the screen, or an object a film names,
`object`, a piece lifted off the page among them. It stands on the frame,
its letters as large wherever the eye stands, off a point of that part as
the eye sees it on each frame, so it goes with the part as the eye, the
window, the camera and the part itself move. To the part's `right`, its
words read from `gap` pixels of a 1080 frame right of the point, their
middle level with it; over its `top`, they read from the point, their foot
`gap` above it. The point lies `along` that side, a share of it from its
top or left, its middle where none is named. The claude-review promo's
lines beside its plates, and the line over its agent's words:

```ts
title.show('what you asked', { beside: { object: 'task', side: 'right', gap: 70 }, size: 66 }),
title.show('each step:\nwhy, then the code', { beside: { object: 'step', side: 'right', along: 0.3, gap: 70 } }),
title.show('ask it anything', { beside: { part: '[data-testid=agent-words]', side: 'top', along: 0, gap: 24 }, size: 88 }),
```

A block is read as the move begins, what the screen shows of it, as a
callout's is. Words beside an object go with it, as what stands in a group
goes with the group. Its box is a frame wide and high off the point, so its
words break only where the film breaks them; it names no `at`, `inside`,
`group` or `align`, and `title.to` carries it to no place: hide it and show
it anew.

A title's or a caption's words come up in the way `words` names, the
theme's where it names none:

```ts
title.show('Out of nothing', { words: 'mask' }),
title.show('agent diff a bit too long again?', { words: { way: 'mask', atOnce: 6.25 } }),
caption.show('Decoded', { words: 'scramble' }),
title.show(['Film your ', { text: 'live', italic: true }, ' app'], { words: { typed: { seed: 3 } } }),
```

Word by word, one after another: `'rise'`, out of a blur, livereel's own;
`'sharp'`, rising with no blur; `'fade'`, fading up where they stand;
`'blur'`, coming clear out of a blur there; `'mask'`, each word rising from
under its own line, on as many lines as it takes. Three words are on their
way at once, each setting off as the one three before it arrives, so the
last arrives as the move ends; `{ way: 'mask', atOnce: 6.25 }` names how
many, any number more than 0, as the claude-review promo's line rises, a
word every 0.08 s, each in 0.5 s. Letter by letter:
`'letters'`, fading up one after another at an even pace; `'scramble'`,
each letter standing as a sign drawn by chance, a new one every two frames,
until it settles into its own a few letters behind those coming. Or typed,
as a person types: `{ typed: { seed } }`, its rhythm drawn from `seed`, as
`keystrokes` draws it, and spread over the move's share of its `play`,
which sets how fast it is typed; each key is heard on the film's keyboard,
or on the `keyboard` named, and a caret follows the last letter typed until
every one is. Words that come by letters stand laid out whole from the
start, so no line breaks anew as they come; a run's style, ink and marker
come with each letter. Going, words that came word by word go one after
another at the pace they came, or as many at once as the hide names,
`title.hide({ words: { atOnce: 8 } })`, the first first, at an even pace
unless it names a curve, each in its way, a mask's sinking back under its
line, cut there as it sinks so it never shows over the line below, the
others sinking or fading as they rose, slow at first, as a rise run back;
words that came by letters go all together, and are named no pace. Words
come in their way only where their
title or caption comes up in its place in its own way: `words` with `from`
or `enter` is refused, and they go at a pace only where it goes in its own
way: `words` with `toward` or `leave` is refused. A callout's and a note's
words come in the theme's way.

Words in a place travel: `title.to(place)` and `code.to(place)` carry them
to another place through the boxes between, a title reading as it did;
`show(…, { from: 'right' })` slides them in whole from a frame past that
edge, and `hide({ toward: 'left' })` slides them out as far, whole, where
a plain `hide()` lets them go where they stand. A title or code shown
`from` a side while one of its name stands pushes it off past the side
across, so the next slide's words push the last one's away. Everything that
slides in one step moves a whole frame, so what leaves and what comes move
as one sheet, a push; the ending card slides so too, its ground with it
(`ending.show(card, { from })`, `ending.hide({ toward })`), and so does a
title over the whole frame.

What comes up in its place — a title, code, the terminal, the card, a
caption, keys — comes up in its own way, words one after another, the
terminal growing, the card rising; or whole, in a way the film names,
`enter`, and goes in one, `leave`:

```ts
play({ seconds: 0.9, moves: [title.show('Out of nothing', { enter: 'mask' })] }),
play({ seconds: 0.9, moves: [code.show(LINES, { at: 'left', enter: 'wipe' })] }),
play({ seconds: 0.6, moves: [terminal.leave({ leave: 'iris' })] }),
```

A way brings the object's figure — its words, its pane, the card's lines,
the caps — whole: `'fade'` fades it in; `'mask'` brings it out from behind
an edge of its own, out of nothing, its foot where `edge` names none, so
words rise from under a line just below them; `'wipe'` uncovers it from an
edge, its left where none is named; `'iris'` opens it from its middle;
`'grow'` grows it from its middle. The figure is as wide as what it shows:
words on one line as that line, keys as their caps. A pane's shadow comes
with it, as strong as the way has come where a mask, a wipe or an iris cuts
it, so a pane masked from its foot rises from under a line as far below it
as the shadow falls. The ground a title card, a caption or the ending card
stands on comes up meanwhile, whole half-way. Going, the way runs back, a
mask behind its edge. A way runs on its step's curve. It is one or the
other with a slide: a way with `from` or `toward` is refused, and so are
words typed in a way, and an `edge` for a way that comes from none. Words
on more than one line stand as wide as their box, so a mask or a wipe from
a side crosses that width, and an iris or a grow works from the box's
middle.

A title, code or the terminal leans as the window does: `title.lean({ tilt:
12 })` leans it back from its top edge, `code.lean({ turn: -8 })` swings
it, `roll` turns it in its own plane, clockwise, and `over`
turns it over round its own width as it then stands, swung and rolled, top
away from the eye, as a slab turned over in the hand; a value left out is
kept as it stands, and 360 is a whole turn, so `lean({ turn: 360 })` spins
it round once. Unrolled and unswung, `over` leans it as `tilt` does. It
turns about its middle until a lean names another point of its box,
`about`: `'top'`, `'bottom'`, `'left'`, `'right'`, `'middle'`, or `{ left,
top }` in shares of the box, past it too, which stays where it stood as it
turns, so `window.lean({ tilt: 64, roll: 36, about: 'bottom' })` lies the
window back on its foot; the point goes with the box as it travels, and is
kept until a lean names another, which one may do only while it faces the
frame unturned, as turning about another point would jump. As it is carried it grows about its middle,
`code.to('right', { scale: 1.4 })`, and comes `depth` pixels of a frame 1080
high toward the eye, less than the eye's focal length, larger and farther
from the frame's middle as the eye sees it; each is kept as it stands where
it is left out, and set by the move only where it is named. Turned away from the
eye, it shows its back: a title card's ground or a pane blank, and words on
no ground nothing, never mirrored. A lean shares a `play` with a move that
carries it, and with `code.light`.

An object stands out by `effects`: `piece.effects({ shadow: 1, depth: 160
})` lifts it off the page where it stands, casting a shadow in the look's
shadow colour as it comes toward the eye; `glow` lights the accent round
it and `ring` draws a line of the accent along its edge, each from 0 none
to 1 whole, as `shadow` is, and `blur` blurs it, in pixels of a frame 1080
high. `colour: '#5b8def'` draws the ring and the glow in a colour of the
film's, which they go to from the colour they were seen in, the accent's
as it stood where they had none, or in the colour named all the way where
they rise from none; where a film names none they follow the accent, as a
look's move changes it. An outline's own line, a piece's lines and its
hole's line stay in the look's accent. `melt: { toward: 'right', share:
0.6 }` melts what it shows into nothing at its right side, from 0.6 of it
in, as two halves of a page melt toward the middle as they part; its
shadow and glow follow what is left, and what it draws past its edges
stands whole where it does not melt. A melt turned to another side while
the object melts is refused; one that only melts draws no filter.
`scale` grows it about its middle where it stands, as `to` grows it
where it goes, so a block lifted off the page grows in place though the
film knows no place of it; `depth` brings it near the eye, larger and
farther from the frame's middle. A shadow and a glow follow what the
object shows, a title's letters, a pane's rounded corners, a lens's round
glass; a ring runs round a title's words, or its card where it stands on
one, and along the edge of anything else. The shadow falls toward the
object's foot, so it turns as the object rolls, as a pane's own shadow
does. The move sets only the values it names, the rest kept as they
stand, so it shares a `play`
with a move that carries or leans the object, and with another `effects`
naming others. An object comes up standing out in no way.

Several titles or panes of code stand at once by name:
`title.show('Pricing', { at: 'top', as: 'heading' })` stands beside the
title, and each move of it names it, `title.hide({ as:
'heading' })`; a move that names none takes the one called `title`, or
`code`. A name is one object's, whatever it shows: a title shown `as:
'code'` stands in place of the code, and from then on a move of code
naming it, `code.light(1)`, is refused as it begins: each kind's moves take
only what shows that kind.

`piece.show(VISITORS)` lifts a piece of the page onto the frame: the blocks
a selector matches, the first `every` of them together, or a box of the
screen, over where the camera shows them, cut to the part it shows. It is
drawn from the page's picture, so it shows what the page shows there as the
page changes, and a page scrolled under it shows what scrolls into that
part of the screen; a film whose page is `'dynamic'` has no picture and is
refused, as is a window that leans, rolls or shows its back. Drawn flat larger than
the page's picture holds it, past 2.2 times, it is drawn from a picture of its
source alone that close, taken anew as the page changes, so a button grown
to the whole frame keeps its edges crisp. Lifted `picture:
'held'`, `piece.show('.thread', { picture: 'held' })`, it is drawn from a
picture of its source alone, taken as it is lifted, as sharp as the page's
picture where the page stands still: it shows what the page showed there
then, so a thread lifted off a review stays as it was while the diff under
it is shot anew. It does not follow the camera after:
carried `to` a place it stands as large as the place holds its source, in
its middle, and grows, comes near, leans, rolls and spins as a title does,
a blank card when it turns away. `piece.onto('#agent-panel')` carries it
onto another block of the page, as large as the block holds its source, to
lie on the page there: it lands on the block wherever the camera goes on
the way, and keeps that place on the screen after, the camera framing it
as it frames the page, so a scroll of the page moves the block from under
it. It lies in the window as the page does, flat on it, under what stands
on the frame and cut at the window's edge, from the moment it sets off; from
the frame it sets off only lying flat, face-on and at no depth of its own,
and it never slides from the page. `piece.back()` takes it back over its source as the
camera shows it then, face-on and as large as it was, without spinning back
a whole turn; `piece.hide()` puts it away.

`piece.show(VISITORS, { hole: {} })` leaves a hole where the piece was
lifted: the ground the page draws behind the block, read as it is lifted,
the first background the blocks round it draw whole, white where none
does; `hole: { ground: '#f6f7f9', line: 'dashed' }` names its colour, which
a box of the screen needs, and rings it. The hole lies on the page, so the
camera and the window carry it, and goes with the piece. `lines: 'solid'`
draws two lines from the source, as the camera shows it, to the piece, as an
inset is tied to its place on a map: along the outline round both, so they
cross neither; none while one holds the other, as while the piece stands
over its source. `outline.show(CHART, { line: 'dashed' })` rings a block or a box
of the screen a little clear of it, born where the camera shows it as a piece
is, from no picture, so a page framed live takes one too; it travels,
grows, turns and goes back as a piece does. `lens.show(REVENUE)` stands a
round glass, 320 pixels of a 1080 frame across, round the block's middle,
showing the page under its own middle twice as large as the camera does, or
as `magnification` and `size` say; `lens.to(CHART)` carries it round
another block's middle, and what it shows moves under it. A lens is drawn
from the page's picture as a piece is, refused where a piece is. A piece or
a lens shows the holes other pieces leave in its part of the screen as
they stand, whatever picture it is drawn from: a piece of the whole screen
under the pieces lifted off it shows where they were.

`group.show({ at: 'whole', as: 'stack' })` places a group, and an object
shown with `group: 'stack'` stands in it, where it would stand on the frame:
`piece.show(PANELS, { as: 'panels', group: 'stack', zIndex: 1 })`. Its
objects are drawn by their `zIndex`, the higher over the lower, and as
they came where it is alike, however the group leans. Then
`group.lean({ as: 'stack', tilt: 55, roll: -45 })` and `group.to('whole', {
as: 'stack', scale: 0.5 })` turn and shrink everything in it about the
group's middle, each object still as its own moves have it: `piece.to`
with a `depth` lifts one layer of a stack off the next, and cards placed
round the middle of a group shown with `order: 'depth'` at depths and
turns make a ring that `group.lean({ turn: 360 })` spins, the far cards
drawn behind the near; such a group takes no `zIndex`.
`group.hide()` fades everything in it and puts it away with the group,
whatever else moves it then: a move of one of its objects still running
sets nothing more. `group.to(place)` carries the group's middle to the
place's; it stays as large as it was placed and grows by `scale`. An
object joins a group only as it comes, standing in it where it would stand
on the frame however the group stands, leant, grown or brought near, so it
stands still as it joins and moves with the group after; a group grown and
leant at once is refused, as what joined it would stand stretched, a group
growing across and down its own plane alone. It never slides in or out
past the frame's edge. A place an object in a group is
carried to, and a block its `back` or `to` reads, is read on the frame and
stands in the group where it would stand once the group is back as it was
placed.

A title, code, the terminal or a piece of the page stands on the frame where
it names nothing, and rides with the eye as it moves; shown `inside:
'world'`, it stands where it is placed while the eye moves past it, as the
page's window does, and the eye's focus blurs it as it stands off it. Its
place is read as from the eye at rest. Flat, it is drawn over the window
wherever it stands; drawn as a room, it stands in the world's one scene,
hidden by the window and its body where it stands behind them and over them
where it stands before, and the eye's focus blurs each point of it by how
far it stands, its shadow and its letters' edges seen through to the page
behind. Its `depth` still counts from the eye at rest, so an eye
moved near or past it is not kept in front of it. A piece lifted `inside:
'world'`, `piece.show('#why', { inside: 'world' })`, stands over its source
on the window's plane wherever the eye stands, aslant too, so it is taken
off any part of the screen the window's picture holds: an eye moved close
to a window that reaches past the frame's foot lifts a button it sees
there, which the eye at rest does not. On the frame, a piece is taken off
what the camera shows there alone. `piece.onto`
carries it from the world onto the page where it stands, wherever the eye
stands and however the window is brought near or rolled, while it lies on
the window's plane, face-on to the window and at its depth, as what lies
in the window is drawn flat on it: standing off that plane, it is refused.

A piece lifted `inside: 'world'` may have a body, as a real button rises out
of the page as a column: `piece.show(STORY, { inside: 'world', corner: 6,
body: { thickness: 12, walls: '#222935' }, hole: { ground: '#07090d' } })`,
then `piece.effects({ depth: 11.25, shadow: 1 })`. Its walls go back from its
face as thick as `thickness` names, in the page's pixels as `corner` is,
matte, in the colour `walls` names at the face, darkening to 0.35 of it at
the back, and that colour added over them as strongly as `glow` names, from
0, none, to 1, so a line of the diff glows green. On the plane it was lifted
from they stand behind the page, which hides them; as `depth` brings the face
toward the eye, they come up out of the page, and its shadow lies on that
plane under it, as dark as its `shadow` is strong, dropped toward its foot
and soft as far as the face stands high, as the promo's column cast it,
where flat draws it on the face's own plane. The walls grow back from the face as
the piece comes up, so none come whole at once. The room draws the body; the
flat stage draws the face and its shadow alone, as it draws no body for the
window. A body anywhere but inside the world is refused, as the frame, a
group and the window are drawn flat over everything in a room.

A title, code or the terminal stands `inside` the page's window, as a small
window of code over the site's: `code.show(LINES, { at: { left: 0.45, top:
0.6, width: 0.5, height: 0.3 }, inside: 'window' })`. Its place is a box in
the window's shares, as no name of a place or split of a format is the
window's; it is carried and slides as if the window's box were the frame,
is cut at the window's edge, travels and leans with the window, and shows
no more than the screen does, fading as it lowers. It grows and rolls flat
on the window, and leans or comes toward the eye only with it. It keeps
where it stands from the window's top left corner as the window grows or
shrinks, as an element on a page does in its own.

`window.to(place)` draws the page back off the frame's edges into a window
on the ground, its corners rounding, its edge and shadow coming up, carries
it from one place to another, and, `window.to('whole')`, brings it back to
fill the frame. The window moves apart from the camera: the camera keeps
what it frames framed in whatever window stands, as the window travels or
grows, so `window.to` and `camera.onto` share a step in either order.
`window.to(place, { depth: 700 })` brings the window 700 pixels of a frame
1080 high toward the eye on its way, as an object's `to` brings it, less
than the eye's focal length, refused before anything is shot where it
would stand at the eye or behind it: larger and farther from the frame's
middle as the eye sees it, a slab coming at the eye with its body, and a
depth less than none takes it back from the eye. A depth goes on the
move's curve, is kept as it stands where a move names none, and shares a
`play` with `window.lean`. Over the whole frame the window stays the frame
itself, flat on it, at any depth. A window off its plane, as one leant,
has the page's picture taken as sharp as livereel's bound, 2.2.
`window.show({ at: 'whole', from: 'right' })` slides the window in whole
from a frame past its place, `window.hide({ toward: 'left' })` slides it
out as far, where it stays until a move brings it back: with words sliding
the other way in the same step, a push. `screen.lower()` in a `play` takes
the screen down into the ground over its share, the window's shadow and
edge with it; in a `cut`, at once. `screen.shows({ html })` shows a page
of the film's own in the filmed page's place: a whole document the film
writes in HTML and CSS, a slide or a terminal, laid out at the screen's
size, framed by the camera, leant and blurred as the filmed page is, its
text drawn sharp however close the camera comes; `screen.shows('filmed')`
shows the filmed page again. In a `cut` it swaps at once; in a `play`, at
the moment `within: { start }` names, so a camera flying fast through the
swap smears one into the other. The page stands as written: its scripts do
not run, one that animates or transitions of itself is refused before the
film is shot, as what moves in a film is the film's, it moves only as
the film runs it (`screen.scrolls`, below), no key reaches it but as the
film types into it (`screen.type`, below), and an address in it
is read from the stage's own folder, so name an image or a font by a whole
address or a `data:` URL: the film's `fonts` set the look's words, not
its pages. While the page of the film's own shows, a move
finds blocks on it by their selectors, and the filmed page behind it is
still acted on, scrolled and typed into; a piece of the page and a lens,
drawn from the filmed page's picture, are refused, and so is the swap while
a lens stands. `screen.behind({ html }, { upright: 'over' })` puts a page
of the film's own on the window's back, as a slab wears one: where the eye
sees the window's back, the screen shows it in place of its front, mounted
so it stands upright once the window is turned over round its width,
`'over'`, or round its upright, `'round'`. It is framed by the camera as
the front is, so a camera close on a block of the front shows that part of
the back: bring the camera to the whole screen before the window turns. What
lies on the front, the light, the cursor, a callout, the pins and the
objects in the window, stands unseen meanwhile, and in a room the page lies
on the body's back. `screen.behind('none')` takes it off, and the screen is
seen through the window's back, mirrored, as before. A page of the film's
own moves only as the film runs it: `screen.scrolls({ html }, { pace: 480
})` runs it down its scroll at 480 of its pixels a second until another
move of its run, its pace changing from what it was to the new one over
the move's share of a `play` on the move's curve, or at once in a `cut`;
`pace: 0` stops it, a pace below none runs it back up, and it holds at its
top and its end. The run is the page's, so the same page keeps it on
either face of the window, or on none. `screen.scrollTo({ html }, '#input',
{ top: 600 })` brings it to rest with a block 600 of its pixels below the
screen's top as the move's share of a `play` ends: it goes on at the pace
the page runs and comes smoothly to stand there, on a cubic Hermite curve
of its own, so it takes no `ease`; in a `cut` it stands there at once. The
block is measured where it stands in the page's document, however far the
page has run. It is refused as it begins where the page cannot scroll so
far, and where it would turn back on its way: running away from its rest,
or so fast that it would pass it, more than three times the mean pace of
its way; stop the page first, or give the move a longer share. Each
exposure of a frame draws the page where it stood then, so a fast run
smears; the filmed page scrolls by `page.scrollBy` and `page.scrollTo`, and
`screen.scrolls('filmed')` and `screen.scrollTo('filmed', …)` are refused.
So is the run of a page that scrolls nowhere, one the screen
holds all of or whose own styles hide what runs past the screen
(`overflow: hidden` on its body). A page of the film's own is cut at
the screen's edges; `screen.shows({ html }, { reaches: 'document' })`
draws it on past the screen's top and foot, as a sheet longer than the
hand that holds it, as far as its document runs there and the frame
sees the window's plane: a window leant back shows what has run past
the screen's top on up the frame, on the screen's ground, its edge and
shadow round the sheet, and what the film types into it wherever the
block stands. Its sides are the screen's, as a page laid out at the
screen's width has nothing past them, so lay the window close enough
for the sheet to cover the frame's width where it should. Its run is
where the screen's top stands, as before, so `screen.scrolls` and
`screen.scrollTo` mean the same either way. Face-on and whole, where
the frame sees nothing past the screen, it draws the same bytes as cut.
The window's own edge, lifted, still cuts it, and a page on the
window's back is cut at the screen. The sheet is laid in a frame as tall
as it is drawn, so a page whose layout reads its viewport's height lays
out otherwise there than on the screen: `vh` is the sheet's height, and
a block `position: fixed` or `sticky` to the screen's foot, a prompt,
leaps to the sheet's foot as the sheet first shows; lay such a page out
in pixels. Refused: a page with nothing past its screen, and `reaches`
on the filmed page.
`screen.type({ html }, keystrokes('/review-ui',
{ lettersPerSecond: 12 }), { into: '#typed' })`, in `typing()`, types into a
block of a page of the film's own, the first its CSS selector `into`
matches: from the move's start the block shows what stands typed as its
text, in place of what the page wrote there, each key heard on the film's
keyboard or the `keyboard` named. What stands typed is the page's, kept on
either face of the window, or on none, until the film types into that
block again, which types it anew from nothing; typing into another block
keeps it. Text that wraps lengthens the page from the frame its letter
lands on, so a run goes on to the page's new end and a page drawn past its
screen reaches as far. A block that holds elements of its own, which its text would take
the place of, is refused as the move begins, as is an `<input>`, which
shows its value, not its text, and one the page lacks: type into a span of
text alone, the caret an element beside it, as
`<span id="typed"></span><span class="caret"></span>`. A `<textarea>`
shows its text, so it is typed into as a span is.
`screen.type('filmed', …)` is refused: the filmed page is typed into by
`page.type`. `screen.sweep()` in a `play` sweeps the picture the screen
shows away by a band of light, the page as it stands showing behind it: an
act on the page at a moment of the play, `page.act(action, { within })`, a
theme turned dark, comes in behind the band. The band crosses what the
window shows of the screen from its left, or the side `from` names, slanted
30° clockwise, or as far as `slant` names, 160 pixels of a frame 1080 high
wide, or `width`, its crest in the look's accent as it stands, or running
from `crest.start`, at its end nearer the top, to `crest.end`. Or a disc
opens `round` a block, a selector or a box of the screen, at its middle,
its ring of light growing from there, or from the nearest point the window
shows where it shows no middle, to past the farthest corner the window
shows, the picture kept outside it: its middle rides with the page, and how
far it reaches is the window's; its crest runs from `crest.start`
at its top round to `crest.end` at its bottom. A sweep is a band or a disc:
one named both `round` and `from` or `slant` is refused. The picture
is held as the sweep begins, so put the act a moment after it, `within:
{ start: 0.02 }`: one at the same moment would be done first and lie under
the picture, and the play refuses it. An act in a step before the sweep's
is under it too. The band crosses the window, not the page: a camera panning
against it faster than it goes brings the picture back over page it had
swept. A piece drawn from the page's picture and a lens show the page as it
stands, behind the band already. In a `cut` a sweep ends as it begins, and
nothing of it shows. A sweep is refused on a page framed live, and while the
screen shows a page of the film's own, as it draws from the filmed page's
picture. The
words take about a third of the frame, set as large as their share lets, or the share
a format's `split` gives them (see Formats); the window takes the whole
rest, whatever the page's shape, and shows the part of it the camera
frames. Inside the window the camera frames as in the whole frame: a block
at its middle, as close as its `air` lets, but never so far back that
ground shows in the window, closer than `zoomAtMost` where it must, so a
block wider than the window at that distance is cut at its edges, and a
phone's page shows a strip of itself; framed closer, the window stands still and
the page grows in it. `window.lean` leans the window back or swings it, the
page still filling it. Over the whole frame the camera stands where it would
to show no edge of a face-on screen, leant or not, so a lean never moves
what it frames; leant far, ground may show at the frame's far corners.
`window.shade({ dim: 0.6 })` dims the page while something stands clear of
it, a piece lifted off it, a title or code: `dim` lays the dark over the
screen, the light and the cursor on it included, and `fade` fades the screen
into the film's ground, each from 0 none to 1 whole; `blur` blurs the page
and the holes in it, in pixels of a frame 1080 high. The window's edge and
shadow stay as they stand, and what stands over the page stands clear. It
sets only what it names, so it shares a `play` with `window.to` and
`window.lean`, and `window.shade({ dim: 0 })` takes the dark away again.
`window.shade({ blur: 6, sharp: '.thread' })` keeps a part of the page
sharp in the blur, a block or a box of the screen, the page softening into
the blur over half as far as the blur past it, as the eye of a promo is drawn
to the line asked about: the part lies on the page, so the camera, the
window and the eye carry it, and a title over the blur stays as sharp as it
stands. A move naming another part, `window.shade({ sharp: '#send' })`,
keeps it sharp from the move's start, as a part slid across the page would
slide its edge over the words; to hand the sharp part on in a glide, bring
the blur to 0 over its first half and back over its second with the new
part, and `sharp: 'none'` keeps none. The blur, like the page, is seen
larger by an eye brought near. It is drawn from the page's picture, so a
page framed live is refused, as one the screen shows a page of the film's
own in place of; the picture the sweep holds and the holes over the part
blur with the rest.
Start the words once the window has drawn back, so they come up on the
ground, not over the page. A film shot in several formats names places of
its own in each format and writes them once (below, "Formats").

A callout is words on a card beside a block of the page, pointing at it:
`callout.show(selector, text, { side })`, its `side` `above` (where none is
named), `below`, `left` or `right` of the block. The camera carries it with
the page, as it carries the light, and the screen's edge does not cut it;
the block is read as the callout comes, as the light's is.

A note is words on the ground beside the page's window and a line drawn
from a dot at a block's edge out to them: `note.show(selector, text)`. Its
words stand in the words' share on the side of the frame clearest of the
window, across from a window on a side, or `at` a place the film names
beyond the window. It names a block without covering the page; the line
keeps to the block as the camera moves in the window, and the words keep
beside the window: as it moves, they move as far as the middle of its edge
facing them does, and they never lean with it. A note needs a window beside
its words: one whose words would stand over the window, as they do while
the page fills the frame, is refused.

Pins mark a path: `pin.show(selector, label)` lays a numbered mark on a
block's top corner, numbered after those laid before, its label running
out from the block toward the screen's middle; the labels before it
quieten. `pin.clear()` takes them all away.

Keys: `keys.show(['⌘', 'Enter'])` sets the caps of a shortcut at the
frame's foot, as the page is sent it in an act, and over a caption there
they stand over its words, by a gap, however many lines they take, rising
as its ground comes up; `keys.hide()` takes them away.

Code is a second screen beside the page's window, or alone: `code.show(text, { at })`
sets a dark pane of code in its place, its lines coming
up one after another, coloured as TypeScript is, the indent they share
dropped. Its letters are as large as `codeSize` lets, smaller where the
widest line would not fit across, so keep its lines short or give the words
a larger share (`split: { wordsShare: 0.44 }`); `longLines: 'cut'` keeps
them as large as `codeSize` and cuts a line too long at the pane's edge, as
an editor does. The pane stands no taller than its place, and
`code.scrollTo(line)` scrolls code longer than that until the line, by its
number or what it says, stands at its top. `code.light('light.on')`
lights the line that says `light.on` and dims the rest, so a line lights as
the page does what it says; `code.light(2)` lights the second line, counted
from 1, and `code.light('cursor.to', { through: 'click' })` the lines from
one through the line from it on that says the other. Words no line says, or
more than one, are refused, so a line added that says them too never takes
the light without a word:

```ts
play({ seconds: 1.4, moves: [window.to('right'), camera.onto(CARDS), code.show(LINES, { at: 'left' })] }),
play({ seconds: 1, moves: [code.light('camera.onto'), camera.onto(VISITORS)] }),
play({ seconds: 1, moves: [code.light('light.on'), light.on(VISITORS)] }),
```

`code.hide()` takes it away; a light past its last line, or of words no line
says, is refused.

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
| `groundLayers` | layers laid over the ground and its glow, the first over the rest, as CSS's `background` writes them: a grid of dots, lines, a gradient | `'none'` |
| `ink` | the words of titles, captions, callouts, notes and the ending | `#f4f6fa` |
| `quietInk` | what stands back: a quietened pin's label, the ending's line | `#8b95a7` |
| `accent`, `accentInk` | pins' marks and a note's line, and a pin's number on its mark | `#ffb224`, `#10141b` |
| `font` | the font of titles, captions and the ending, as CSS names a family (`'Inter, sans-serif'`): the machine's, or one the film brings in `fonts` | the system's sans |
| `mono` | the font of the terminal, the code and the ending's command, the same way | the system's monospace |
| `titleSize`, `captionSize` | how large a title's and a caption's letters are, in pixels | `92`, `56` |
| `titleMargin` | how far in from the frame's sides a title over the whole frame stands, in pixels | `160` |
| `captionGroundHeight` | how far from the frame's foot, or its top, the ground under a caption darkens, in pixels | `380` |
| `paneCorner` | how round the corners of a pane are — the page's window, the code's pane and the terminal alike — in pixels; `0`, square | `24` |
| `paneEdge` | the faint edge round a pane, its alpha how faint | `#ffffff1a` |
| `paneShadow`, `paneShadowColour` | how strong a pane's shadow is, from `0`, none, to `1`, and its colour | `1`, `#000` |
| `terminal`, `terminalInk` | the colour of the terminal, the code's pane, the ending's command and keys' caps, and what is written on them | `#10141c`, `#f4f6fa` |
| `codeComment`, `codeString`, `codeNumber`, `codeKeyword`, `codeCall`, `codeKey` | the colours of the code's pieces by kind: a comment, a string, a number, a word the language keeps, a function called, a key of an object; livereel's are made for a dark pane | `#8b949e`, `#a5d6ff`, `#79c0ff`, `#ff7b72`, `#d2a8ff`, `#7ee787` |
| `glowX`, `glowY` | where the ground's glow stands, across and down, each from 0 to 1 | `0.5`, `0.3` |
| `titleWeight`, `captionWeight` | how heavy a title's and a caption's letters are, 100 to 900 | `700`, `650` |
| `titleLetterSpacing`, `titleLineHeight` | how far apart a title's letters stand past where its font sets them, below `0` closer, and how far below one line's foot the next's stands, each in times its letters' size | `-0.03`, `1.08` |
| `noteSize`, `calloutSize`, `pinSize`, `keysSize`, `codeSize` | how large a note's, a callout's, a pin's label's and a key's letters are, and the code's at most, in pixels | `44`, `20`, `26`, `44`, `26` |
| `terminalSize` | how large the terminal's letters are, in pixels | `25` |
| `endingNameSize`, `endingLineSize`, `endingCommandSize` | how large the ending card's name, line and command are, in pixels | `96`, `36`, `38` |
| `codeLineHeight` | how tall a line of code stands, in times its letters' size: the step `code.scrollTo` scrolls by | `1.6` |
| `cursorFill`, `cursorEdge` | the cursor's colour and its edge's | `#111`, `#fff` |
| `words` | how words come up where a film names no way of their own, a title's, a caption's, a callout's and a note's, read as each comes: `'rise'`, `'sharp'`, `'fade'`, `'blur'`, `'mask'`, `'letters'` or `'scramble'`, as `words` names on a title | `'rise'` |

Colours are in hex; sizes in pixels of a frame 1080 on its shorter side,
scaled to the frame shot.

A font is one the machine has, or one the film brings as a file:
`defineFilm` takes `fonts`, each file by its path from the film's file
(TrueType, OpenType or WOFF) under the family the look names it by. One
file stands for every weight and style the look sets it at: a variable
font's moves with `titleWeight`, a static one's stays as drawn.

```ts
fonts: { 'Inter Tight': './InterTight-SemiBold.ttf' },
theme: { font: 'Inter Tight', titleWeight: 600 }
```

A font that names nothing this machine has or the film brings is refused
before anything is shot, as is one CSS reads as no family and a file read
as no font: a fallback nobody asked for is a wrong frame. A family CSS
keeps named after it, `'Inter, sans-serif'`, is a fallback the film asks
for.

The ground's layers are the film's own CSS, laid wherever the ground is:
under the page's window, a title card and the ending card. The ending card
stands on the frame's own ground, so the pattern stands still as it slides
in; a title card is a sheet that travels and leans, so it carries its
ground with it, and its pattern moves with it. Lengths in pixels are
pixels of a frame 1080 on its shorter side too, so a pattern is as large
for its frame at any size it is shot at:

```ts
theme: {
	groundLayers:
		'radial-gradient(#ffffff26 2px, transparent 2.5px) 0 0 / 36px 36px, ' + // a grid of dots
		'linear-gradient(115deg, #ffb22414, transparent 45%)'                    // a warm light from the left
}
```

The last layer may take a colour, as CSS lets it, which covers the ground
and its glow under the layers. No layer takes a picture (`url()`), which
the stage would draw only once loaded. Layers CSS cannot read, or with a
picture, are refused before anything is shot.

The look changes as the film goes, by a move like any other:
`look.to(theme)`, any of the same values. In a `play` it moves there over
its share of the step: a colour through the colours between, a size, a
weight, a corner or a shadow through the values between, a font or
`words`, which have none between, half-way, and the ground's layers
fading out as the new ones fade in over them; in a `cut`, at once.

```ts
play({ seconds: 1.2, moves: [look.to({ ground: '#f5efe6', ink: '#1a1a1a' })] }),  // the ground turns light
play({ seconds: 1, moves: [look.to({ groundLayers: LINES })] }),                  // the dots fade into lines
cut(look.to({ font: 'Georgia, serif', paneCorner: 0 })),                          // a serif, square corners, at once
play({ seconds: 6, moves: [look.to({ glowX: 0.9, glowY: 0.1 }), camera.onto(CHART)] }) // the glow drifts as the camera goes
```

A ground named without a glow takes its glow with it, as in a theme; what
a move leaves out stays as the look stands. So two moves of the look share
a step at once where they name no value alike, each moving its own:

```ts
play({ seconds: 4, moves: [look.to({ glowX: 0.9 }), look.to({ ink: '#1a1a1a' }, { within: { start: 0.5 } })] })
```

Two that name one value at once are refused, by it: `two moves on the
look's glow at once in one step`.

### The window's body

In a room the page's window may have a body, as a tablet has: a slab of
metal round the page, its corners the page's grown by its rim. It is the
window's own, set by a move of the window, `window.body(body, { within })`,
any of its values; what a move leaves out stays as the body stands, and the
window opens on livereel's, of no thickness, which is none:

| Value | What it sets | livereel's |
|---|---|---|
| `thickness`, `rim` | how thick the slab is, `0` none, and how far its rim reaches past the page all round, in pixels | `0`, `6` |
| `metal`, `roughness` | the colour of its metal, in hex with no alpha, and how rough it is, from `0`, a mirror, to `1`, matte | `#454b56`, `0.45` |
| `glass` | how strong the clear coat of glass over the page is, from `0`, none, to `1`, a whole coat: 4% reflected face-on, more aslant | `0.4` |

A film whose window has a body from its start sets it in a `cut` as its
first step. The body takes the place of the window's edge and shadow and
comes as they do, as far as the window stands off the ground and the
screen has come up in it, so a page over the whole frame has none. Its
metal shows the world's light (below): with no lights and no soft boxes it
stands dark. Turned past edge-on, the window shows the body's back. It is
open in front, so a page that fades shows what stands behind the window.
The glass is a smooth clear coat, which reflects the soft boxes and the
lights, more as the eye sees it aslant, and dims the page under it by as
much: a glint glides over a dark page as the window turns toward a box, and
hardly shows on a white one. It comes with the body, as far as the body has
come, reflects nothing where the world has no light, and stays over a page
that fades. A flat film draws the edge and shadow in its place.

```ts
world: { softBoxes: [...] },
steps: () => [
	cut(window.body({ thickness: 24, rim: 6 })),
	...
]
```

In a `play` the body moves to the values named over its share of the step,
a length or a share through the values between and the metal through the
colours between; in a `cut`, at once. It sets only what it names, so it
shares a `play` with `window.to`, `window.lean`, `window.shade` and another
body naming others; two that name one value at once are refused, by it:
`two moves on the window's rim at once in one step`. The body is the
window's, not the look's: a theme or `look.to` names none of its values.

### The world's look

A film drawn as a room may light the world its own three.js things and the
window's body stand in, and let the brightest light glow; any film may lay
grain over its ground. `defineFilm`
takes a `world`, how that world looks as the film opens, any of its values;
what the film leaves out stays livereel's, a world of flat light:

| Value | What it sets | livereel's |
|---|---|---|
| `lights` | spotlights standing in the room | none: `[]` |
| `softBoxes` | glowing panels round the room, which faces reflect and are lit by | none: `[]` |
| `bloom`, `bloomRadius` | how strongly light brighter than the page's white glows round itself, `0` none, as three's bloom takes its strength, and how far the glow spreads, from `0`, nearest, to `1`, widest | `0`, `0.4` |
| `grain` | a faint noise over the ground, flat or in a room: `{ levels }`, how many levels of 255 it moves a colour either way, or `{ enabled: false }` | none: `{ enabled: false }` |

A light stands at a spot of the room and aims at another, as the eye does,
each in pixels of a frame 1080 high from the frame's middle. A soft box
lights rough faces as well as glossy ones, and stands turned `round` from
straight toward the eye at rest, to the right for more degrees, and `up`
from level. A light falls off by the square of
the distance, as light does: its `strength` is how bright a white face
square to it stands at the spot it aims at, 1 its whole colour, so a thing
there stands as bright as written, and one coming toward the light
brightens as it comes; aim a light at where its thing stands. The strength
is held at the aim, so a light whose aim `world.to` moves farther from it
brightens whatever else it lights, by the square of how much farther the
aim stands. A soft box
spans `width` and `height` degrees seen from the room's middle, brightest
along its middle; boxes as bright as below light a matte thing strongly too. Each colour is hex with no alpha.
Things built of three's lit materials take the lights,
`MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial`,
`MeshPhongMaterial` and `MeshToonMaterial`, and all but the toon the soft
boxes; `MeshBasicMaterial` and a film's own `ShaderMaterial` see neither:

```ts
world: {
	lights: [
		{ colour: '#ffffff', strength: 1.2, at: { across: 150, down: -2000, out: 400 }, aim: { across: 0, down: 0, out: 0 }, angle: 30, softness: 1 },
		{ colour: '#2a5cff', strength: 1, at: { across: -1700, down: -250, out: -1000 }, aim: { across: 0, down: 0, out: 0 }, angle: 35, softness: 1 }
	],
	softBoxes: [
		{ colour: '#ffffff', brightness: 12, round: 0, up: 75, width: 33, height: 33, lean: 0 },  // overhead
		{ colour: '#ffffff', brightness: 30, round: -15, up: 24, width: 9, height: 39, lean: 24 }  // a key, high on the left
	]
}
```

The lights and the reflections stay where they stand in the room as the
eye moves; a thing on the frame, which rides with the eye, is lit as the
eye at rest would see it. A light whose cone opens 90° or more, or that
aims at the spot it stands at, and a soft box spanning 180° or more, or
turned up past straight up, are refused as the film is defined. They cast
no shadow.

A room keeps the light of its things and of the window's body as three
gives it, brighter than white where a glint is, and may let it glow round
itself as a lens blooms: `bloom` says how strongly, as three's bloom takes
its strength, `bloomRadius` how far, the same share of the frame however
large it is shot. Only light brighter than the page's white glows, so a
white page and its letters never do; a face lit far past white glows wide,
as three's bloom has it. A glint covering a share of a pixel at the
world's edge over the ground comes out dimmer than three would lay it, as a
room lays the world over the ground in the screen's colours, and may not
glow at all. The glow lies over
all the frame, titles and the cursor too. The reference promo's was
`bloom: 0.45, bloomRadius: 0.4`.

A glow fading across a dark ground falls into bands, as eight bits hold a
colour in 255 steps and a dark glow spans few of them. `grain` lays a noise
over the ground that hides where one step meets the next, as the reference
promo did over its backdrop with `grain: { levels: 1 }`: each colour of
each pixel of the frame moved by about so many levels either way, still
from frame to frame and alike on every shot. It lies on the ground alone,
its layers and the ending card's ground with it, under the window and all
else, so a page and the words over it stand as drawn; a film drawn flat
shows it as a room does. It is the browser's own noise, spread as far as an
even one of so many levels: at one level's grain a few colours in a hundred
move two levels. A film writes it whether or not it is drawn as a
room.

The world changes as the film goes, as the look does: `world.to(world)`,
any of the same values. In a `play` the glow's strength and spread and the
grain's levels move through the values between, a grain turned off from
none; lights as many as those standing move light by
light, each to the one in its place, its colour, strength, spots, cone and
softness through the values between, so a light fades in from a strength
of `0`; lights of another number, and the soft boxes, change whole
half-way. In a `cut`, at once. Two moves of the world share a step at once
where they name no value alike; two that name one are refused, by it:

```ts
play({ seconds: 2, moves: [world.to({ bloom: 0.45 }), world.to({ lights: [KEY] }, { within: { start: 0.5 } })] })
```

A theme or `look.to` that names a value of the world, or a world that names
one of the look, is refused by that name.

### Where the page is, and what serves it

A film names its page's `address`. A page someone else serves — a public
site, an app already running — needs nothing more. An app the film should
start names the command that serves it, as the project runs its own server:

```ts
address: 'http://localhost:5173/',
serve: 'npx vite --port 5173 --strict-port',
```

livereel runs the command in the film file's folder, asks the address until
it answers, a minute at most, shoots, and stops the command once the take
ends — the command and all it started, on Ctrl-C too — as Playwright's
`webServer` does. A command that ends before its page answers is refused
with how it ended and what it said last; an address that answers before the
command runs is refused too, as that page would be filmed in its place. A
page its command serves is at an http or https address, and its port is the
film's to name, so the command must serve it there.

What the page shows and its server answers — the app's data, a reply to a
click — lives beside the film as data its server and the film both read
(`examples/livereel-promo/acme.ts`), so the film knows what a click brings.

### The set: the app shot once, ahead of the film

A film of the live page shoots it as it goes: each act waits on the app, and
a still at 58 s goes through the 57 before it. A film that names a `set`
shoots the app once, ahead, and is then shot from those pictures, with no app
served:

```ts
set: {
  targets: [REFRESH, VISITORS],
  scenario: async (context) => {
    await context.state('opened');
    await context.page.locator(REFRESH).click();
    await context.page.locator(UPDATED).waitFor();
    await context.state('refreshed');
  },
},
```

`livereel set film.ts --format wide` serves the app with the film's `serve`,
waits for its `ready` and runs the scenario. At each `state(name)` it keeps a
picture of the screen, 3 times as sharp as the page where `sharpness` names
no other, and where each of the `targets` stands, in `film-wide.set/` beside
the film file. A scenario that fails leaves the set shot before as it was.

The film shows a state by an act, as a click on the app would bring it, at
the moment it acts; `act` and `page.act` take it the same way:

```ts
...cursor.click(({ set }) => set.show('refreshed')),
```

The film opens on the first state. A move reads its target where the set
shot it in the state shown: a target the set's `targets` leave out, or one
that matched nothing in that state, is refused, as are a scroll, typing and
an act that asks for `context.page`, which the scenario does instead, as
the film has no app. A film is refused on a set shot on another screen,
with other targets or at another sharpness than it names now, so shoot the
set again after any of them changes; a set whose file or a picture is
missing is refused too. A set's pictures change only by the film's acts, so
its page is static.

### The page: its time, whether it changes of itself, its colour scheme, and what it blurs

The page's own time is the film's. Its timers, its animation frames and its
date stand still between frames and run on a frame's length with each, so a
note the page takes away after 2 s goes 2 s into the film, however long the
shoot takes, and goes on the same frame in every shot. While an `act`, or the
film's `ready`, waits on the page, its time runs as the wall's, as the page
needs it to answer — a search that waits for the typing to stop, data that
loads. The film's time stands through an act, so the page comes out of it
ahead and stands until the film catches up: what it set runs out as far into
the film as it said, however long the acts after it took, and an animation
its script draws stands for as long as the act took. A Web Worker's timers,
and the date the page starts at, the machine's, are the wall's.

`page.speed(speed)` sets how many of the page's seconds a second of the film
runs: `cut(page.speed(4))` shows a minute of the site in 15 s, a `play` that
holds `page.speed(0.5)` slows it down through the play, `page.speed(0)` stands
it still; it runs at 1, the film's own, until a film sets another. It speeds
what the page's script does by its time — its timers, its animation frames,
its date — and nothing else: an answer from its server comes when it comes,
its styles' animations keep the wall's clock, and while an `act` waits on the
page its time runs as the wall's at any speed, so a page stood still answers
a click. The page's animation frames come every 16 ms of its own time, so
below a speed of 0.48, 16 ms to the film's frame, an animation its script
draws on each steps less often than the film's frames; and each of them is
run, so a page that draws on every one costs a frame more the faster it runs:
2.6 ms at a speed of 1, 506 ms at 60, about 125 of them a frame (measured
2026-10-31).

Where a film names nothing, `page: 'static'`, the page is shown as a picture,
taken anew after the film changes it — by its acts, by `page.scrollBy`,
`page.scrollTo` and `page.type`, while an `act` has let its own motion go —
and after any change to its document it makes of itself: a timer of its own,
an answer that comes in late, data pushed to it. After any of these the page
is captured every frame until two captures come out alike to the byte; from
then on, a frame the stage draws as it drew the one before is that frame
again, neither drawn nor captured, so a hold costs next to nothing.
`defineFilm` takes `page: 'dynamic'` for a page that changes where its
document does not — a canvas, a video, an animation that ignores reduced
motion, a change inside a shadow root — which is then captured every frame.

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

A film is shot at 60 frames a second, where a fast move runs smooth;
`defineFilm` takes `framesPerSecond: 30` for half the frames. Every format of
a film shares its rate. A GIF is made at 50 frames a second at most, as a
browser holds a GIF's frame of a hundredth of a second or less ten times as
long.

The eye sees 24° across the frame's shorter side, a long lens: a window
leant back or a title brought near keeps its shape, and only a little of
its depth shows. `defineFilm` takes `eye: { angleOfView: 40 }` for a wider
one, where depth is loud. Every format of a film shares its angle.

The stage's look was made on frames 1080 pixels on their shorter side, as
1920 × 1080 and 1080 × 1080 are; on any other frame it is drawn as on such
a frame and scaled to the one shot. The caption, the terminal and the
ending keep their share of any frame, and an angle leans as steeply on any.
A zoom, in a pose as in `zoomAtMost`, is the frame's
pixels a page's pixel takes on such a frame, so a pose and a framing by
selector, its `air` in the page's pixels, show as much of the page on a
frame of any size. A pose given in numbers is the film's to give per
format, as `steps(whole, formatName)` is handed the whole screen's
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

A screen may be taller than the frame, a page laid out whole for the eye to
fly low over: `screen: { width: 1040, height: 5000 }`. A static page's
picture is then of the whole of it, taken anew each time the page changes,
and costs as it grows: 1.8 s in software and 0.8 s on a graphics card for
1040 × 5000 at the finest quality. A picture is taken no larger than
Chrome takes one whole ("Limits").

A format names where its captions stand, `captionAt: 'top'`, or at the
frame's foot where it names none: a square may caption its top and a wide
frame its foot, and a caption at the top leaves the foot to the keys.

A format may name places of its own, `places`, each a place of livereel's,
another of its own, or a box in either, so one script fits every format: the
film says `words` and `page`, and each format says where they stand.

```ts
const FORMATS = {
	square: { frame, screen, places: { words: 'top', page: 'bottom', heading: { of: 'words', height: 0.3 } } },
	wide: { frame, screen, places: { words: 'left', page: 'right', heading: { of: 'words', height: 0.2 } } }
};
play({ seconds: 1, moves: [window.to('page'), title.show(IN_SIX, { at: 'heading' })] })
```

A name of its own is the place it names, as what stands there reads it:
`page: 'right'` is the window's room on the right for the window, and the
words' share there for words, which read centred where it names `top`. A
name of livereel's taken, a place that names none, or one that stands in
itself through others is refused as the film is defined, by its format; a
place a move names that its format has not, as the steps are made, by the
move: both before anything is shot.

### Where the stage stands

A static page, the default, stands in a tab of its own at the film's
address, as a person opens it: its cookies go with its requests, a sign-in
the film makes holds, and a page that refuses to be framed is shown. The
stage, a page of livereel's own, shows a picture of it, taken anew as the
film acts on it or moves it, as sharp as a camera 2.2 times close needs.

A dynamic page (`page: 'dynamic'`) sits live in a frame of the stage, and
`defineFilm` takes `stage` for it; `stage: 'inside'` with a static page is
refused:

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
  even where it refuses to be framed.
- The app's scripts can reach the stage, which stands on their origin.
- The app's service worker is not tried yet.

### Flat, or a room

`defineFilm` takes `drawing`, how the stage draws a frame:

- `flat`, where none is named: as the browser draws a page, the window and
  each object on a layer of their own. A leant one is drawn as soft as the
  browser draws a layer in 3D, at about one of its pixels a page's pixel
  however near the eye comes.
- `room`: the world drawn in WebGL as one scene with one depth, as a 3D
  program draws it: the page a plane where the eye sees it, a static page
  from its own picture, as dense as the picture was taken, so a window
  brought near or leant toward the eye stays as sharp, and what lies over
  the page in the window (the light, the cursor, a callout, an object in
  the window, a page of the film's own) as dense as the page's device
  scale, filtered as it shrinks into the distance; the window's body round it and
  the film's things beside it, each hiding the others by depth alone; and
  each pixel blurred by the eye's focus as far as what it shows stands from
  it, where flat blurs the window as one; what stands nearer the eye than
  all the rest while the focus blurs any of it, a thing held near or the
  window brought up to the eye, is drawn and blurred apart and laid over
  the rest, so its blurred edge shows what it hides, however the focus is
  pulled through it. The blur adds light up in linear
  light, as a lens does, so light words on a dark page blur brighter than a
  blur in the screen's colours draws them. Markup standing in the world, a
  title or a pane, and the page while it fades are laid over what stands
  behind them in the screen's colours, as the browser lays them, so a
  pane's shadow over a page is as dark as flat draws it, and a half-faded
  page over a thing as the browser lays a fading layer; the window's glass
  is laid over the page as light, so its sheen keeps its glow. The ground
  and what stands on the frame are drawn
  as flat draws them. A fast move's blur adds its
  moments up in linear light,
  as a camera's shutter gathers light, where flat lays them over one another
  in the screen's colours: a page blurs as it did, the README film's moving
  frames alike to an SSIM of 0.9998, and a glint streaks as bright as it
  shines. A static page only: a dynamic one stands live in a frame of its
  own site, which the browser hands WebGL blank.

```ts
export default defineFilm({ drawing: 'room', ... });
```

A room also draws a film's own things: what no prop of livereel's draws and
three.js draws in a few tens of lines, an end card standing in the world, a
sheet leant over the page. `things` names a JavaScript module beside the
film, whose default export builds each thing by a name from the stage's own
three, and sets it every exposure from its numbers and how far it has come
up, keeping nothing else:

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
const card = { at: 'whole', reach: { width: 300, height: 180 }, values: { turn: 0 }, inside: 'world' };
play({ seconds: 1, moves: [thing.show('card', card)] }),
play({ seconds: 1, moves: [thing.set({ turn: 0.5 }), thing.to('whole', { depth: 600 })] })
```

A thing is an object, so it stands at a place, on the frame or in the
world, is carried, grown, brought near and leant as any object is. `reach`
is how far it reaches across and up, whole, in pixels of a frame 1080 high:
its box is that footprint about the place's middle, from whose middle it is
built, a unit of it a pixel of a frame 1080 high, its axes three's own, up
the frame, its faces turning as three's do. Its box's corners say how near
the eye's focus it stands and how far it moves for the motion blur; a move
of its numbers moves nothing the blur counts, so a fast turn by `set` is
shot unblurred. In the world it stands in the room's one scene, with the
window and every other thing there, each hiding the others by depth, and
each point of it is blurred by how far it stands from the eye's focus, so a
page that fades shows what stands behind it; on the frame it rides with the
eye, sharp, before the window. Built of `MeshBasicMaterial` or a
`ShaderMaterial` of its own, it is drawn flat; of one of three's lit
materials, lit by the world's `lights` and `softBoxes`, as the world's look
says. A thing in a material that writes no depth, as glass, is seen
through: give its material `depthWrite: false`, as three's `transparent:
true` alone still writes depth, which hides what stands behind it. The room
draws it apart, with the page while the page fades or comes up, over what
writes depth, and blurs it by its own depth, so a glass
before a sharp page blurs while the page stays sharp, and one passing
through a fading page is laid under the page behind its plane and over it
before. Three lays a mesh's faces in the order of its materials, so a
see-through box of six materials shows its far faces over its near ones:
give glass one material drawn on both sides (`side: DoubleSide`), which
three lays its far faces first. A see-through `ShaderMaterial` of the
film's own is cut at a fading page's plane only where it sets
`clipping: true` with three's clipping chunks. It comes and goes in
its own way alone, as its module draws `shown` (a material it fades is
`transparent`), and takes no effects. `set` is handed the stage's `three`
for what it makes anew. Refused: things in a film not drawn as a room and a
module path not ending in `.js`, as the film is defined; a module that fails
to load or exports no builders, as the stage opens; a thing inside the
window or in a group, as
the move is made; a thing the module builds none of, as it begins; what the
module throws building or setting one, as the frame is drawn; and
`thing.set` of a number the thing was not shown with.

What `room` costs:

- A frame takes longer to draw than flat, and in software about 150 times
  as long as on the card, which livereel says as it starts (a frame of 1920
  × 1080, the page fading as the focus opens, 30.6 s against 197 ms): on
  the graphics card, 300 frames of a lit window with a body, a thing through it and the
  eye's focus opening took 80.5 and 83.6 s (`--profile`, 2026-11-10).
  Drawing is the slowest step: with the page fading as the focus opens, a
  frame took 287.9 and 301.7 ms to draw at 3840 × 2160 and 63.9 and 73.3
  ms to capture at 1920 × 1080 (`--profile`, 2026-11-11, the card shared
  with other shoots); the README film drawn as a room took 354.9 s.
- What is seen through, a thing of glass, and a page fading or coming up
  while a thing stands in the world, is drawn and blurred as a field of
  its own while it stands: the same 300 frames with the page fading over
  their last 3 s took 113.9 and 146.3 s against 82.2 and 105.4 s without
  the field, and with a glass cube in place of the solid one 125.4 and
  115.6 s against 88.7 and 88.2 s (`--profile`, 2026-11-10, the card shared
  with other shoots). A page fading with nothing else in the world is drawn
  with the rest, in one field: those frames without the cube took 83.3 and
  100.8 s where two fields took 108.6 and 108.6 s. Markup standing in the
  world, a title or a pane, is seen through round its letters and in its
  shadow, so it is drawn in a field of its own, laid as the browser lays
  it: the frames with a title and code in the world in place of the cube
  took 119.4 and 121.5 s; the page, laid as the browser lays it with its
  glass over it as light, is a field apart from it, which made those frames
  138.8 and 146.4 s against 122.6 and 123.7 s (2026-11-11). While the page is
  seen through and a glass or markup stands beside it, what stands behind
  the page's plane is a field of its own, so it blurs by its own depth: one
  run of the lens more, about 80 ms a frame of 3840 × 2160 (2026-11-11).
- What stands nearer the eye than all the rest, while the focus blurs any
  of it near, is drawn and blurred as a world of its own, a run of the lens
  more: 300 frames of a lit window leant with a
  cube held before the focus took 67.1 and 67.5 s, against 72.8 and 72.7 s
  with the cube blurred with the rest (`--profile`, 2026-11-11).
- Where the frame shows more of the window's plane than the graphics card
  holds in one texture, as the eye flying low over a tall screen does, what
  lies over the page is drawn less densely, softer than flat near the eye;
  a page's picture larger than the card's largest texture is shrunk whole
  to fit it.
- What lies over the page in the window stays as dense as the frame: a
  window brought near shows it magnified, softer than the page under it.
- It draws through Chrome's HTML-in-Canvas, an experiment of Chrome's behind
  a flag livereel turns on, renamed twice before: livereel pins the browser
  `npx livereel setup` installs, and refuses a browser without it, or one
  that gives the page no WebGL, as the machine's to put right.

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
- `sounds: { enabled: false }` for none of livereel's but a keyboard a
  typing names;
- `music: { file, volume }`, a track under the whole film, `volume` 1 as
  loud as the file, cut to the film's length and faded out at its end.

`cursor.click(action, { sound })` and `cursor.press({ sound })` give one
click a file of its own, `page.type(strokes, { keyboard })` and
`terminal.type(strokes, { keyboard })` type on another of livereel's
keyboards, heard whatever the film says of its keys, and `sound.play(file)`
plays a file of the film's at a moment of a step. The WebM carries the
sound; a GIF holds none.

### Motion blur

Where anything moves fast between frames — the camera, the page's window,
the cursor, the light, a title, code, the terminal or the card as it
travels, slides, leans or comes up masked, wiped, opened or grown, code
as it scrolls, the page in a lens, a note's words beside the window — a
frame is shot several times along the time from the frame before, each as
the film stood then, and blended: as many times as keep the copies a few
pixels apart, so the faster the move, the more. What a move sets as it
begins, as a light put on another block, is not blurred, as nothing moved.
`defineFilm` takes `motionBlur: { shutter, exposuresAtMost }`, either or
both:

- `shutter`, how much of that time the shutter is open for: 0.5, a film
  camera's half, where none is given, and 1 the whole of it;
- `exposuresAtMost`, how many shots the fastest frame is blended from: 16
  where none is given, more for a smoother smear and a longer shoot.

`motionBlur: { enabled: false }` turns it off; `--quality draft` shoots
without it.

### A film its own page draws

A film that outgrows its steps — a world of its own in three.js, a canvas
drawn by hand — is a page of the film's that draws each moment itself, and
livereel shoots it as it shoots any film: at its rate, whole, as a clip of
a span, or a still, made into a video.

```ts
import { defineDrawnFilm } from 'livereel';

export default defineDrawnFilm({
	formats: { wide: { frame: { width: 1920, height: 1080 } } },
	address: 'http://127.0.0.1:8741/film.html',
	serve: 'npx http-server -p 8741 -a 127.0.0.1',
	framesPerSecond: 60
});
```

Its page is served as any film's is: here a plain server of the film's
folder, which reaches three.js in `node_modules` by the page's import map.

The page answers livereel by one global, set as its script runs, before
anything it waits on:

```js
globalThis.livereelDrawnFilm = {
	ready: loaded,                    // a promise, settled once it can draw
	duration: 70.9,                   // how long the film is, in seconds
	at: (seconds) => draw(seconds)    // the frame at a moment, settled once drawn
};
```

The page is opened at the frame's size, a page's pixel a frame's, and draws
as finely as it wants itself, so `--quality` asks nothing of it. Its
`duration` is read once `ready` settles, so a page may set it then. A
moment must draw the same however the page was asked before, as a still or
a clip draws it alone, and nothing on the page may move of itself, as its
time is the wall's. A page that sets no such global or one in no form of
it, fails or throws as it gets ready, says a length that is no number of
seconds, or throws as it draws, is refused as the film's. Such a film is
shot with no motion blur and no sound yet.

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
  app that signs in is filmed signed in by the film itself, as a static
  page, or as a dynamic one with `stage: 'inside'`; a session the person
  signs in to themselves (two factors, a sign-in elsewhere) is not taken yet
  ([`TODO.md`](TODO.md)).
- A static page is pictured as sharp as a camera 2.2 times close needs: a
  camera closer still, by `zoomAtMost` or a pose's zoom, shows its text
  softer than the page itself. A piece of the page drawn closer, flat, is
  drawn from a picture of its own that close; one that holds its picture,
  a leant one and a lens are not.
- A picture of the page, or of a part of it, is taken no larger than Chrome
  takes one whole: no side past the 65,500 px a JPEG holds, nor, on a
  graphics card, past the card's largest texture (16,384 px on an Intel
  Iris Xe), and no more than 2 GiB. One asked larger is taken as large as
  it may, softer, and livereel warns once, naming the zoom past which a
  camera or a piece shows it softer: at the finest quality, a screen 1040
  wide is pictured as sharp as a camera 2.2 times close needs up to 3,723
  px tall on such a card, and up to 14,886 in software.
- Chromium alone, headless.
- The page is asked for reduced motion, and for the light colour scheme
  unless the film names the dark one. A page whose styles animate anyway
  runs those animations on the wall clock, as the film's time holds its
  scripts alone, so two shots of it differ there; on a static page, the
  default, a hold shows it stopped where it was captured. The page's text
  caret stands shown and never blinks.
- A page that refuses to be framed (`X-Frame-Options`, a CSP's
  `frame-ancestors`) is shown as a static page, or as a dynamic one on the
  stage inside the app ("Where the stage stands").

## Development

[`CONTRIBUTING.md`](CONTRIBUTING.md): the setup, the gates, how the source is
laid out, and how a release is made.

## License

MIT
