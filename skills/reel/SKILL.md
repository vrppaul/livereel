---
name: reel
description: Direct and shoot a short film of a live web page with livereel — story first, then a storyboard, then the film as steps, checked frame by frame. Use when the user asks for a promo, a demo or an explainer video of a web app or of a feature.
---

Make a film of a real web page: the page runs live, livereel moves a camera, a light, a cursor and captions over it,
and shoots it frame by frame on a clock of the film's own. What the page does is real — clicks, typing, its server's
answers — and a wait costs the film nothing.

Work in this order and show the user each stage before the next. A film built before its story is agreed gets
rebuilt. livereel's README, `node_modules/livereel/README.md`, says what each move does and refuses in full; this
skill names each move in a line and says where to read more.

## 0. The setup, stage by stage

Walk the user through every stage below, in order, before the film is written. At each, ask; name livereel's default
and why it is one; where the choice is one of look, shoot a still of each way and let the user choose by eye. Write
down each answer; never settle a stage for the user, and never start the next before they have answered. A stage the
user waves through takes the default, said aloud.

1. **The story** (section 1): who watches, the problem, the turn, the one sentence after.
2. **The storyboard** (section 2): a row a shot, read back to the user in your own words before any code, so a word
   that reads two ways is caught while it costs a line.
3. **How it is made**: livereel's steps over the live app, the default, or a film its own page draws where steps fall
   short; the page static, or `page: 'dynamic'` where it changes of itself; `drawing: 'flat'` or `'room'`.
4. **The app: live, or a set**: the live page, the default, acted on as the film goes; or a `set`, the app shot once
   ahead by `livereel set` into a picture of each state the film shows, then filmed with no app served, so a still or
   a clip of any second is quick and alike every time. A set suits an app that is slow to answer, changes between
   runs, or needs a long way to the state a shot shows; it takes no scroll or typing in the film, which its scenario
   does instead. Ask which, and list the states and their names with the user before the scenario is written.
5. **The frame**: each format, its frame and screen (16:9, square, 9:16), and its places.
6. **The rate**: 60 frames a second, smooth on a fast move, or 30, half the frames to shoot; `framesPerSecond`.
7. **The lens**: `eye: { angleOfView }`, 24° across the frame's shorter side where none is named: a long lens, so a
   window leant back or a title brought near keeps its shape; 40 makes depth loud, the near edge large. Where the
   film leans the window or moves the eye, shoot a still of the leant shot at 24 and at the angle the user names, and
   let them choose. Where the eye flies over the page, write each flight with the user in words before code: the spot
   it arrives over and how high, how it arrives, where it looks at the end of each leg; read it back, then shoot a
   still at each leg's end before the clip. Where the eye stands before a part of the page, write `eye.onto` with the
   share it fills and where its middle shows, or a flight's last leg `{ onto, fills }`, never spots worked out by hand
   from where the window rests.
8. **The look**: the theme's ground, accent and type; the colour scheme; what the page blurs; motion blur as livereel
   sets it or none; the eye's focus, sharp all over or open on a shot; in a room, flat light or the world's lights,
   soft boxes and glow, a still of each; on a dark ground with a glow, grain or none; the window with a body of metal
   or its flat edge and shadow, a still of each with the window leant.
9. **Sound**: livereel's clicks and keys, the keyboard, or none; music.
10. **The loop**: say how each shot will be checked, as section 4 has it, a still of each shot first, then a clip of
    its span, then the whole film, the user's word before each next one; a change the user asks is the one thing
    changed, by the share they name ("twice as slow").

## 1. The story, in words

Answer these, in a few lines, and get the user's word on them:

- **Who watches**, and where: a README, a feed, a talk. It sets the length and the frame: 16:9 for a page or a talk,
  square for a feed, 9:16 for stories. A film shown in several places names a format for each.
- **The problem** the viewer knows from their own work, shown before any answer. A viewer who has not felt the
  problem does not care for the fix.
- **The turn**: the one moment the product answers it.
- **What the viewer should be able to say after**, in one sentence.

Let speed carry meaning: what is hard can rush past or tilt away; what the product makes clear stands face-on and
still enough to read.

## 2. The storyboard

A table, one row a shot: seconds, what is on the screen, what moves, the caption. Speak in the director's words,
which are the tool's:

| Word | In livereel |
|---|---|
| framing | `camera.onto(target, { air })`: what the frame holds, a selector's blocks or a box |
| angle | `window.lean({ tilt, turn, roll, over, about })`: the window leant back, swung, rolled or turned over like a slab in the hand |
| spin, flip, grow | an object's `lean` (`turn: 360` a whole turn) and `to(place, { scale, depth })` |
| pop-out | `piece.show(target)`, `piece.to(place)`, `piece.back()`; `hole: {}` leaves its place empty, `lines: 'solid'` ties it to its source |
| flies to a block | `piece.onto(target)`: a card into a panel, a chip onto its file, landing as the camera goes |
| marked area | `outline.show(target, { line: 'dashed' })` |
| loupe | `lens.show(target)`, `lens.to(target)` |
| stack, ring, fan | `group.show({ as })`, objects shown with `{ group }`, then `group.lean`, `group.to` |
| lift, glow | `piece.effects({ shadow, glow, ring, scale, depth })`, and every object's, at its show as `effects` |
| focus, soft page | `window.shade({ dim, fade, blur, sharp })`, `eye.focus(on, { aperture })` |
| camera move | a `play({ seconds, moves, ease })` |
| flight, path | `camera.onto(last, { through })`, `window.to(place, { through })`, an object's `to(place, { through })`; `eye.fly(legs)` low over the page |
| light | `light.on`, `light.to`, `light.off`: one block lit, the rest dimmed |
| cast | what the page shows, opened and closed by `act` |
| action | a click (`cursor.click`), keys (`typing(page.type(strokes))`), anything in an `act`; mid-play, `page.act` |
| caption | `caption.show(text)`, `caption.hide()` |
| title card | `title.show(text)`: words over the whole frame, on the film's ground |
| split | `window.to('right')`, `camera.onto(selector)` and `title.show(text, { at: 'left', within: { start: 0.5 } })` in one `play` |
| code beside | `code.show(lines, { at: 'left' })` beside the window `to('right')`; `code.light('light.on')` as the page does it |
| entrance | `cut(screen.lower())`, then `screen.rise()` in a `play`; `ending.show(card)` |
| reveal | any object shown whole in a way, `title.show(text, { enter: 'mask' })`, gone in one, `hide({ leave: 'iris' })` |
| tempo | how long each `play` and `hold({ seconds })` lasts |

