---
name: reel
description: Direct and shoot a short film of a live web page with livereel — story first, then a storyboard, then the film as steps, checked frame by frame. Use when the user asks for a promo, a demo or an explainer video of a web app or of a feature.
---

Make a film of a real web page: the page runs live, livereel moves a camera,
a light, a cursor and captions over it, and shoots it frame by frame on a
clock of the film's own. What the page does is real — clicks, typing, its
server's answers — and a wait costs the film nothing.

Work in this order and show the user each stage before the next. A film
built before its story is agreed gets rebuilt.

## 1. The story, in words

Answer these, in a few lines, and get the user's word on them:

- **Who watches**, and where: a README, a feed, a talk. It sets the length
  and the frame: 16:9 for a page or a talk, square for a feed, 9:16 for
  stories. A film shown in several places names a format for each.
- **The problem** the viewer knows from their own work, shown before any
  answer. A viewer who has not felt the problem does not care for the fix.
- **The turn**: the one moment the product answers it.
- **What the viewer should be able to say after**, in one sentence.

Let speed carry meaning: what is hard can rush past or tilt away; what the
product makes clear stands face-on and still enough to read.

## 2. The storyboard

A table, one row a shot: seconds, what is on the screen, what moves, the
caption. Speak in the director's words, which are the tool's:

| Word | In livereel |
|---|---|
| framing | `camera.onto(selector, { air })` — what the frame holds |
| angle | `camera.to(pose)`, `camera.onto(…, { tilt, turn })` — the screen leans back or swings |
| camera move | a `play({ seconds, moves, ease })` |
| light | `light.on`, `light.to`, `light.off` — one block lit, the rest dimmed |
| cast | what the page shows, opened and closed by `act` |
| action | what the page does for real: a click (`cursor.click`), keys typed into it (`typing(page.type(strokes))`), anything else in an `act` |
| caption | `caption.show(text)`, `caption.hide()`; at the frame's foot, or its top in a format with `captionAt: 'top'`, which leaves the foot to keys |
| title card | `title.show(text)` — words over the whole frame, on the film's ground; `title.hide()` |
| split | `window.to('right')`, `camera.onto(selector)` and `title.show(text, { at: 'left', within: { start: 0.5 } })` in one `play` — the page draws back into a window on one side, the camera keeping the block framed in it, then the words come up on the ground across from it; `window.to('whole')` brings the page back to fill the frame; name the places per format from `steps`' format name: words above the window in a square, beside it in a wide frame; a format's `split` sets the words' share and the margins, `{ wordsShare: 0.28 }` for words that ask less room above a square's window |
| code beside | `code.show(lines, { at: 'left' })` with the page's window `to('right')` — the film's code on one side, the page doing it in the window across; a heading over it in a place of its own (`title.show(text, { at: { of: 'left', height: 0.2 } })`, code `at: { of: 'left', top: 0.25, height: 0.75 }`); `code.light(n)` as the page does what line `n` says; short lines, or a larger `wordsShare` |
| entrance | `cut(screen.lower())`, then `screen.rise()` in a `play`; `ending.show(card)` |
| tempo | how long each `play` and `hold({ seconds })` lasts |

What reads as made with care:

- **One motion at a time.** The camera leads, settles, then holds long
  enough to read: about a second for every four words on the screen.
- **The camera does the transitions**: it travels from one block to the
  next rather than cutting.
- **Captions of three to six words**, addressed to the viewer as "you", and
  about what is lit at that moment, never about something else.
- **Real UI the whole time**, cropped close to the part that matters. A
  phone shows a whole page too small to read.
- **People type unevenly**: `keystrokes(text, { seed, slipAt })` with a
  slip now and then; an agent works for a second or two before it answers.
- **A title card or a split for the turn, not for every shot**: a title
  card to open on the problem or close on what the viewer should say, a
  split where one claim stands beside the block that proves it. One word or
  phrase set apart (`{ text, italic: true }`, an `ink`, a `marker`) carries
  the claim; a title in many styles reads as a ransom note.
- **A callout names one small block** the viewer would not find alone (a
  button, a number), in two to five words, one at a time, and goes before
  the camera moves on; a caption speaks to the viewer, a callout labels.
  Frame the block with air on the callout's side: the frame's edge, or a
  window's, cuts a card that reaches past it. Beside a window, a note says
  the same from the ground across from it and leaves the page whole; show it
  in place of the split's title, and hide it before the window moves.
- **Pins for a path** of three or four steps the viewer will repeat, each
  laid as the camera reaches its block; clear them before the next shot.
- **Keys for a shortcut** worth learning, while it is pressed in an act,
  never for text typed; not while a caption stands, as both take the foot.

What reads as generated: a zoom on every click, a glow behind the product,
springy overshoot, ripples on clicks. Leave them out.

## 3. The film

livereel is installed in the project the film lives in, and needs Node 22.20
or later and ffmpeg on the path. If `node` is missing, tell the user to
install Node and stop; do not install it yourself. Otherwise:

```bash
npm i -D livereel      # or pnpm add -D livereel
npx livereel setup     # the browser films are shot in; it says if ffmpeg is missing
```

If ffmpeg is missing, tell the user to install it and stop. If the browser
will not start for a system library it lacks, on Linux, tell the user that
`npx playwright-core install-deps chromium` installs them. A film is an ES
module: the project's `package.json` says `"type": "module"`, or the film's
file is named `.mts`.

Shoot a film with `--renderer gpu`: its frames are drawn on the graphics
card, and it needs no screen. On Linux, where it was tried, a full shoot
took about half as long as in software (the promo, blurred: 271 s against
495 s); on macOS and Windows it is not tried yet. Where it reaches no
graphics card, it draws the frames in software all the same and warns
"--renderer gpu reached no graphics card"; a page that draws with WebGL may
then draw nothing. Where it warns and a canvas on the contact sheet is
empty, shoot the film again without the flag.

A film is a TypeScript file whose default export is `defineFilm({ formats,
serve, ready, steps })` from `livereel`: its formats by name, each a frame
and the screen its page is laid out on (`{ square: { frame, screen } }`),
how the page is served (`atAddress(url)` for a page someone else serves, or
a server the film starts and stops), when the page is ready, and its steps.
`steps(served, whole, formatName)` is handed the whole screen's pose and
the name of the format it is shot in. Read
`node_modules/livereel/examples/example-com.ts` first: it is a whole film.
`node_modules/livereel/examples/livereel-promo.ts` serves an app of its own
and clicks it for real; its server is
`node_modules/livereel/examples/livereel-promo/server.ts`.

- Split the steps into acts, a function each; name every selector at the
  top, by test id or role where the page has them.
- Write a step's timing, framing and rhythm as numbers in place, each the
  value of its keyword (`seconds`, `start`, `end`, `air`, `zoomAtMost`,
  `every`, `tilt`, `turn`, `dim`, `thinkingShare`, `seed`, `slipAt`, `pace`,
  `pixels`, `top`); any other number is a constant at the top.
- Two moves of one part — a prop, or the page — share a step only one after
  the other: `play` and `cut` refuse them at once.
- Frame by selector, so one script fits every format. A pose given in
  numbers is given once per format, in a record of the film's format names
  (`Record<keyof typeof FORMATS, Pose>`), picked by the `formatName` that
  `steps` is handed: the type checker refuses a format left out. livereel
  runs a film with its types stripped, and refuses a value of the wrong
  kind where it stands, as the film is defined and its steps as it is
  served; the type checker finds more,
  so check the types in the editor or with the project's type checker
  before shooting.
- Prefer the page's own states to anything drawn over it: open a panel with
  its own button, not by hiding parts of the page.
- An app whose page refuses frames, which livereel refuses naming the
  refusal ("refuses to be framed (X-Frame-Options: DENY)"): write
  `stage: 'inside'` in `defineFilm`, where livereel takes the refusal off.
- An app that signs in: write `stage: 'inside'` in `defineFilm`, and sign
  in in `ready` or in an act, as a person does, with an account the user
  gives for the film. The stage then stands on the app's own address. Read
  what each stage costs in `node_modules/livereel/README.md`, "Where the
  stage stands", and tell the user before shooting.

### Sound

A film is heard as well as seen: a click as the cursor presses, a key for
every stroke typed, a soft chime as the ending comes up, each on its own
frame. These are livereel's own, quiet and CC0, the keys recorded on real
keyboards. `defineFilm` takes, beside the rest:

- `sounds: { keyboard }`, the keyboard the keys are heard on: `membrane`
  where none is named, `mechanical`, `mechanical-bright`, `butterfly`,
  `laptop` or `clicky`;