A film shot in several formats names places of its own in each, `places: { words: 'top', page: 'bottom' }` in a
square and `{ words: 'left', page: 'right' }` in a wide frame, and writes `at: 'words'` and `window.to('page')` once. A
format's `split: { wordsShare: 0.28 }` gives words less room above a square's window. Eighteen ways to set a block apart
are recipes, below.

What reads as made with care:

- **One motion at a time.** The camera leads, settles, then holds long enough to read: about a second for every four
  words on the screen.
- **The camera does the transitions**: it travels from one block to the next rather than cutting.
- **Captions of three to six words**, addressed to the viewer as "you", and about what is lit at that moment, never
  about something else.
- **Real UI the whole time**, cropped close to the part that matters. A phone shows a whole page too small to read.
- **People type unevenly**: `keystrokes(text, { seed, slipAt })` with a slip now and then; an agent works for a second
  or two before it answers. Type evenly, `keystrokes(text, { lettersPerSecond: 12 })`, only where a cut the film
  copies does.
- **A title card or a split for the turn, not for every shot**: a title card to open on the problem or close on what
  the viewer should say, a split where one claim stands beside the block that proves it. One word or phrase set apart
  (`{ text, italic: true }`, an `ink`, a `marker`) carries the claim; a title in many styles reads as a ransom note.
- **A callout names one small block** the viewer would not find alone (a button, a number), in two to five words, one
  at a time, and goes before the camera moves on; a caption speaks to the viewer, a callout labels. Frame the block
  with air on the callout's side. Beside a window, a note says the same from the ground across from it and leaves the
  page whole; show it in place of the split's title, and hide it before the window moves.
- **Pins for a path** of three or four steps the viewer will repeat, each laid as the camera reaches its block; clear
  them before the next shot.
- **Keys for a shortcut** worth learning, while it is pressed in an act, never for text typed; not while a caption
  stands at the foot.

## 3. The film

### Installing and shooting

livereel is installed in the project the film lives in, and needs Node 22.20 or later and ffmpeg on the path. If
`node` is missing, tell the user to install Node and stop; do not install it yourself. Otherwise:

```bash
npm i -D livereel      # or pnpm add -D livereel
npx livereel setup     # the browser films are shot in; it says if ffmpeg is missing
```

If ffmpeg is missing, tell the user to install it and stop. If the browser will not start for a system library it
lacks, on Linux, tell the user that `npx playwright-core install-deps chromium` installs them. A film is an ES module:
the project's `package.json` says `"type": "module"`, or the film's file is named `.mts`.

Shoot with `--renderer gpu`: the frames are drawn on the graphics card, with no screen, in about a third of the time.
Where it reaches no card it draws in software and warns "--renderer gpu reached no graphics card", and a page that
draws with WebGL may then draw nothing: where a canvas on the contact sheet is empty, shoot again without the flag. A
room that ends "the graphics card dropped the room's canvas" asked the card for more memory than it had: shoot at
`--quality draft`, or bring less markup that near the eye there. A piece or a picture asks no more than its picture
holds however near it comes; words, code, panes and an SVG ask more the nearer.

### A film's shape

A film is a TypeScript file whose default export is `defineFilm({ formats, address, serve, ready, steps })` from
`livereel`: its formats by name, each a frame and the screen its page is laid out on (`{ square: { frame, screen }
}`); the page's `address`; `serve`, the command that serves it there where the film starts the app (`'npm run dev'`,
run in the film's folder until the address answers, stopped after the take), left out for a page someone else serves
or that already runs; `ready`, when the page stands as the first frame shows it; and `steps(whole, formatName)`. The
port is the film's: name one the command serves on and nothing else holds. Every other field of `defineFilm` is in the
README's table, "A film". Read `node_modules/livereel/examples/example-com.ts` first: it is a whole film.
`examples/livereel-promo.ts` serves an app of its own and clicks it for real; its server is
`examples/livereel-promo/server.ts`, and what a click brings, data the server and the film both read,
`examples/livereel-promo/acme.ts`. `examples/livereel-recipes.ts` plays the recipes below on that app, an act each.

A film shot on its set names `set: { scenario, targets, sharpness }`. The scenario is Playwright code run once on the
app by `livereel set film.ts --format NAME`, after `ready`: it acts on the app as a person would, and marks each state
the film shows, `await context.state('refreshed')`, a name of letters, digits, dashes and underscores. `targets` are
the selectors the film reads, measured in every state; a move on one left out is refused. The film opens on the first
state and shows another by an act, `...cursor.click(({ set }) => set.show('refreshed'))`; it scrolls, types and acts on
no page. Shoot the set again after the app, a format, the targets or the sharpness change. README: "The set".

### Writing it

- Split the steps into acts, a function each; name every selector at the top, by test id or role where the page has
  them.
- Write a step's timing, framing and rhythm as numbers in place, each the value of its keyword (`seconds`, `start`,
  `end`, `air`, `zoomAtMost`, `every`, `tilt`, `turn`, `roll`, `scale`, `depth`, `dim`, `fade`, `ring`, `glow`,
  `shadow`, `blur`, `thinkingShare`, `seed`, `slipAt`, `pace`, `pixels`, `top`, `takes`, `after`); any other number is
  a constant at the top.
- Every move that runs over time takes `within: { start, end }`, its share of the step, and `ease`, its own curve.
  In a long play timed to a cut or music, give it the play's seconds instead: `{ after: 2.2, takes: 0.9 }`, and a
  move at a moment `{ after: 2.2 }`; never work seconds out into shares by hand.
  Two moves of one part run at once only where each names values the other does not (`window.to` beside
  `window.lean`, two `effects`); otherwise give them shares one after the other.
- Frame by selector, so one script fits every format. A pose in numbers, or a box of the screen for a page with
  nothing to select, is given once per format, in a record of the film's format names
  (`Record<keyof typeof FORMATS, Pose>`, or `Box`), picked by the `formatName` that `steps` is handed: the type checker
  refuses a format left out. livereel refuses a value of the wrong kind as the film is defined and its steps before
  its page is served; check the types in the editor or with the project's type checker before shooting.
- Prefer the page's own states to anything drawn over it: open a panel with its own button, not by hiding parts of the
  page.
- A static page, the default, stands in a tab of its own, as a person opens it: one that refuses frames is shown, and
  one that signs in is signed in in `ready` or in an act, with an account the user gives for the film.
- A dynamic page (`page: 'dynamic'`) stands live in the stage's frame. One that refuses frames, which livereel refuses
  naming the refusal ("refuses to be framed (X-Frame-Options: DENY)"), or signs in: write `stage: 'inside'`. Read what
  each stage costs in the README, "Where the stage stands", and tell the user before shooting.
- A shot whose window leans far, or that the eye flies low over, is drawn sharper as a room: `drawing: 'room'`, for a
  static page, shot with `--renderer gpu`. Flat draws a leant window as soft as the browser draws a layer in 3D, and
  blurs it by the eye's focus as one; the room blurs each point by its own distance. README: "Flat, or a room".

### The moves

A move's line, by the question of the frame it answers. The README section named holds the rest; read it before a
move's first use. A refusal named here changes how a film is written; the README lists the others.

**How time goes** (README "How time goes")

| Move | |
|---|---|
| `play({ seconds, moves, ease })`, `hold({ seconds })` | so many seconds of frames, each move over its share; so many with nothing moving |
| `cut(...moves)` | moves made at once between two frames, each as at its end; every move reads the scene the ones before it left |
| `act(action)` | the page acted on for real between two frames: `context.page`, `context.motion.release()` and `.still()`, `context.set.show(name)` |
| `typing(move)` | as long as the keys of `page.type`, `terminal.type` or `screen.type` take, and a beat; spread it, `...typing(...)` |
| `linear`, `easeInOutSine`, `easeInOutCubic`, `easeInCubic`, `easeOutCubic`, `easeOutQuint`, `easeOutBack` | curves; `easeInOutSine` a step's own; `easeOutBack` bounces a `to`, `lean` or camera move, never a whole play, a show or a hide |
| `cubicBezier(x1, y1, x2, y2)`, `atSpeeds({ settingOff, arriving })`, `softThenHeld(fastestAt)` | CSS's curve; set off and arrive at speeds, 0 to 3 times the mean, so two plays join with no jolt; soft then held, as a dive runs on |
| `keystrokes(text, { seed, slipAt, pace })`, `keystrokes(text, { lettersPerSecond })` | a person's uneven keys, a slip at letter `slipAt`, gaps `pace` times as long; or an even beat |
| `page.speed(speed)` | the page's seconds a film second runs, 1 until set, 0 still; acts still wait at the wall's time ("The page's clock") |

**What the page shows** (README "What the page shows")

| Move | |
|---|---|
| `page.act(action, { within: { start } })` | an act at a moment of a play, the camera going on; refused where a scroll or typing of the page runs across it |
| `page.scrollBy(selector, { pixels })` | a block's own scroll moved; scroll in a `play`, a little each frame, or lazy pages show blank |
| `page.scrollTo(selector, { top })` | scrolled until the block stands `top` below the top of what scrolls it |
| `page.type(strokes, { keyboard })` | in `typing()`: real keys into whatever holds the page's keyboard |
| `screen.shows({ html }, { reaches, fade, within })`, `screen.shows('filmed', { fade, within })` | a page of the film's own in the filmed page's place, or the filmed page back; `fade: { seconds, ease }` dissolves ("A page of the film's own") |
| `screen.scrolls({ html }, { pace })` | its page run `pace` of its pixels a second, 0 stopped, below 0 back up: the only way it moves |
| `screen.scrollTo({ html }, selector, { top, judged, within })` | brought to rest with a block `top` below the screen's top as its share ends, no `ease`; stop the page first where it would turn back |
| `screen.type({ html }, strokes, { into, keyboard })` | in `typing()`: what is typed stands as the text of `into`'s block, a span beside its caret, never an `<input>` |
| `screen.blinks({ html }, selector, { seconds })` | a block blinking as a caret, a blink every `seconds`, until blinked again |
| `screen.sweep({ from, slant, round, width, crest })` | in a `play`, the picture swept away by a band of light, or a disc `round` a block; act a moment after it begins, `within: { start: 0.02 }` ("A sweep") |