- `sounds: { click, key, ending }`, any of them: a file of the film's own in
  its place, a path from the film's file, any kind ffmpeg reads, or
  `{ enabled: false }` to turn it off, as `sounds: { key: { enabled: false } }`.
  The click and the ending may stand beside a keyboard; a key given so takes
  the keyboard's place, and is never named beside it;
- `sounds: { enabled: false }` for none of livereel's;
- `music: { file, volume }`, a track under the whole film, `volume` 1 as
  loud as the file, cut to the film's length and faded out at its end.

How to use them:

- Sounds are few and quiet: a click, the keys, the ending. Never a whoosh
  on a camera move or a sound on every caption: that reads as generated.
- Leave the keyboard as livereel sets it unless the user asks for another,
  and pick it by what the user says: `membrane` is an office keyboard
  (Cherry KC 1000), `mechanical` a mechanical one (WhiteFox), and
  `mechanical-bright` a brighter, sharper one; `butterfly` is a MacBook
  Pro's of 2018, `laptop` another laptop's, `clicky` a loud click with its
  release.
- Music only where the user asks for it, and quiet under the clicks
  (`volume` about 0.3).
- `sound.play(file)` in a `play` or a `cut` is a sound of the film's own
  at a moment, the start of its share; keep it for what the page itself
  would make sound.

### What a film is written with

Every move that runs over time takes its timing as its last argument:
`within: { start, end }`, the share of its step it runs over (0 to 1, the
whole step if left out), and `ease`, its own curve where it does not take
its step's.
`cursor.hide()` and `terminal.submit()` are made at once and take none:
write them in a `cut`. Any other move in a `cut` is set at
its end at once.

| Steps | |
|---|---|
| `play({ seconds, moves, ease })` | so many seconds of frames, each move eased over its share |
| `hold({ seconds })` | so many seconds with nothing moving |
| `cut(...moves)` | moves made at once, between two frames |
| `act(action)` | `action(context)` acts on the page for real: `context.page` is Playwright's `Frame`, `context.motion.release()` and `.still()` let the page's own animations run and still them again |
| `typing(move)` | as long as the keys of `terminal.type` or `page.type` take, and a beat after |