A page of the film's own stands as written: no script of it runs, one that animates of itself is refused, an image or
a font in it takes a whole address or a `data:` URL, and selectors name its blocks where they stand. Lift a piece off
it `picture: 'held'`; a lens over it is refused. Write a fade first in a `cut` with the camera's move after it, so the
page coming is framed at once while the page going stands; with `window.shade({ fade: 1 })` in the cut, brought to 0
in the next play, the page coming rises out of the dark. A fade from a shaded page, a running page or one drawn past
its screen is refused. `reaches: 'document'` draws a page past the screen's top and foot: lay it out in pixels, as
`vh` is the sheet's height.

**What it lies on** (README "What it lies on: the window")

| Move | |
|---|---|
| `window.to(place, { depth, through, shape, pace })` | the page drawn back into a window at a place, `'whole'` back to the frame; `depth` toward the eye, under the focal length; `through` places on one curve, as an object's `to`; travels apart from the camera |
| `window.show({ at, from })`, `window.hide({ toward })` | the window sliding in whole from past a side, or out; with words sliding the other way, a push |
| `window.lean({ tilt, turn, roll, over, about })` | leant back, swung, rolled, turned over, in degrees, about its middle or a point `about` names, `about` changed only while the window faces the frame ("Leaning") |
| `screen.rise()`, `screen.lower()` | the screen up out of the ground, or down into it; at once in a `cut` |
| `screen.behind({ html }, { upright, within })`, `screen.behind('none')` | a page of the film's own on the window's back, upright once turned `'over'` or `'round'`; frame the whole screen before the window turns ("Its back") |
| `window.body({ thickness, rim, metal, roughness, glass, glint }, { within })` | a room only: a slab of metal and glass round the page, none by default; set in the first `cut`; give the world soft boxes to see it ("Its body") |

**What else stands in the world** (README "What else stands in the world")

Every object stands on the frame, `inside: 'window'` or `inside: 'world'`, at a place: `whole`, `left`, `right`,
`top`, `bottom`, a format's name, or `{ of, left, top, width, height }`. `as` names one of several. `enter` and `leave`
bring it whole in a way, `'fade'`, `'mask'`, `'wipe'`, `'iris'` or `'grow'`, from an `edge`; `from` and `toward` slide
it, a push, never beside a way. `to(place, { scale, depth, through, shape, pace })` carries it, `lean` leans it as the
window, `effects({ ring, glow, shadow, blur, colour, melt, fade, scale, depth })` sets it apart, and a show takes
`effects` too, so it comes up so. `group` and `zIndex` stand it in a group.

| Move | |
|---|---|
| `title.show(text, { at, beside, align, size, letterSpacing, lineHeight, words, from, enter, edge, as, inside, group, zIndex, effects })` | words over the whole frame or at a place, coming one after another in the look's way; `\n` breaks a line ("Titles") |
| `title.to(place, { scale, depth })`, `title.lean({ tilt, turn, roll, over, about })`, `title.effects(...)`, `title.hide({ toward, leave, edge, words })` | carried, leant, set apart, gone |
| `title.intoTheWorld({ as })` | in a `cut`, a title on the frame or beside a part handed into the world as it stands, so the eye flies past it; never placed by hand |
| `caption.show(text, { words, enter, edge })`, `caption.hide({ words, leave, edge })` | words at the foot, or the top with `captionAt: 'top'`, one at a time, under keys |
| `callout.show(target, text, { side })`, `callout.hide()` | a card beside a block, pointing at it, `above` unless `side` says |
| `note.show(target, text, { at })`, `note.hide()` | words on the ground beside a window, a line to a block; refused while the page fills the frame |
| `pin.show(target, label)`, `pin.clear()` | a numbered mark on a block, after those before; all taken away |
| `keys.show(caps, { enter, edge })`, `keys.hide({ leave, edge })` | a shortcut's caps at the foot, `['⌘', 'Enter']`, over a caption |
| `code.show(text, { at, longLines, from, enter, edge, as, inside, group, zIndex, effects })` | a dark pane of code `at` a place, needed, coloured as TypeScript; `longLines: 'cut'` keeps the letters at `codeSize` ("Code and the terminal") |
| `code.light(line, { through })`, `code.scrollTo(line)` | a line lit by words only it says or its number from 1, to `through`; longer code scrolled |
| `code.to(place, { scale, depth })`, `code.lean(...)`, `code.effects(...)`, `code.hide({ toward, leave, edge })` | as any object |
| `terminal.open(title, { at, from, enter, edge, as, inside, group, zIndex, effects })` | an agent's terminal, across most of the frame unless `at` says |
| `terminal.type(strokes, { keyboard })`, `terminal.submit()`, `terminal.works(lines, thinking, { thinkingShare })` | keys typed; Enter, in a `cut`; thinking, then lines `{ kind, text }`, a kind `asked`, `work`, `said`, `done` or `thinking` |
| `terminal.to(place, { scale, depth })`, `terminal.lean(...)`, `terminal.effects(...)`, `terminal.hide({ toward, leave, edge })` | as any object; `hide` lets it go |
| `light.on(target, { dim })`, `light.to(target)`, `light.off()` | one block lit, the rest dimmed; carried; put out ("The light and the cursor") |
| `cursor.to(target, { entering, bow, into })` | along an arc to rest a little into a block, or at `into`, in shares of it; from `entering` where it is off the screen |
| `cursor.click(action, { sound })`, `cursor.press({ sound })`, `cursor.release()`, `cursor.hide()` | a click's steps, the camera stopping, spread with `...`; in a play, press, `page.act` and release; hide in a `cut` |
| `picture.show(file, { at, from, enter, edge, as, inside, group, zIndex, effects })` | a mark or a logo from a PNG, JPEG, WebP, AVIF, GIF or SVG with a width and height ("Pictures") |
| `picture.to(place, { scale, depth })`, `picture.lean(...)`, `picture.effects(...)`, `picture.hide({ toward, leave, edge })` | as any object |
| `piece.show(target, { every, air, corner, hole, lines, picture, inside, body, rides, letters, enter, edge, as, group, zIndex, effects })` | a block of the page lifted where the camera shows it; refused on a dynamic page and while the window leans ("Pieces of the page") |
| `piece.to(place, { scale, depth })`, `piece.lean(...)`, `piece.effects(...)`, `piece.back()`, `piece.hide({ toward, leave, edge, sheen })` | as any object; `back` over its source; `sheen`, a light trailing a wipe |
| `piece.onto(target, { fall })` | the piece landing on another block, as large as it holds it; from the world, coming down on the `fall` curve |
| `piece.empties(block)` | the block a piece will land on hidden until the piece goes |
| `outline.show(target, { every, line, enter, edge, as, group, zIndex, effects })` | a ring in the accent round blocks or a box, from no picture, so a live page takes one ("Outlines and lenses") |
| `outline.to(place, { scale, depth })`, `outline.lean(...)`, `outline.effects(...)`, `outline.back()`, `outline.hide({ toward, leave, edge })` | as a piece |
| `lens.show(target, { magnification, size, enter, edge, as, group, zIndex, effects })`, `lens.to(target)` | a round glass, 320 across, 2 times as large, round a block's middle: aim it at the element whose middle it should show |
| `lens.effects(...)`, `lens.hide({ toward, leave, edge })` | as any object |
| `group.show({ at, order, as })`, `group.to(place, { scale, depth })`, `group.lean(...)`, `group.hide()` | objects shown with `group` turned, grown and brought near as one; `order: 'depth'` for a ring ("Groups") |
| `thing.show(made, { at, reach, values, inside, from, as })`, `thing.set(values)` | a room only: the film's own three.js from its `things` module, set from its numbers and `shown` alone ("Things") |
| `thing.to(place, { scale, depth })`, `thing.lean(...)`, `thing.hide({ toward })` | as any object; no ways or effects |
| `ending.show({ name, line, command }, { from, enter, edge })`, `ending.hide({ toward, leave, edge })` | the end card on the frame's ground, with a chime; first or last, never carried ("The ending card") |

A piece in a few words: lifted off one block, it is as round as the page draws it, and `corner` rounds only a
stretch lifted with `air` or off several blocks or a box; `hole: {}` leaves its place
empty; `lines: 'solid'` ties it to its source; `picture: 'held'` keeps it as it was lifted while the page changes;
`inside: 'world'` stands it in the world, and only there may it ride its block's scroll (`rides: 'its block'`), have
walls (`body: { thickness, glow }`, of the colour along its edge, or `walls` named), leave a socket or pit (`hole: { reach, pit: { depth, glow } }`) and stand
in the window's shade, as soft and faded as its page until it rises `clearAt` that many pixels (`shade: { clearAt }`),
the last three a room's alone; a piece in the shade is never given a blur or fade of the page's by hand; `letters`
names the block of its source whose letters land letter on letter on the block `onto` names. A thing is lit by the
world's `lights` and `softBoxes`, never the theme's; glass in it writes no depth, `depthWrite: false`. Never wrap
what three.js does in a thing: build it in the module.

**Where it is seen from** (README "Where it is seen from")

| Move | |
|---|---|
| `camera.to(pose, { through, shape, pace })` | to a pose, `whole` or `{ focusX, focusY, zoom }`, one per format ("The camera") |
| `camera.onto(target, { every, air, zoomAtMost, through, shape, pace })` | blocks framed with `air` round them in whatever window stands, and kept framed; keep the zoom at 2.2 or under |
| `eye.to({ at, aim, up }, { through, shape, pace })`, `eye.to('rest')` | the eye at a spot looking at another, `{ across, down, out }` frame pixels; an up turned half round needs a place between ("The eye") |
| `eye.onto(target, { fills, middleAt, turned, pace })` | before a part, filling `fills` of the frame, turned under a quarter round; `pace: 'even'` dives in, the default draws back |
| `eye.fly(legs, { shape, heading, tip, turning })` | legs `to`, `ahead`, `along` a figure or `onto` a block, timed by `takes`; heading and tip keys by leg; draw it as a room ("A flight") |