| Moves | |
|---|---|
| `camera.to(pose, { tilt, turn })` | to a pose: `whole` from `steps`, or `lookingAt(pose, focusX, focusY, zoom)` |
| `camera.onto(selector, { every, air, zoomAtMost, tilt, turn })` | frames the first `every` blocks a selector matches, `air` pixels round them, in whatever window stands, and keeps them framed as the window moves, the screen filling a window; an angle leans the window |
| `window.to(place)` | the page's window to a place, the frame itself at `whole`, a window on the ground anywhere else: a side's room across from the words' share, or a box in shares; travels apart from the camera, in the same `play` or not |
| `window.show({ at, from })`, `window.hide({ toward })` | the window sliding in whole from past a side of the frame to its place, or out past one, where it stays; with words sliding the other way in one `play`, a push |
| `screen.rise()`, `screen.lower()` | the screen up out of the ground from where it stands, or down into it, the window's shadow and edge with it: over a share of a `play`, or at once in a `cut` |
| `light.on(selector, { dim })`, `light.to(selector)`, `light.off()` | one block lit, the rest dimmed by `dim`; carried; put out |
| `cursor.to(selector, { entering, bow })` | along an arc to a block, from `entering` if not yet on the screen |
| `cursor.press({ sound })`, `cursor.release()`, `cursor.hide()` | pressed in with a click (`sound`, a file of the film's in its place), let go, taken off the screen |
| `cursor.click(action, { sound })` | pressed with its click, `act(action)`, let go: the steps of a click |
| `callout.show(selector, text, { side })`, `callout.hide()` | words on a card beside a block, pointing at it, `side` `above` (where none is named), `below`, `left` or `right`; carried with the page |
| `note.show(selector, text, { at })`, `note.hide()` | words on the ground beside the page's window, on the side clearest of it or `at` a place beyond it, a line drawn from them to a block in it; only with a window, which stays until `note.hide()` |
| `pin.show(selector, label)`, `pin.clear()` | a numbered mark on a block, after those laid before, the earlier labels quietened; all taken away |
| `keys.show(caps)`, `keys.hide()` | the caps of a shortcut at the frame's foot, as `['⌘', 'Enter']` |
| `title.show(text, { at, align, size, from })`, `title.to(place)`, `title.hide({ toward })` | words coming up one after another on the film's ground over the whole frame, or `at` a place, in place of any title shown; going, the ground with them. `size` is this title's letters' own, in pixels of a 1080 frame, in place of the look's `titleSize`, over the whole frame or in a place alike: one word set large; a word larger than its place runs past it, so look at it on a still. In a place it slides in whole `from` a side, travels `to` another place, slides out `toward` a side: a title shown `from: 'right'` while one stands in a place pushes it off to the left as one sheet, and the window, code or the card slide with it in the same `play`. A place: `whole`, `left`, `right`, `top`, `bottom`, or `{ of, left, top, width, height }` in shares of the frame or of the place `of`, past the frame's edge if it must |
| `code.show(text, { at, from })`, `code.to(place)`, `code.light(line, { through })`, `code.hide({ toward })` | a dark pane of code `at` a place, beside the page's window or alone, sliding in `from` past a side of the frame, pushing the code shown off past the side across, or out `toward` one, carried to another place by `to`; its lines coming up one after another, coloured as TypeScript; a line lit, counted from 1, or lines `line` through `through`, the rest dimmed; going |
| `caption.show(text)`, `caption.hide()` | words coming up one after another at the frame's foot, or its top in a format with `captionAt: 'top'`, in place of any shown; going |
| `look.to(theme, { within })` | the film's look moving to any of a theme's values: through the values between in a `play`, at once in a `cut`; two at once in a step where they name no value alike |
| `terminal.open(title)` | an agent's terminal coming up over the frame; in a `cut`, there at once |
| `terminal.type(strokes)`, `terminal.submit()` | keys typed into it; Enter |
| `terminal.works(lines, thinking, { thinkingShare })` | the agent thinking, its spinner beside the words `thinking`, then its lines written one after another; a line is `{ kind, text }`, its kind `work` (a tool and what it is used on), `said` or `done` |
| `terminal.leave()` | the terminal giving way |
| `ending.show(card, { from })`, `ending.hide({ toward })` | the card: `{ name, line, command }`, last, or first and taken away as the page comes; with its ground it slides in whole `from` a side or out `toward` one, so a push carries it off or brings it on |
| `page.scrollBy(selector, { pixels })` | a block's own scroll moved so many pixels |
| `page.scrollTo(selector, { top })` | the page scrolled until a block stands `top` pixels below the top of what scrolls it |
| `page.type(strokes)` | real keys typed into whatever holds the page's keyboard |
| `sound.play(file)` | a file of the film's heard as its share begins; it moves nothing, so it shares a step with anything |

`cursor.click` and `typing` give several steps: spread them among the
others, `...cursor.click(action)`, `...typing(page.type(strokes))`.

A title's, a caption's or a callout's `text` is a string, or a list of
strings and runs read one after another: a run is `{ text }` with any of
`italic`, `underline`, `strike` (each `true`), `ink` (its letters' colour) and
`marker` (a marker behind it), colours in hex, each a constant at the top:
`['Your agent ', { text: 'films', italic: true, ink: ACCENT }, ' your app']`.
Put the spaces in the strings, as the words are read.

`defineFilm` takes a `theme`, any of its values, where the user names a
brand's look. In hex: `ground` and `glow` (left out, the ground is of one
colour), `ink` and `quietInk`, `accent` and `accentInk` for pins and notes,
`windowEdge` and `windowShadowColour` (a dark edge on a light ground),
`cursorFill` and `cursorEdge`, `terminal` and `terminalInk`, and the code's
colours by kind, `codeComment`, `codeString`, `codeNumber`, `codeKeyword`,
`codeCall` and `codeKey` (made for a dark pane: give them all with a light
`terminal`). From 0 to 1: `windowShadow`, `glowX` and `glowY`, and
`terminalWidth` and `terminalHeight`, the frame's share the terminal takes.
From 100 to 900: `titleWeight` and `captionWeight`. In pixels of a 1080
frame: `titleSize`, `captionSize`, `noteSize`, `calloutSize`, `pinSize`,
`keysSize`, `codeSize`, `terminalSize`, `endingNameSize`, `endingLineSize`,
`endingCommandSize` and `windowCorner`; `titleMargin`, how far in from the
frame's sides a title over the whole frame stands, and
`captionGroundHeight`, how far the ground darkens under a caption. As CSS
names a family installed on the machine: `font` and `mono`. And
`wordsMotion`: `'soft'`, `'sharp'` or `'still'`. Leave out what the user
does not name: livereel's own is a dark ground, white ink and an amber
accent. `look.to(theme)` changes any of these as the film goes: in a
`play` through the values between (a ground fading light, the glow
drifting while the camera moves), in a `cut` at once; a font changes
half-way through a play. Two moves of the look share a step at once where
they name no value alike, a ground named alone naming its glow too: the
glow drifting over a whole play while the ink changes in a share of it. A
run of cuts a beat apart, each adding one value, shows a look built up;
fade the ink a little after the ground, or the words pass through the
ground's own grey.

The rest: `keystrokes(text, { seed, slipAt, pace })` makes the strokes a
person types; the curves are `linear`, `easeInOutSine` (a step's own),
`easeInOutCubic`, `easeOutCubic` and `easeOutQuint`.

## 4. Checking it

You cannot watch a video. Look at frames:

```bash
npx livereel shoot film.ts --format square --out out --sheet --renderer gpu   # the video, and a frame a second side by side
npx livereel still film.ts --format square --out out --at 12.5                 # one still, without the video
```

A full shoot takes minutes: the promo, 20 seconds long, took 238 to 271 s
on the graphics card and 495 s in software. Run it in the background, or
with a timeout that long; a still takes seconds.

- `--format` names the format to shoot; a film of one format needs none.
  `--as gif` or `--as webm` makes the video as a GIF or a WebM, and
  `--as mp4 --as gif` both from one take: shoot the kinds the user asked
  for once the film is checked.
- `--quality draft` shoots quicker: at the frame's own size and unblurred.
  Use it for a first look at the timing; judge the film on sheets and
  stills shot at the default, `finest`.
- After every change, read the contact sheet of every format; read every
  new shot at full size with `--at`.
- Check what the eye checks: is the caption about what is lit, is the text
  readable at this size, does any edge of the screen show where it should
  not, is anything cut off.
- Where the camera moves fast, a frame is blurred along its way, as a film
  camera blurs it: a still in the middle of a fast move shows the screen
  smeared, and that is right. Read text where the camera has settled.
  Leave the blur as livereel sets it unless the user asks for another:
  `motionBlur: { shutter, exposuresAtMost }` in `defineFilm`, either or
  both, `shutter` from just above 0 to 1 (the smear's length),
  `exposuresAtMost` 2 or more (how smooth the fastest smears are, and the
  shoot's time), or `motionBlur: { enabled: false }` for none.
- Say plainly that you saw frames, not the film: the last look at the
  moving film is the user's.

## Traps already met

- On the stage apart, an app's own requests go without its cookies, so an
  app behind a sign-in shows nobody signed in. Ask the user before writing
  the film whether the pages it shows need a sign-in; if they do, shoot it
  with `stage: 'inside'` and an account for the film. A session only the
  user can sign in to (two factors, a sign-in elsewhere) cannot be filmed
  yet: say so and stop, or film a page that needs none.
- On the stage apart, a click that moves the top page, as a link to `_top`
  does, takes the stage away, and livereel refuses the film saying so: click
  such a link on the stage inside the app, where it does nothing, or leave
  it out.
- A browser places a click wrongly on a screen the camera has scaled: an
  `act` lays the screen flat at its own size first. Do clicks in `act`.
- The page is asked for the light colour scheme: an app that follows the
  system's scheme is filmed light, unless the film writes
  `colourScheme: 'dark'` in `defineFilm`.
- A real app shows real people's addresses, keys and names: ask the user
  what must not be seen, and write `blurred: [selector, …]` in
  `defineFilm`; the page blurs those blocks wherever it shows them. Check on
  the stills that nothing private reads.
- The page is asked for reduced motion, so a page that honours it stands
  still between frames; one that ignores it animates on the wall clock, and
  two shots of it differ. Where the page's own animation must show (a
  spinner of its own), release it in an `act` and still it after: it plays
  sped up, which reads as time-lapse.
- A long scroll in one frame step shows blank space where the page renders
  lazily: scroll in a `play`, a little each frame.
- A box is read as its move's share begins: a block a scroll in the same
  step is still moving is read mid-way, so start the light after the
  scroll's share ends.