A flight's gaze is read where the eye stands: to hold a block through a leg, name the hold at both its ends. An `onto`
leg sets the gaze itself, so name no heading or tip key by it. Where a reference turns the whole view in one rotation,
as a dive from looking down aslant to level along a row, write `turning: 'whole'`, and shoot a still mid-turn beside
the reference. A dive: legs `[{ to: { over: '#gap-start', height: 120 }, arriving: 90, bend: 0.5 }, { to: { over:
'#gap-end', height: 120 } }, { ahead: 2 }]`, heading `[{ by: 0, degrees: 90 }]`, tip `[{ by: 0, degrees: 0 }, { by:
1, degrees: 0 }, { by: 2, degrees: 60 }]`: level by the gap, along it level, lifting once past it.

**What is sharp** (README "What is sharp")

| Move | |
|---|---|
| `eye.focus(on, { aperture })` | the focus so far off, at a spot, a block, `{ object }` or `{ under: { left, top } }`, open `aperture` frame pixels; shares a step with `eye.to` ("Focus") |
| `window.shade({ dim, fade, blur, sharp, sharpSoftens, reaching, blurSeen })` | the page dimmed, faded or blurred behind what stands clear; `sharp` keeps a part, never slid; sets only what it names ("The shade") |

To hand the sharp part on mid-glide: `window.shade({ blur: 0, within: { end: 0.5 } })`, then `window.shade({ blur: 6,
sharp: NEXT, within: { start: 0.5 } })`. `sharpSoftens: 0.75` on a lift's curve softens the part as a button rises
off it. `reaching: 'window'` softens and fades the whole window with the page, so no sharp rim stands round a soft page;
`blurSeen: 'on the frame'` keeps the blur as wide on the frame as the eye comes in. `sharp` is refused on a live page
and on a page of the film's own. Motion blur is `defineFilm`'s `motionBlur` ("Motion blur").

**How the world looks** (README "How the world looks")

| Move | |
|---|---|
| `look.to(theme, { within })` | the look moving to any theme values; through the values between in a play, at once in a cut ("The look") |
| `world.to(world, { within })` | the world's lights, soft boxes, bloom and grain moving; a light fades in from `strength: 0` ("The world's light") |

**What is heard** (README "What is heard")

| Move | |
|---|---|
| `sound.play(file)` | a file of the film's heard as its share begins; it moves nothing, so it shares a step with anything |

### Sound, look and world

- Sounds are few and quiet: a click, the keys, the ending. Leave the keyboard as livereel sets it unless the user asks
  for another; the README names each by the keyboard it was recorded on. One typing heard on another keyboard names
  it, `page.type(strokes, { keyboard: 'butterfly' })`: two people typing, or a film that shows the keyboards off.
- Music only where the user asks for it, and quiet under the clicks (`volume` about 0.3) unless they want it as
  loud as its file. Music that loud buries the keys, which peak about 12 dB under the click:
  `sounds: { keyVolume: 4 }` lifts them to the click's level. Keep `sound.play` for what the page itself would
  make sound.
- A `theme` where the user names a brand's look; leave out what they do not name: livereel's own is a dark ground,
  white ink and an amber accent. A light `terminal` needs all six code colours given. The window's body is the
  window's, `window.body`, not the theme's.
- `look.to` changes the look as the film goes: a ground fading light, the glow drifting while the camera moves, dots
  fading into lines. A run of cuts a beat apart, each adding one value, shows a look built up; fade the ink a little
  after the ground, or the words pass through the ground's own grey.
- `world` lights a room's things and the window's body: show the user a still of a polished sphere for where each
  glint falls, and a still of any `bloom`, as light far past white glows wide. A slab at rest shows a faint sheen with
  `window.body({ glass: 0, glint: 0.012 })`; an end card standing in the world, `glint: 0.045`. `grain: { levels: 1 }`
  hides the bands a glow fading across a dark ground falls into.

### Recipes: setting a block apart

A block set apart from the page — lifted, grown, under a lens, in layers, spun — is no move of its own: it is a few
moves of pieces, outlines, a lens and groups, with the window's shade behind them. Here are eighteen, named as a
storyboard calls them. `node_modules/livereel/examples/livereel-recipes.ts` plays each on the promo's app, an act a
recipe, in this order, each leaving the page as it found it: read its act for the timing before writing one.

| Recipe | Moves |
|---|---|
| grows in place | `piece.show(card)`, then `piece.effects({ scale: 1.7, shadow: 1, ease: easeOutBack })` with `window.shade({ dim: 0.3 })` |
| a lens along the page | `lens.show(number, { enter: 'grow' })`, `lens.to(next)` from number to number with a hold at each, `lens.hide({ leave: 'grow' })` |
| ringed, lit, to the middle | `piece.show(card)`; `piece.effects({ ring: 1 })` with `light.on(card)`; then `piece.to(middle)`, `piece.effects({ shadow: 1 })` and `window.shade({ dim: 0.5 })`, the card itself still lit where it stands |
| lifted with a shadow | `piece.effects({ shadow: 1, depth: 300 })`, the page as it stands |
| sharp over a blurred page | `piece.effects({ depth: 500 })` with `window.shade({ blur: 8 })` |
| glowing over a dimmed page | `piece.effects({ glow: 1, scale: 1.12 })` with `window.shade({ dim: 0.7 })` |
| out beside the page | `piece.show(card, { hole: { line: 'dashed' } })`, `piece.effects({ shadow: 1, depth: 120 })`; then `window.to(box)` on the right with `piece.to(box, { depth: 0 })` on the ground across |
| the page sliced in depth | `group.show`; a piece of the whole screen and the bands lifted off it with `hole: {}`, all in the group, the bands at a `zIndex` over the page; `cut(screen.lower())` at once, as the piece of the whole screen stands where it stood, and `cut(screen.rise(), group.hide())` once it lies there again; between, `group.lean({ tilt: 40, turn: 10 })`, `group.to('whole', { scale: 0.7 })`, each band's `piece.effects({ depth })` a step nearer than the one below it, so the top band stands nearest and none hides another, and the page under them `blur: 4`; a slow `group.lean({ turn: -10 })` on `linear` for a drift |
| layers, labelled | as the sliced page, laid back and rolled as a drawing (`group.lean({ tilt: 55, roll: -45 })`, `scale: 0.45`), each layer ringed by `outline.show(layer, { line: 'dashed', group, zIndex })` brought to its depth by `outline.effects({ depth })`, each line's `zIndex` over its layer and under the next; once the stack stands, a `title.show(label, { at, size })` flat beside each layer, placed off a still; the lines go by `outline.hide` in the first half of the step the stack comes down in, so none is cut off as the window comes back |
| a fan in depth | the cards in a group, the near one at the highest `zIndex`; each `piece.to(place, { depth })` a step farther than the one before, `piece.lean({ tilt: 22, turn: 18 })`, the far ones `effects({ blur })`; `window.shade({ fade: 0.9 })`; a slow `group.lean({ turn: -12 })` |
| any area, larger in place | `outline.show(box, { line: 'dashed' })`, `piece.show(box)`, `piece.effects({ scale: 1.5, shadow: 1, ring: 1 })` |
| an inset tied to its place | `outline.show(area)`, `piece.show(area, { lines: 'solid' })`, `piece.to(beside)` with `piece.effects({ shadow: 1 })` |
| blocks in a wave | `outline.show(row, { line: 'dashed' })`, a piece a card, each `piece.effects({ scale: 1.1, shadow: 1, within })` a fifth of the step after the one before |
| larger in pushes | `piece.show(days, { air: 12 })`, the page's ground round them, no wider than the gap to the next bar; `piece.effects({ scale: 1.2 })` in a `play` of a quarter of a second, a hold, then `piece.to(middle, { scale: 1 })`, as large as the middle holds it, with a darker shade |
| a whole turn, forward | `piece.show(card, { hole: {} })`, `piece.to(middle, { ease: easeOutBack })` with `piece.lean({ turn: 360 })`; back by `piece.lean({ turn: 0 })`, then `piece.back()`, in one step |
| held while the page changes | `piece.show(thread, { picture: 'held' })`, `piece.effects({ shadow: 1, depth: 120 })`; then the act that changes the page under it, a diff shot anew, the thread still as it was lifted; `piece.back()` once the page shows it again |
| the page turns away | `window.to(box)` with `window.lean({ turn: -38 })` while `piece.to(middle)` keeps the card face-on |
| the stack turns | as layers, then a slow `group.lean({ roll: -135 })`, a quarter round on a turntable |
| a carousel | the cards in a group with `order: 'depth'`, each `piece.to(place, { depth })` round the frame's middle a third of a turn apart and `piece.lean({ turn })` facing out; `group.to('whole', { depth })` by the ring's reach; `group.lean({ turn: 360 })` over the page faded by `window.shade({ fade: 0.9 })` |

- A card with rounded corners is lifted with them: `piece.show(card)` reads its `border-radius` off the page, and off
  the one block a bare wrapper holds; the film never types a radius or a colour the page draws.
- A piece stands where it was lifted, and the film knows no place of it: grow it there by `effects({ scale })`, about
  its middle, or bring it near by `effects({ depth })`, which grows it about the frame's middle, as a block lifted
  toward the eye looks.
- One grown or brought near where it stands goes back by its effects at rest, `effects({ scale: 1, depth: 0 })`, and
  goes in a `cut`, standing over its source; one carried by `to` goes back by `back()`, face-on by its nearest whole
  turns, so one spun round does not spin back: to turn it back as it returns, a `lean({ turn: 0 })` over the first
  half of the step and `back()` over the second.
- A scale or a depth its effects set stays through a `to` that names none, and grows the piece at its new place too:
  name it in the `to`, `piece.to(box, { depth: 0 })`, where the piece should stand as the box holds it.
- Leave a hole, `hole: {}`, where the viewer should see that the block left its place: a card carried to the middle,
  out beside the page, or standing face-on before a page that turns away. Leave none where the piece grows over its
  place, where the copy is the point and its source should still show (a loupe's card lit where it stands, an inset),
  or where the page fades away behind it.
- A block a move reads is read as its share begins: in the step the window comes back, start a piece's `back()` after
  it, `within: { start: 0.5 }`.
- The camera at `whole` shows the page as large in a smaller window, cut by its edge: frame the whole screen once,
  `camera.onto(screen, { air: 0 })` with the screen's box, and the page stays whole in whatever window stands.

### A film its own page draws

Where the user's film needs what steps do not give — a world of its own in three.js — write it as a page that draws
each moment itself, and `defineDrawnFilm({ formats: { wide: { frame } }, address, serve })` it, its page served by
the project's own command, as a plain static server of the film's folder (`npx http-server -p 8741 -a 127.0.0.1`) or
Vite: the page sets `globalThis.livereelDrawnFilm = { ready, duration, at(seconds) }` as its script runs, and draws a
moment the same however it was asked before, so a still or a clip of its middle draws alone. Use three.js as it is:
write a light, a plane wearing a picture or a material in its own few lines, never a wrapper round them. Steps first:
reach for this only where they fall short. README: "A film its own page draws".

## 4. Checking it

You cannot watch a video. Look at frames:

```bash
npx livereel shoot film.ts --format square --out out --sheet --renderer gpu        # the video, a frame a second
npx livereel clip film.ts --format square --out out --from 12 --to 15 --sheet --sheet-rate 6   # six a second
npx livereel still film.ts --format square --out out --at 12.5                      # one still, no video
```

A full shoot takes minutes: run it in the background. A clip of a few seconds takes less, and a still seconds.

- `--format` names the format to shoot; a film of one format needs none. `--as gif` or `--as webm` makes the video
  as a GIF or a WebM, and `--as mp4 --as gif` both from one take: shoot the kinds the user asked for once the film is
  checked.
- `--quality draft` shoots quicker: at the frame's own size and unblurred. Use it for a first look at the timing;
  judge the film on sheets and stills shot at the default, `finest`.
- After every change, read the contact sheet of every format; read every new shot at full size with `--at`. A change
  to one shot needs no whole shoot: `clip` its span, read its sheet at six frames a second to follow the move, and
  hand the user the clip.
- A film is shot at 60 frames a second; leave it unless the user asks for another, `framesPerSecond: 30`.
- Check what the eye checks: is the caption about what is lit, is the text readable at this size, does any edge of
  the screen show where it should not, is anything cut off.
- Where anything moves fast, a frame is blurred along its way, as a film camera blurs it: a still in the middle of a
  fast move or a slide shows it smeared, and that is right. Read text where it has settled. Leave the blur as livereel
  sets it unless the user asks for another: `motionBlur: { shutter, exposuresAtMost }`, or `{ enabled: false }`.
- Say plainly that you saw frames, not the film: the last look at the moving film is the user's.

## Traps already met

- A dynamic page on the stage apart sends its own requests without its cookies, so an app behind a sign-in shows
  nobody signed in. Ask the user before writing the film whether the pages it shows need a sign-in; if they do, film
  the page static, or dynamic with `stage: 'inside'`, and an account for the film. A session only the user can sign
  in to (two factors, a sign-in elsewhere) cannot be filmed yet: say so and stop, or film a page that needs none.
- A dynamic page on the stage apart: a click that moves the top page, as a link to `_top` does, takes the stage away,
  and livereel refuses the film: click such a link on the stage inside the app, where it does nothing, or leave it
  out.
- Do clicks in `act`: a dynamic page's screen is laid flat at its own size first, as a browser places a click wrongly
  on a screen the camera has scaled; a static page is clicked in its own tab.
- A static page is pictured as sharp as a camera 2.2 times close needs: keep `zoomAtMost` and a pose's zoom at 2.2 or
  under, or its text shows softer. A piece grown larger, flat, stays sharp; a held one, a leant one and a lens soften
  past 2.2.
- A screen taller than the frame, a runway the eye flies low over, is pictured whole each time the page changes: keep
  acts and typing on it few. On a graphics card a screen 1040 wide and over 3,723 px tall shows its close shots
  softer, and livereel warns once, naming the zoom past which it is; in software it is sharp up to 14,886 px but a low
  flight shoots far slower. Shoot the close shots in software, or keep the camera under the zoom the warning names.
- The page is asked for the light colour scheme: an app that follows the system's scheme is filmed light, unless the
  film writes `colourScheme: 'dark'`.
- A real app shows real people's addresses, keys and names: ask the user what must not be seen, and write
  `blurred: [selector, …]`. Check on the stills that nothing private reads.
- The page is asked for reduced motion, so a page whose styles honour it stands still between frames; one whose
  styles animate anyway animates on the wall clock, and two shots of it differ. Where such an animation must show (a
  CSS spinner of the page's own), release it in an act, `context.motion.release()`, and still it after: it plays sped
  up, which reads as time-lapse. What the page's script animates plays on the film's time.
- The page's timers run on the film's time: a note the app takes away after 5 s goes 5 s into the film. While an act
  waits on the page its time runs as the wall's, so an act may wait for anything the page does after a delay.
- A static page that changes where its document does not — a video, a canvas, an animation that ignores reduced
  motion, a change inside a shadow root — stands still through a hold: write `page: 'dynamic'` for it, and it is
  captured every frame, at the cost of a slower shoot.
- A long scroll in one frame step shows blank space where the page renders lazily: scroll in a `play`, a little each
  frame.
- A box is read as its move's share begins: a block a scroll in the same step is still moving is read mid-way, so
  start the light after the scroll's share ends.
- A window that comes from far to cover the frame with a page on it is laid where it ends and started far,
  `window.to(COVERING, { depth: -3000 })` then `{ depth: 0 }`, never laid small and brought near: a room draws the
  window as dense as its laid box, so one brought nearer shows its text magnified and soft.
- A page drawn back from close to a slab is the camera's till it fills the window and the window's after, as
  `camera.onto(screen, { air: 0 })` keeps it whole there: give both moves keys read off one way at even steps of it,
  `camera.to(pose, { through, pace: 'keys' })` then `window.to(place, { through, pace: 'keys' })`, each on its part of
  one curve, so the page's way and speed run on through the hand-off; a window going straight where the way bends
  turns there at once.
- An outline and a lens, and a piece lifted onto the frame, need the eye looking straight ahead at the window: send it
  so first, `eye.to('rest')`. A piece lifted `inside: 'world'` is taken off wherever the eye stands.
