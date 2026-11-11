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

## 0. The setup, stage by stage

Walk the user through every stage below, in order, before the film is
written. At each, ask; name livereel's default and why it is one; where the
choice is one of look, shoot a still of each way and let the user choose by
eye. Write down each answer; never settle a stage for the user, and never
start the next before they have answered. A stage the user waves through
takes the default, said aloud.

1. **The story** (section 1): who watches, the problem, the turn, the one
   sentence after.
2. **The storyboard** (section 2): a row a shot, read back to the user in
   your own words before any code, so a word that reads two ways is caught
   while it costs a line.
3. **How it is made**: livereel's steps over the live app, the default, or
   a film its own page draws ("A film its own page draws") where steps fall
   short; the page live as it is, or `page: 'dynamic'` where it changes of
   itself; `drawing: 'flat'` or `'room'`.
4. **The app: live, or a set**: the live page, the default, acted on as the
   film goes; or a `set`, the app shot once ahead by `livereel set` into a
   picture of each state the film shows, then filmed with no app served, so
   a still or a clip of any second is quick and alike every time. A set
   suits an app that is slow to answer, changes between runs, or needs a
   long way to the state a shot shows; it takes no scroll or typing in the
   film, which its scenario does instead. Ask which, and list the states
   and their names with the user before the scenario is written.
5. **The frame**: each format, its frame and screen (16:9, square, 9:16),
   and its places.
6. **The rate**: 60 frames a second, smooth on a fast move, or 30, half the
   frames to shoot; `framesPerSecond`.
7. **The lens**: the degrees the eye sees across the frame's shorter side,
   `eye: { angleOfView }`, 24 where none is named: a long lens, so a window
   leant back or a title brought near keeps its shape and only a little of
   its depth shows; a wider one, 40, makes depth loud, the near edge large.
   Where the film leans the window or moves the eye, shoot a still of the
   leant shot at 24 and at the angle the user names, and let them choose.
   Where the eye flies over the page (`eye.fly`), write each flight with
   the user in words before code: the spot it arrives over and how high,
   how it arrives, where it looks at the end of each leg; read it back, then
   shoot a still at each leg's end before the clip.
8. **The look**: the theme's ground, accent and type; the colour scheme;
   what the page blurs; motion blur as livereel sets it or none; the eye's
   focus, sharp all over or open on a shot; where the film has things of
   its own, flat light or the world's lights, soft boxes and glow, a still of
   each; on a dark ground with a glow, grain over it or none; in a room, the
   window with a body of metal or its flat edge and shadow, a still of each
   with the window leant.
9. **Sound**: livereel's clicks and keys, the keyboard, or none; music.
10. **The loop**: say how each shot will be checked, as section 4 has it, a
   still of each shot first, then a clip of its span, then the whole film,
   the user's word before each next one; a change the user asks is the one
   thing changed, by the share they name ("twice as slow").

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
| framing | `camera.onto(target, { air })` — what the frame holds, a selector's blocks or a box |
| angle | `window.lean({ tilt, turn, roll, over, about })` — the window leans back, swings, rolls or turns over like a slab in the hand, about its middle or a point of its box (`about: 'bottom'`, back on its foot), the screen in it, as it travels or holds |
| spin, flip, grow | `title.lean({ tilt, turn, roll, over, about })`, `title.to(place, { scale, depth })`, and code's, the terminal's and a piece's alike — leant, swung, rolled, spun round (`turn: 360` is a whole turn), grown about its middle, brought toward the eye |
| pop-out | `piece.show(target)`, `piece.to(place)`, `piece.back()` — a block of the page lifted onto the frame where it shows, carried and grown, and put back; `{ hole: {} }` leaves its place empty on the page, `{ lines: 'solid' }` ties it to where it came from, as an inset on a drawing |
| flies to a block | `piece.onto(target)` — a piece flies onto another block of the page, a question card into the agent's panel, a chip onto its file in the tree, and lies on the page there, landing on the block as the camera goes |
| marked area | `outline.show(target, { line: 'dashed' })` — a ring round a block, several blocks or any box of the screen |
| loupe | `lens.show(target)`, `lens.to(target)` — a round glass over the page, the page under its middle twice as large, carried from block to block |
| stack, ring, fan | `group.show({ as })`, then objects shown with `{ group }`, then `group.lean`, `group.to` — pieces turned and shrunk as one, each at its own depth: the page in layers, a ring of cards spun round, a fan |
| lift, glow, focus | `piece.effects({ shadow, glow, ring, blur, colour, melt, scale, depth })`, and every object's alike — a block lifting off the page with a shadow under it, glowing in the accent or a colour of the film's, ringed, melting toward a side, blurred, grown where it stands; `window.shade({ dim, fade, blur })` — the page dimmed, faded or out of focus behind it; eighteen ways to set a block apart are recipes, in "Recipes: setting a block apart" below |
| camera move | a `play({ seconds, moves, ease })` |
| flight, path | `camera.onto(last, { through: [first, second] })`, `title.to(place, { through })`, `group.to(place, { through })` — one curve through the blocks or places named, at an even speed along it, with no stop at any of them |
| light | `light.on`, `light.to`, `light.off` — one block lit, the rest dimmed |
| cast | what the page shows, opened and closed by `act` |
| action | what the page does for real: a click (`cursor.click`), keys typed into it (`typing(page.type(strokes))`), anything else in an `act`; at a moment of a play, the camera going on, `page.act` |
| caption | `caption.show(text)`, `caption.hide()`; at the frame's foot, or its top in a format with `captionAt: 'top'`, which leaves the foot to keys |
| title card | `title.show(text)` — words over the whole frame, on the film's ground; `title.hide()` |
| split | `window.to('right')`, `camera.onto(selector)` and `title.show(text, { at: 'left', within: { start: 0.5 } })` in one `play` — the page draws back into a window on one side, the camera keeping the block framed in it, then the words come up on the ground across from it; `window.to('whole')` brings the page back to fill the frame; a film shot in several formats names places of its own in each format, `places: { words: 'top', page: 'bottom' }` in a square and `{ words: 'left', page: 'right' }` in a wide frame, and writes `at: 'words'` and `window.to('page')` once; a format's `split` sets the words' share and the margins, `{ wordsShare: 0.28 }` for words that ask less room above a square's window |
| code beside | `code.show(lines, { at: 'left' })` with the page's window `to('right')` — the film's code on one side, the page doing it in the window across; a heading over it in a place of its own (`title.show(text, { at: { of: 'left', height: 0.2 } })`, code `at: { of: 'left', top: 0.25, height: 0.75 }`); `code.light('light.on')` as the page does what that line says; short lines, or a larger `wordsShare` |
| entrance | `cut(screen.lower())`, then `screen.rise()` in a `play`; `ending.show(card)` |
| reveal | any object shown whole in a way of livereel's, `title.show(text, { enter: 'mask' })` out of nothing from behind its foot, and gone in one, `hide({ leave: 'iris' })` |
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
  Type evenly, `keystrokes(text, { lettersPerSecond: 12 })`, only where a
  cut the film copies does.
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
took about a third as long as in software (the promo, blurred: 98 s against
289 s); on macOS and Windows it is not tried yet. Where it reaches no
graphics card, it draws the frames in software all the same and warns
"--renderer gpu reached no graphics card"; a page that draws with WebGL may
then draw nothing. Where it warns and a canvas on the contact sheet is
empty, shoot the film again without the flag.

A film is a TypeScript file whose default export is `defineFilm({ formats,
address, serve, ready, steps })` from `livereel`: its formats by name, each a
frame and the screen its page is laid out on (`{ square: { frame, screen } }`),
the page's `address`, the command that serves it there where the film starts
the app (`serve: 'npm run dev'`, run in the film's folder until the address
answers, stopped after the take), when the page is ready, and its steps.
Leave `serve` out for a page someone else serves or that already runs. The
port is the film's: name one the command serves on, and one nothing else
holds. `steps(whole, formatName)` is handed the whole screen's pose and the
name of the format it is shot in. Read
`node_modules/livereel/examples/example-com.ts` first: it is a whole film.
`node_modules/livereel/examples/livereel-promo.ts` serves an app of its own
by its own command and clicks it for real; its server is
`node_modules/livereel/examples/livereel-promo/server.ts`, and what a click
brings, data the server and the film both read, `acme.ts` beside it.
`node_modules/livereel/examples/livereel-recipes.ts` plays the recipes
below on that app, an act each.

A film shot on its set (stage 4 of the setup) names `set: { scenario,
targets, sharpness }`. The scenario is Playwright code run once on the app
by `livereel set film.ts --format NAME`, after `ready`: it acts on the app
as a person would, and marks each state the film shows with
`await context.state('refreshed')`, a name of letters, digits, dashes and
underscores, from a letter or digit. `targets` are the film's selectors
whose blocks the film reads: each is measured in every state, and a move on
a target left out is refused. The film opens on the first state and shows
another by an act, `...cursor.click(({ set }) => set.show('refreshed'))`,
or `act` and `page.act` as for the live page; it scrolls, types and acts on
no page, as the scenario does that and marks the state it leaves. Shoot the
set again after the app, a format, the targets or the sharpness change: the
film is refused on a set shot otherwise. A still of the film then needs no
app.

- Split the steps into acts, a function each; name every selector at the
  top, by test id or role where the page has them.
- Write a step's timing, framing and rhythm as numbers in place, each the
  value of its keyword (`seconds`, `start`, `end`, `air`, `zoomAtMost`,
  `every`, `tilt`, `turn`, `roll`, `scale`, `depth`, `dim`, `fade`, `ring`,
  `glow`, `shadow`, `blur`, `thinkingShare`, `seed`, `slipAt`, `pace`,
  `pixels`, `top`); any other number is a constant at the top.
- Two moves of one part — a prop, or the page — share a step only one after
  the other: `play` and `cut` refuse them at once.
- Frame by selector, so one script fits every format. A pose given in
  numbers, or a box of the screen for a page with nothing to select, is
  given once per format, in a record of the film's format names
  (`Record<keyof typeof FORMATS, Pose>`, or `Box`), picked by the `formatName` that
  `steps` is handed: the type checker refuses a format left out. livereel
  runs a film with its types stripped, and refuses a value of the wrong
  kind where it stands, as the film is defined and its steps before its
  page is served; the type checker finds more,
  so check the types in the editor or with the project's type checker
  before shooting.
- Prefer the page's own states to anything drawn over it: open a panel with
  its own button, not by hiding parts of the page.
- A static page, the default, stands in a tab of its own, as a person opens
  it: one that refuses frames is shown, and one that signs in is signed in
  in `ready` or in an act, as a person does, with an account the user gives
  for the film.
- A dynamic page (`page: 'dynamic'`) stands live in the stage's frame. One
  that refuses frames, which livereel refuses naming the refusal ("refuses
  to be framed (X-Frame-Options: DENY)"), or signs in: write
  `stage: 'inside'` in `defineFilm`, and the stage stands on the app's own
  address. Read what each stage costs in `node_modules/livereel/README.md`,
  "Where the stage stands", and tell the user before shooting.
- A shot whose window leans far, or that the eye flies low over, is drawn
  sharper as a room: write `drawing: 'room'` in `defineFilm`, for a static
  page, and shoot it with `--renderer gpu`. Flat, the default, draws a leant
  window as soft as the browser draws a layer in 3D, and blurs it by the
  eye's focus as one; the room blurs each point of it by its own distance.

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
- `sounds: { enabled: false }` for none of livereel's but a keyboard a
  typing names;
- `music: { file, volume }`, a track under the whole film, `volume` 1 as
  loud as the file, cut to the film's length and faded out at its end.

How to use them:

- Sounds are few and quiet: a click, the keys, the ending.
- Leave the keyboard as livereel sets it unless the user asks for another,
  and pick it by what the user says: `membrane` is an office keyboard
  (Cherry KC 1000), `mechanical` a mechanical one (WhiteFox), and
  `mechanical-bright` a brighter, sharper one; `butterfly` is a MacBook
  Pro's of 2018, `laptop` another laptop's, `clicky` a loud click with its
  release. One typing heard on another keyboard names it,
  `page.type(strokes, { keyboard: 'butterfly' })`: two people typing, or a
  film that shows the keyboards off.
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
| `act(action)` | `action(context)` acts on the page for real, between two frames, a cut of `page.act`: `context.page` is Playwright's `Frame`, `context.motion.release()` and `.still()` let the page's own animations run and still them again, `context.set.show(name)` shows a state of the film's set |
| `typing(move)` | as long as the keys of `terminal.type` or `page.type` take, and a beat after |

| Moves | |
|---|---|
| `camera.to(pose, { through })` | to a pose: `whole` from `steps`, or one written out, `{ focusX, focusY, zoom }`; through the poses `through` names on its way |
| `eye.to({ at, aim, up }, { through, shape, pace })` | the eye the film is seen from: standing `at` a spot, looking at `aim`, each `{ across, down, out }` in pixels of a frame 1080 high from its middle, `out` toward the watcher, its top pointing `up`, up the frame `{ across: 0, down: -1, out: 0 }` until a film turns it; at rest straight out from the middle as far as its focal length (2540.5 at the film's 24°, stage 7) looking at the middle, and back there exactly by `eye.to('rest')`; the page's window and what is shown `inside: 'world'` are seen from where it stands, while what stands on the frame rides with it; what a move leaves out stays, and through the places `through` names on one curve. To look straight down at the frame, point `up` into it, `{ across: 0, down: 0, out: -1 }`; to roll the picture, turn `up`. A way that looks at where it stands, or within 5° of along its up, as one passing over the top of its aim with its up kept would, where the picture spins round, is refused, and so is an up turned half round from one place to the next: turn it through a place between. A piece on the frame, an outline or a lens is lifted only while the eye looks straight ahead at the window from before it, its top up the frame; a piece lifted `inside: 'world'` stands over its source wherever the eye stands. Flat CSS draws a plane the eye comes close to softly; a lens's magnification, a world object's place and, flat, its order under the window (a room stands it before or behind the window where it stands), a note's words and pins' labels do not yet follow a moved eye (TODO.md) |
| `eye.fly(legs, { shape, heading, tip })` | the eye flown low over the page, as a camera over a desk: legs from where it stands, `{ to: { over: '#gap', height: 160 } }` to a spot `height` pixels of a 1080 frame over a block's middle, `{ to, arriving: 90, bend: 0.5 }` on a parabola arriving heading right along the page (a dive), `{ ahead: 2 }` straight on twice as long as the leg before, `{ along: figure }` along a shape no leg draws, a three.js `Curve` of the film's own in three dimensions, closed or open (`new CatmullRomCurve3([...], true)` round a block, x across, y down, z out, in pixels of a 1080 frame), set off from where the leg starts, leaving as the film drew it, built once and never changed after; legs to spots join smoothly, a leg to a spot before a figure arriving the way the figure leaves, never dipping below the spots either side (`shape: 'straight'` for corners); a way that reaches the page is refused. Write the gaze apart from the way, as rules reached by the end of leg `by`: `heading`, degrees from up the page clockwise, `{ by: 2, degrees: 0 }`, toward a block, `{ by: 0, toward: '#story' }`, or `{ by: 0, along: 'way' }`; `tip`, how far the sight lifts off the page, -90 straight down onto it, 0 level, 60 looking up and away, or `{ by: 0, holding: '#story', at: 0.58 }` so the block stands that share down the frame. A rule is read where the eye stands as it flies, so to hold a block through a leg, name the hold at both its ends; the gaze eases from one rule to the next over the leg between, follows the last past it, and keeps how it set off where none is named. The eye never rolls; a roll it set off with eases away over the first leg. It rides the window after: a lean or a travel of the window carries it; `eye.to` sends it back into the room. Pace it by the move's curve: the eye goes as far in each equal share of it. The dive: `[{ to: { over: '#gap-start', height: 120 }, arriving: 90, bend: 0.5 }, { to: { over: '#gap-end', height: 120 } }, { ahead: 2 }]`, heading `[{ by: 0, degrees: 90 }]`, tip `[{ by: 0, degrees: 0 }, { by: 1, degrees: 0 }, { by: 2, degrees: 60 }]`, so it levels by the gap, runs along it level, and lifts only once past it. Flat draws the page from a picture no closer than livereel's bound, so a flight low over it shows it soft |
| `eye.focus(on, { aperture })` | the eye focused `on` so far before it, in pixels of a frame 1080 high (`1800`), a spot of the world `{ across, down, out }`, a block of the page (a selector, or a box of the screen) at its middle, an object at its middle, `{ object: 'why' }`, or under a point of the frame in shares of it, `{ under: { left: 0.25, top: 0.26 } }`, where the eye sees the window's plane there as each frame is drawn, so a window leaning and turning under the point stays sharp under it (the promo's crawl: the code sharp beside the owner's line as it lies back); and open `aperture` pixels wide, where named, else as wide as it stands; at rest it is open none, all sharp. What stands in the world off the focus is drawn as a disc `aperture × focal length × \|1/focus − 1/distance\|` across: with the eye at rest at 24°, a piece at depth 200 focused on and `aperture: 120` leave the page behind it a disc of 10, a soft blur; a longer lens, a narrower angle, blurs more. The window and all in it, and each object shown `inside: 'world'`, blur as soft as their point nearest the focus, so what the eye focuses on is drawn sharp; what stands on the frame or in a group stays sharp, so captions and titles over the film read. A window on the ground out of focus spreads past its edge, its shadow with it; a page filling the frame edge to edge blurs into the ground at the frame's edges, as a lens draws it, so frame it a little closer to keep them full. Shares a step with `eye.to`; the focus holds on what it was put on as the eye, the window and the camera move, and stays there as an object moves on; a pull from one to another goes evenly in how sharp it leaves things. Flat, a leant plane is blurred as one, as soft as its point nearest the focus, never sharp at one edge and soft at the other; drawn as a room, each point of the window and of an object shown `inside: 'world'` is blurred by its own distance, so a window leant back, or flown over low, is sharp where the focus is and melts nearer and farther. A focus on what stands behind the eye, on an object that does not stand, under a point off the frame, or under one where the eye sees past the window's plane as the move begins, is refused |
| `camera.onto(target, { every, air, zoomAtMost, through, shape, pace })` | frames the first `every` blocks a selector matches, or a box of the screen, `{ left, top, width, height }` in its pixels, for a canvas or a design's frame with nothing to select, `air` pixels round them, in whatever window stands, and keeps them framed as the window moves or leans, the screen filling a window; on its way it passes the blocks `through` names, the first a selector matches or a box, each framed with the same air, on one curve: `shape: 'smooth'` (where none is named) or `'straight'`, `pace: 'even'` (where none is named), as far in each equal share of the move, or `'keys'`, an equal share from block to block. Every object's `to` and `group.to` take `through`, `shape` and `pace` alike, the places they pass on the way |
| `window.lean({ tilt, turn, roll, over, about })` | the window leant back from its top edge by `tilt`, swung by `turn`, rolled clockwise in its plane by `roll` and turned over round its own width as it then stands by `over`, top away from the eye, in degrees, the screen in it with it, one left out as it stands; about its middle, or a point of its box `about` names, which stays where it stood: `'top'`, `'bottom'`, `'left'`, `'right'`, `'middle'` or `{ left, top }` in shares of the box, past it too (`about: 'bottom'` lies it back on its foot), kept until a lean names another, refused while it is turned from face-on, where it would jump; a move of its own, so a `window.to` and a `window.lean` share a `play`. A piece, an outline or a lens over the page is refused while the window is not front on and upright |
| `window.to(place, { depth })` | the page's window to a place, the frame itself at `whole`, a window on the ground anywhere else: a side's room across from the words' share, or a box in shares; travels apart from the camera, in the same `play` or not; brought `depth` pixels of a 1080 frame toward the eye on the way where named (less than the eye's focal length, refused before anything is shot), drawn larger and farther from the frame's middle with its body, as a slab coming at the eye (in a room a static page as sharp as its picture, taken 2.2 times close, holds it, what lies over it in the window as the frame's own pixels), kept where a move names none, and sharing a `play` with `window.lean`; over the whole frame it stays the frame itself at any depth |
| `window.shade({ dim, fade, blur })` | the page dimmed by `dim`, the light and the cursor on it too, and faded into the film's ground by `fade`, each from 0 to 1, and its page and holes blurred by `blur` pixels of a 1080 frame, while a piece, a title or code stands clear of it, the window's edge and shadow kept; it sets only what it names, so it shares a `play` with `window.to`, `window.lean` and another shade naming others; `window.shade({ dim: 0 })` takes the dark away. One block lit and the rest dimmed is `light.on` |
| `window.body({ thickness, rim, metal, roughness, glass }, { within })` | in a room, the window's body, a slab of metal round the page as a tablet has, in place of its edge and shadow: `thickness` (0, none, livereel's) and `rim` in pixels of a 1080 frame, `metal` in hex with no alpha, `roughness` from 0 to 1, and `glass` from 0 to 1, how strong the clear coat over its page is; its metal and glass show the world's light alone, so give the world soft boxes, and the glass's glint shows on a dark page. A window with a body from the start sets it by a `cut` as the film's first step; in a `play` its lengths, shares and metal go through the values between. It sets only what it names, so it shares a `play` with `window.to`, `window.lean`, `window.shade` and another body naming others |
| `window.show({ at, from })`, `window.hide({ toward })` | the window sliding in whole from past a side of the frame to its place, or out past one, where it stays; with words sliding the other way in one `play`, a push |
| `screen.rise()`, `screen.lower()` | the screen up out of the ground from where it stands, or down into it, the window's shadow and edge with it: over a share of a `play`, or at once in a `cut` |
| `screen.shows({ html })`, `screen.shows('filmed', { within })` | a page of the film's own in the filmed page's place, a whole HTML document it writes — a slide, the end card in the app's own colours, a terminal with a coloured diff — laid out at the screen's size, framed, leant and blurred as the filmed page is and sharp however close; `'filmed'` brings the filmed page back. At once in a `cut`, or at the moment `within: { start }` of a `play`, so a fast camera smears the one into the other (a terminal that becomes the app mid-dive). While it shows, selectors name its blocks, acts, scrolls and keys still go to the filmed page behind it, and a piece or a lens is refused, as is the swap while a lens stands. It stands as written: no script of it runs, an animation or transition of its own is refused before the shoot (move it with the film's moves), and an image or a font in it takes a whole address or a `data:` URL |
| `screen.behind({ html }, { upright, within })`, `screen.behind('none')` | a page of the film's own on the window's back, as a slab wears one on its back: where the eye sees the window's back, the screen shows it in place of its front, framed by the camera as the front is (bring the camera to the whole screen before the window turns, or the back shows the part the front's framing shows), mounted so it stands upright once the window is turned over round its width, `upright: 'over'`, or round its upright, `'round'`; the light, the cursor, a callout, the pins and the objects in the window, which lie on the front, stand unseen meanwhile. `'none'` takes it off, the screen seen through the window's back, mirrored, as with none. In a room it lies on the body's back, its `thickness` behind the page |
| `screen.scrolls({ html }, { pace, ease, within })` | a page of the film's own run down its scroll at `pace` of its pixels a second (480 runs a terminal's lines by at about 20 a second) until another move of its run: in a `play` its pace changes from what it was to the new one over the move's share on its curve (`within: { start: 0, end: 0.2 }, ease: linear` gathers it), in a `cut` at once; `0` stops it, below `0` runs it back up, and it holds at its top and its end. The run is the page's, kept on either face (a back that runs from the first frame: `screen.behind(page, …)` and `screen.scrolls(page, …)` in the opening `cut`). It is the only way such a page moves; the filmed page scrolls by `page.scrollBy`. A page that scrolls nowhere is refused: give it more than the screen holds, and no `overflow: hidden` on its body. A window that comes from far to cover the frame with such a page on it is laid where it ends and started far, `window.to(COVERING, { depth: -3000 })` then `{ depth: 0 }`, never laid small and brought near: the room draws the window's surface as dense as its laid box, so a window brought nearer than it is laid shows its text magnified and soft |
| `screen.scrollTo({ html }, selector, { top, within })` | a page of the film's own brought to rest with a block of it `top` of its pixels below the screen's top as the move's share of a `play` ends (a terminal's session run on to its input: `screen.scrollTo(TERMINAL, '#input', { top: 600 })`): it goes on at the pace the page runs and comes smoothly to stand there on a curve of its own, so it takes no `ease`; at once in a `cut`. The block is measured where it stands in the page's document, however far it has run. Refused where the page cannot scroll so far, and where it would turn back: running away from its rest (stop it first, `screen.scrolls(page, { pace: 0 })`), or running more than three times as fast as its way to rest goes on average (a longer share, or slow it first) |
| `...typing(screen.type({ html }, strokes, { into, keyboard }))` | a command typed into a page of the film's own (a terminal's input: `screen.type(TERMINAL, keystrokes('/review-ui', { lettersPerSecond: 12 }), { into: '#typed' })`): from the move's start the block the CSS selector `into` names shows what stands typed as its text, each key heard. Kept on either face, until the film types into that block again, anew from nothing. Write the block as a span of text alone with the caret an element beside it, `<span id="typed"></span><span class="caret"></span>`: a block holding elements is refused, and so is an `<input>` or a `<textarea>`, which shows a value, not its text. The filmed page is typed into by `page.type` |
| `screen.sweep({ from, slant, round, width, crest })` | the picture the screen shows swept away by a band of light, or by a disc opening `round` a block (`round: '#answer'`, its middle, riding with the page; its ring growing from there, or from the nearest point the window shows, to past the farthest corner it shows; its crest from `crest.start` at the top round to `crest.end` at the bottom; never with `from` or `slant`), over a share of a `play`, the page as it stands showing behind it: a theme turned dark by `page.act(action, { within: { start: 0.02 } })` in the same `play` comes in behind the band. The band crosses what the window shows of the screen from its `left`, or the side `from` names, slanted `30`° clockwise or as `slant` names (−28 from the `right` sets off at the top right corner, where settings stand), `160` pixels of a 1080 frame wide or `width`, its crest in the accent as it stands or from `crest.start`, at its end nearer the top, to `crest.end`. The picture is held as the sweep begins: an act at the same moment would be done first and lie under it, and the play refuses it, so put the act a moment after; one in a step before (`...cursor.click(action)`) lies under it with no word, so press, act and release inside the sweep's play. The band crosses the window, not the page: a camera panning against it brings the picture back. A piece drawn from the page and a lens show the new page at once. Refused on a page framed live and while the screen shows a page of the film's own |
| `light.on(target, { dim })`, `light.to(target)`, `light.off()` | one block lit, the rest dimmed by `dim`; carried; put out |
| `cursor.to(target, { entering, bow })` | along an arc to a block, from `entering` if not yet on the screen |
| `cursor.press({ sound })`, `cursor.release()`, `cursor.hide()` | pressed in with a click (`sound`, a file of the film's in its place), let go, taken off the screen; a press and a let-go go on while `cursor.to` takes it its way |
| `cursor.click(action, { sound })` | pressed with its click, `act(action)`, let go: the steps of a click, at which the camera stops |
| `callout.show(target, text, { side })`, `callout.hide()` | words on a card beside a block, pointing at it, `side` `above` (where none is named), `below`, `left` or `right`; carried with the page |
| `note.show(target, text, { at })`, `note.hide()` | words on the ground beside the page's window, on the side clearest of it or `at` a place beyond it, a line drawn from them to a block in it; only with a window, and its words keep beside the window as it moves |
| `pin.show(target, label)`, `pin.clear()` | a numbered mark on a block, after those laid before, the earlier labels quietened; all taken away |
| `keys.show(caps)`, `keys.hide()` | the caps of a shortcut at the frame's foot, as `['⌘', 'Enter']`, over every object and a caption |
| `title.show(text, { at, align, size, letterSpacing, lineHeight, from, words, as, inside })`, `title.to(place, { scale, depth })`, `title.lean({ tilt, turn, roll, over, about })`, `title.hide({ toward, words })` | words coming up one after another on the film's ground over the whole frame, or `at` a place, in place of the title of its name shown; going, the ground with them. `words` names how they come up, the theme's way where it names none: `'rise'`, `'sharp'`, `'fade'`, `'blur'`, `'mask'` (each word from under its own line, on any number of lines), three words on their way at once, or `{ way: 'mask', atOnce: 6.25 }` naming how many, more than 0, `'letters'`, `'scramble'` (signs settling into the letters), or `{ typed: { seed, keyboard } }`, letter by letter as a person would, as fast as the move's share lets, each key heard, a caret after the last letter until all are; never with `from` or `enter`. Words that came word by word go one after another, the first first, at an even pace unless the hide names a curve, at the pace they came or as many at once as `title.hide({ words: { atOnce } })` names (never with `toward` or `leave`); by letters, all together. `size` is this title's letters' own, in pixels of a 1080 frame, in place of the look's `titleSize`, over the whole frame or in a place alike: one word set large; a word is never broken, one larger than its place runs past it, so look at it on a still (in a room, a title in the world is cut where it runs past its box farther than a pane's shadow reaches). `letterSpacing` and `lineHeight` are its own, in place of the look's `titleLetterSpacing` and `titleLineHeight`, in times its letters' size: a name set tight, `{ size: 185, letterSpacing: -0.03, lineHeight: 0.967 }`. It slides in whole `from` a side, travels `to` another place, growing to `scale` about its middle and coming `depth` pixels of a 1080 frame toward the eye where named (less than the eye's focal length, 2540.5 at 24°, refused before anything is shot), leans as the window does and rolls in its own plane by `roll`, each value a move leaves out kept, slides out `toward` a side; turned away from the eye it shows its back, its ground blank, words on no ground nothing: a title shown `from: 'right'` while one of its name stands pushes it off to the left as one sheet, and the window, code or the card slide with it in the same `play`. Several stand at once by name: `as: 'heading'` on `show` and on every move of that one; a move with no `as` takes the one called `title`. A place: `whole`, `left`, `right`, `top`, `bottom`, a name the format gives in its `places`, or `{ of, left, top, width, height }` in shares of the frame or of the place `of`, past the frame's edge if it must |
| `code.show(text, { at, from, longLines, as, inside })`, `code.to(place, { scale, depth })`, `code.lean({ tilt, turn, roll, over, about })`, `code.light(line, { through })`, `code.scrollTo(line)`, `code.hide({ toward })` | a dark pane of code `at` a place, beside the page's window or alone, or `inside: 'window'`, a small window of code over the site's that travels and leans with it, grows and rolls flat on it and never leans or nears the eye alone, its `at` a box in the window's shares (a title and the terminal take `inside` too); sliding in `from` past a side of the frame, pushing the code of its name shown off past the side across, or out `toward` one, carried to another place by `to`, grown and brought near as a title is, leant and rolled by `lean` while it travels or lights, its back a blank pane; several panes by name, `as`, as titles; its lines coming up one after another, coloured as TypeScript; a line lit by words only it says (`code.light('light.on')`), or by its number from 1, or lines `line` through `through`, the line from it on that says the other, the rest dimmed; going. `longLines: 'cut'` keeps the letters at `codeSize` and cuts a long line at the pane's edge, where `'shrink'`, the default, makes them smaller until the widest fits. The pane is no taller than its place, and `scrollTo` scrolls longer code, by `as` too, until the line named stands at its top, a line each `codeLineHeight` of the letters' size, blurred as it goes quickly through many |
| `caption.show(text, { words })`, `caption.hide({ words })` | words coming up one after another, in the way `words` names as a title's do, at the frame's foot, or its top in a format with `captionAt: 'top'`, in place of any shown, over every object, under keys; going as a title's do |
| `look.to(theme, { within })` | the film's look moving to any of a theme's values: through the values between in a `play`, at once in a `cut`; two at once in a step where they name no value alike |
| `world.to(world, { within })` | the world's look moving to any of its values, its lights, soft boxes, glow and grain, as `look.to` moves the look |
| `terminal.open(title, { at, from, inside })`, `terminal.to(place, { scale, depth })`, `terminal.lean({ tilt, turn, roll, over, about })` | an agent's terminal coming up `at` a place, read as the window reads one, across most of the frame in its middle where none is named (`{ left: 0.07, top: 0.22, width: 0.86, height: 0.56 }` for a few lines), or sliding in whole `from` a side; in a `cut`, there at once; carried, grown, brought near, leant and rolled as code is; every terminal move takes `as` for a second terminal |
| `terminal.type(strokes, { keyboard })`, `terminal.submit()` | keys typed into it, heard on the film's keyboard or the one named; Enter |
| `piece.show(target, { every, air, corner, hole, lines, picture, as, inside })`, `piece.to(place, { scale, depth })`, `piece.onto(target)`, `piece.lean({ tilt, turn, roll, over, about })`, `piece.back()`, `piece.hide({ toward })` | a piece of the page lifted onto the frame over where the camera shows its target, a selector's first `every` blocks together or a box of the screen, with `air` pixels of the page round them where named, cut to the part it shows, its corners square, or as round as `corner` names, in the page's pixels: a card's own `border-radius` from the page's stylesheet, where the piece lifts the card alone and whole, so a rounded card lifts with its round corners, its shadow, glow, ring and hole following them (with `air`, or cut by the camera, the corners round what is lifted, not the card); a corner standing on a corner of what the window shows is as round as the window there by itself, so a piece of the whole screen, or a header along its top, keeps the window's round corners; drawn from the page's picture, so it shows what the page shows there, a scroll under it too, refused on a `'dynamic'` page and while the window leans, rolls or shows its back; drawn past 2.2 times, flat, it is drawn from a picture of its source alone that close, so it stays sharp grown to the whole frame; lifted `picture: 'held'`, it is drawn from a picture of its source alone taken as it is lifted, as sharp as the page's where the page stands still, so it shows what the page showed there then as the page changes under it, holes other pieces leave over its source still drawn as they stand; it stays where it was lifted as the camera moves; carried `to` a place it stands as large as the place holds it, grown, brought near, leant, rolled and spun as a title is, a blank card when it turns away; carried `onto` a block of the page, the first a selector matches or a box of the screen, it lies on the page there as large as the block holds it, landing on the block however the camera moves on the way and keeping that place on the screen after, so a scroll moves the block from under it; it lies in the window as the page does from the moment it sets off, flat on it and leant as it leans, under what stands on the frame and cut at the window's edge, so a piece setting off from beside a window on the ground is cut at once; a later `to` measures its place on the screen as the move begins; a piece on the frame goes onto the page lying flat, face-on and at no depth, while the window faces the frame front on; one in the world goes where it stands, while it lies on the window's plane; from there it rolls and grows but never tilts, turns, turns over, comes near or slides out; `back` puts it over its source as the camera shows it then, face-on and as large as it was; every piece move takes `as` for a second piece. Lifted `inside: 'world'`, it stands over its source on the window's plane wherever the eye stands, aslant too, the eye moving past it as past the window and its focus blurring it as it stands off it; carried `onto` the page from there, it sets off from where it stands, wherever the eye stands, while it lies on the window's plane, face-on to the window and at its depth. `hole: {}` leaves where it was lifted filled with the ground the page draws behind the block, `hole: { ground: '#rrggbb', line: 'dashed' }` with a colour of the film's, ringed; a box of the screen needs the colour named. `lines: 'solid'` or `'dashed'` draws two lines from its source to it, which stretch as it travels and vanish as it goes back |
| `outline.show(target, { every, line, as })`, `outline.to(place, { scale, depth })`, `outline.lean({ tilt, turn, roll, over, about })`, `outline.back()`, `outline.hide({ toward })` | a ring in the look's accent round a block, whatever colour its `effects` take, a selector's first `every` blocks together, or a box of the screen, a little clear of it, `line` `'solid'` (where none is named) or `'dashed'`; born where the camera shows its target, as a piece is, and moved as a piece is, but drawn from no picture, so a `'dynamic'` page takes one too |
| `lens.show(target, { magnification, size, enter, as })`, `lens.to(target)`, `lens.hide({ toward, leave })` | a round glass round the middle of a block or a box of the screen, `size` pixels of a 1080 frame across (320), showing the page under its own middle `magnification` times as large as the camera does (2); `lens.to` carries it round another block's middle, what it shows moving under it; refused where a piece is. It stands round its block's middle: aim it at a block whose middle is what it should show, as a number's own element, never one as wide as its card, whose middle stands beside the number. A piece or a lens shows the holes other pieces leave in its part of the screen, so a piece of the whole screen under the pieces lifted off it shows where they were |
| `picture.show(file, { at, from, enter, as, inside, group })`, `picture.to(place, { scale, depth })`, `picture.lean({ tilt, turn, roll, over, about })`, `picture.hide({ toward, leave })` | a picture of the film's own, a mark or a logo, from an image file by its path from the film's file (PNG, JPEG, WebP, AVIF, GIF, or an SVG that names its width and height), over the whole frame or `at` a place, read as the window reads one, as large as the place holds all of it, in its middle, as wide against as tall as its file; a file not there, or one that decodes to no picture, is refused before the first frame. Carried, grown, brought near, leant, set apart and put away as any object; on the frame, `inside` the window or the world, or in a group. Drawn at the frame's density wherever it stands, as all markup is, so one brought near the eye in the world is magnified and soft, as a title is: give it a file at least as large as the frame shows it. The promo's name with its mark: `picture.show(mark, { at: aboveTheName, inside: 'world' })` beside `title.show(name, { at, inside: 'world' })` |
| `thing.show(made, { at, reach, values, inside: 'world', from, as })`, `thing.to(place, { depth, scale, through })`, `thing.lean({ tilt, turn, roll, over, about })`, `thing.set(values)`, `thing.hide({ toward })` | a thing of the film's own three.js, for what no prop draws and three draws in a few tens of lines (an end card standing in the world, a sheet leant over the page): the film names `drawing: 'room'` and `things: './things.js'`, a module whose default export builds each thing by name from the stage's own three, `{ card: { build: (three) => mesh, set: (built, values, shown, three) => {...} } }`, and sets it whole every exposure from its numbers and `shown`, keeping no state and reading no clock — a still at one moment drawn twice is its check. Flat: `MeshBasicMaterial` or a `ShaderMaterial` of its own, `transparent` where it fades by `shown`; lit: one of three's lit materials (`MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshLambertMaterial`, `MeshPhongMaterial`; `MeshToonMaterial` takes the lights alone), by the theme's `lights` and `softBoxes`, a thing in the world as the eye sees the room, one on the frame as the eye at rest does; a see-through `ShaderMaterial` in the world, or one that writes no depth, sets `clipping: true` with three's clipping chunks. It stands as an object at a place, on the frame or `inside: 'world'`, its box `reach` (`{ width, height }` in pixels of a 1080 frame) about the place's middle, its origin that middle, a unit a pixel of a 1080 frame, three's own axes (y up); carried, grown, brought near and leant as any object; `thing.set` moves its numbers, each from where it stood, only those it was shown with — a move by numbers is not motion-blurred. In the world it stands in one scene with the window and its body, hidden by depth and blurred by its own depth point by point; a material that writes no depth (glass: `depthWrite: false`, as `transparent: true` alone still writes depth and hides what stands behind it) is seen through, drawn apart and blurred by its own depth, its part behind a fading page laid under the page and its part before over it; give glass one material drawn on both sides, as three lays a mesh's faces in the order of its materials. No ways or effects: it comes and goes as its module draws `shown`. Never wrap what three does: build it here instead |
| `title.effects({ ring, glow, shadow, blur, colour, melt, scale, depth, as })`, `code.effects`, `terminal.effects`, `piece.effects`, `outline.effects`, `lens.effects`, `picture.effects` | the object standing out: a `shadow` it casts as though lifted off the frame, a `glow` round it and a `ring` along its edge, each from 0 to 1, in the look's accent as it stands until the film names a `colour` of their own in hex (`colour: '#5b8def'`), which they go to from the colour they were seen in, or in it all the way where they rise from none (an outline's own line, a piece's lines and its hole's line stay in the accent), a `blur` in pixels of a 1080 frame, a `melt` into nothing toward a side of what it shows, from a share of it in (`melt: { toward: 'right', share: 0.6 }`: two halves of a page melting toward the middle as they part; its shadow and glow follow what is left; a melt turned to another side while it melts is refused), how large it stands about its middle, `scale`, and how near the eye, `depth`, where it stands, so a piece grows in place though the film knows no place of it; the shadow and the glow follow what it shows, a title's letters, a pane's rounded corners, a lens's round glass, and the ring runs round a title's words, or its card, and along the edge of anything else; the shadow falls toward the object's foot, so it turns as the object rolls. It sets only what it names, so it shares a `play` with the object's `to` and `lean` and with another `effects` naming others; a `to` sets a scale or a depth only where it names one. An object comes up standing out in no way; inside the window it never nears the eye alone. A block lifted: `piece.effects({ shadow: 1, depth: 160 })` with `window.shade({ dim: 0.6 })`; a far card of a fan: `blur: 3` |
| `group.show({ at, order, as })`, `group.to(place, { scale, depth })`, `group.lean({ tilt, turn, roll, over, about })`, `group.hide()`; `{ group, zIndex }` on the show of a title, code, the terminal, a piece, an outline or a lens | a group placed `at` a place, the whole frame where none is named, before anything stands in it; an object shown with `group: 'stack'` stands in it where it would stand on the frame, however the group stands, leant, grown or near, and moves with the group after; a group grown and leant at once refuses it, as it would stand stretched there. Its objects are drawn by their `zIndex`, the higher over the lower, and as they came where it is alike, however the group leans: a stack's page `zIndex: 0`, its header `1`, its content `2`; `order: 'depth'` draws them the farther behind the nearer instead, for a ring whose near side changes as it spins, and takes no `zIndex`. The group's `to` and `lean` carry, grow, bring near and turn everything in it about its middle, or the point of its box its lean names `about`, each object still as its own moves set it, so a piece's own `depth` lifts it off the next layer of a stack, and cards set round the middle at depths and turns make a ring `group.lean({ turn: 360 })` spins, the far ones drawn behind the near in a group with `order: 'depth'`. `group.hide()` fades all of it and puts it away, a move of one of its objects still running then setting nothing more. `group.to` carries the group's middle to a place's, as large as it was placed. An object in a group never slides in or out: it comes up and goes in its place. A place or a block a move of it reads is read on the frame, where it stands once the group is back as placed. A ring set round the frame's plane puts its far cards behind the page yet draws them over it: bring the group toward the eye by the ring's reach, `group.to('whole', { depth })`, so all of it stands before the page |
| `terminal.works(lines, thinking, { thinkingShare })` | the agent thinking, its spinner beside the words `thinking`, then its lines written one after another; a line is `{ kind, text }`, its kind `work` (a tool and what it is used on), `said` or `done` |
| `terminal.leave({ toward })` | the terminal giving way where it stands, or sliding out whole `toward` a side, so what comes in from the side across in the same `play` pushes it off |
| `ending.show(card, { from })`, `ending.hide({ toward })` | the card: `{ name, line, command }`, last, or first and taken away as the page comes; with its ground it slides in whole `from` a side or out `toward` one, so a push carries it off or brings it on |
| `{ enter, edge }` on the show of any object, a caption or keys, `{ leave, edge }` on its hide: `title`, `code`, `terminal.open` and `terminal.leave`, `ending`, `caption`, `keys`, `piece`, `outline`, `lens` | its figure — words, pane, the card's lines, caps — coming up whole in a way of livereel's in place of its own, on its step's curve, while a card's or caption's ground comes up under it, whole half-way: `'fade'`; `'mask'`, out from behind an edge of its own, out of nothing, words rising from under a line just below them, its foot unless `edge` names another; `'wipe'`, uncovered from an edge, its left unless `edge` names another; `'iris'`, opened from its middle; `'grow'`, grown from its middle. A pane's shadow comes with it; going, the way runs back. Words on more than one line stand as wide as their box, so a way from a side crosses it: keep words in a way to one line. Never with `from`, `toward` or `typed` |
| `page.scrollBy(selector, { pixels })` | a block's own scroll moved so many pixels |
| `page.scrollTo(selector, { top })` | the page scrolled until a block stands `top` pixels below the top of what scrolls it |
| `page.type(strokes, { keyboard })` | real keys typed into whatever holds the page's keyboard, heard on the film's keyboard or the one named |
| `page.act(action, { within: { start } })` | the page acted on for real at a moment of a play, as `act` acts on it, while the play's other moves go on; it takes no time, so it is refused only where a scroll or a typing of the page runs across its moment; a move that begins at its moment reads the page it left |
| `page.speed(speed)` | how many of the page's seconds a second of the film runs: 4 shows a minute of the site's timers and script animations in 15 s, 0.5 slows them, 0 stands them still; at once in a `cut`, through the speeds between in a `play`; an `act` still waits on the page at the wall's time |
| `sound.play(file)` | a file of the film's heard as its share begins; it moves nothing, so it shares a step with anything |

`cursor.click` and `typing` give several steps: spread them among the
others, `...cursor.click(action)`, `...typing(page.type(strokes))`.

A click while the camera goes on is written into a play: `cursor.press`
over a share, `page.act(action)` from its end, `cursor.release` over the
share after, beside `cursor.to` and the camera's move. Give the press and
the release shares as long as a click's, about 0.09 s and 0.12 s of the
play's seconds; they go on a finger's curve, as a click's do, whatever the
play's. A press begins once the cursor is on the screen: not on the frame
`cursor.to` brings it in on.

A title's, a caption's or a callout's `text` is a string, or a list of
strings and runs read one after another: a run is `{ text }` with any of
`italic`, `underline`, `strike` (each `true`), `ink` (its letters' colour) and
`marker` (a marker behind it), colours in hex, each a constant at the top:
`['Your agent ', { text: 'films', italic: true, ink: ACCENT }, ' your app']`.
Put the spaces in the strings, as the words are read.

`defineFilm` takes a `theme`, any of its values, where the user names a
brand's look. In hex: `ground` and `glow` (left out, the ground is of one
colour), `ink` and `quietInk`, `accent` and `accentInk` for pins and notes,
`paneEdge` and `paneShadowColour` (a dark edge on a light ground),
`cursorFill` and `cursorEdge`, `terminal` and `terminalInk`, and the code's
colours by kind, `codeComment`, `codeString`, `codeNumber`, `codeKeyword`,
`codeCall` and `codeKey` (made for a dark pane: give them all with a light
`terminal`). From 0 to 1: `paneShadow`, `glowX` and `glowY`. A pane is the
page's window, the code's pane and the terminal alike: one corner, edge
and shadow for all three. Where the terminal stands is its own:
`terminal.open(title, { at })`.
From 100 to 900: `titleWeight` and `captionWeight`. In times its letters'
size: `codeLineHeight`, how tall a line of code stands; `titleLetterSpacing`,
how far apart a title's letters stand past where its font sets them (below
0 closer), and `titleLineHeight`, how far below one line's foot the next's
stands. In pixels of a 1080
frame: `titleSize`, `captionSize`, `noteSize`, `calloutSize`, `pinSize`,
`keysSize`, `codeSize`, `terminalSize`, `endingNameSize`, `endingLineSize`,
`endingCommandSize` and `paneCorner`; `titleMargin`, how far in from the
frame's sides a title over the whole frame stands, and
`captionGroundHeight`, how far the ground darkens under a caption. As CSS
names a family, one the machine has or one whose file the film brings in
`defineFilm`'s `fonts` (`{ 'Inter Tight': './InterTight-SemiBold.ttf' }`, a
file standing for every weight), refused before the shoot where it names
neither: `font` and `mono`. As CSS's
`background` writes them, its lengths in pixels of a 1080 frame:
`groundLayers`, laid over the ground and its glow — a grid of dots
(`'radial-gradient(#ffffff26 2px, transparent 2.5px) 0 0 / 36px 36px'`),
lines, a gradient — a colour on the last alone, and no `url()`. And
`words`, the way every title's, caption's, callout's and note's
words come up where the film names none: `'rise'`, `'sharp'`, `'fade'`,
`'blur'`, `'mask'`, `'letters'` or `'scramble'`. The window's body is the
window's own, `window.body`, not the theme's. Leave out what the user does
not name: livereel's own is a dark
ground, white ink and an amber accent. `look.to(theme)` changes any of these
as the film goes: in a `play` through the values between (a ground fading
light, the glow drifting while the camera moves, the dots fading into
lines), in a `cut` at once; a font changes half-way through a play. Two
moves of the look share a step at once where they name no value alike, a
ground named alone naming its glow too: the glow drifting over a whole play
while the ink changes in a share of it. A run of cuts a beat apart, each
adding one value, shows a look built up; fade the ink a little after the
ground, or the words pass through the ground's own grey.

`defineFilm` takes a `world` too, how the world of a room looks, apart from
the theme: its light, for a film's own things in a lit material and the
window's body: `lights`, each `{ colour, strength, at, aim, angle,
softness }`, a spotlight standing `at` a spot and aiming at another as the
eye does, `strength` how bright a white face square to it stands at the
spot it aims at (1 its whole colour), falling off by the square of the
distance, so aim it where the thing it lights stands, `angle` how far its cone
opens from its middle, under 90°, and `softness` its edge, 0 sharp to 1;
and `softBoxes`, each `{ colour, brightness, round, up, width, height,
lean }`, a glowing panel faces reflect and are lit by, matte ones too,
turned `round` from straight toward the eye at rest, to the right for more
degrees, and `up` from level, spanning `width` and `height` degrees, turned
`lean` degrees round its own middle, brightest along it; each colour hex
with no alpha. None of either in livereel's own world; a still of a
polished sphere shows where each glint falls. A room's light past the
page's white may glow round itself: `bloom` (0, none, livereel's; the
reference promo's 0.45) and `bloomRadius` (0.4), from 0 to 1; light far
past white glows wide, so show the user a still. Any film, flat or a room,
may lay `grain` over its ground, `{ levels }` of 255 either way (the
reference promo's 1) or `{ enabled: false }`, livereel's: it hides the bands
a glow fading across a dark ground falls into, and leaves the page and all
over it as drawn. `world.to(world)` changes any of these as the film goes,
as `look.to` does the look: the glow and the grain through the values
between; lights as many as those standing light by light, each
value through the values between, so a light fades in from `strength: 0`
(write the list with the light at 0 first, then move it); lights of another
number and the soft boxes whole, half-way through a play. A theme never names the world's values, nor a world the look's.

The rest: `keystrokes(text, { seed, slipAt, pace })` makes the strokes a
person types, `keystrokes(text, { lettersPerSecond })` strokes at an even
pace. Curves of the film's own numbers: `cubicBezier(x1, y1, x2,
y2)` as a designer hands CSS's `cubic-bezier()`; `atSpeeds({ settingOff,
arriving })`, each speed from 0 to 3 times the mean, so two plays of one
move run on with no jolt where the second sets off at the speed the first
arrived at, in its own mean's terms: that speed, how far the first went a
second as it arrived, times the second's seconds over how far it goes, the
two going the same way; `softThenHeld(fastestAt)` for a flight that sets off
softly and runs on at speed, held at π/2 ÷ (fastestAt + π/2 × (1 −
fastestAt)) times its mean, 1.17 at 0.4. Livereel's curves are `linear`,
`easeInOutSine` (a step's own),
`easeInOutCubic`, `easeOutCubic`, `easeOutQuint` and `easeOutBack`, which
passes its end by a tenth of the way and settles back on it: a place, a
scale or an angle bounces with it, while what comes up or goes never passes
whole or none, and a blur or a length never passes where it ends. Give it to the move that should bounce — a `to`, a `lean`, a camera
move — not to a whole `play`, nor to a show or a hide: one of those reaches
its end a third of the way in and stops there, with no bounce.

### Recipes: setting a block apart

A block set apart from the page — lifted, grown, under a lens, in layers,
spun — is no move of its own: it is a few moves of pieces, outlines, a lens
and groups, with the window's shade behind them. Here are eighteen, named
as a storyboard calls them. `node_modules/livereel/examples/livereel-recipes.ts`
plays each on the promo's app, an act a recipe, in this order, each leaving
the page as it found it: read its act for the timing before writing one.

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

- A card with rounded corners is lifted with them: `piece.show(card, {
  corner: 18 })`, its `border-radius` read off the page's stylesheet; the
  film plays every card so.
- A piece stands where it was lifted, and the film knows no place of it:
  grow it there by `effects({ scale })`, about its middle, or bring it near
  by `effects({ depth })`, which grows it about the frame's middle, as a
  block lifted toward the eye looks.
- One grown or brought near where it stands goes back by its effects at
  rest, `effects({ scale: 1, depth: 0 })`, and goes in a `cut`, standing
  over its source; one carried by `to` goes back by `back()`, face-on by
  its nearest whole turns, so one spun round does not spin back: to turn
  it back as it returns, a `lean({ turn: 0 })` over the first half of the
  step and `back()` over the second.
- A scale or a depth its effects set stays through a `to` that names
  none, and grows the piece at its new place too: name it in the `to`,
  `piece.to(box, { depth: 0 })`, where the piece should stand as the box
  holds it.
- Leave a hole, `hole: {}`, where the viewer should see that the block
  left its place: a card carried to the middle, out beside the page, or
  standing face-on before a page that turns away. Leave none where the
  piece grows over its place, where the copy is the point and its source
  should still show (a loupe's card lit where it stands, an inset), or
  where the page fades away behind it.
- A block a move reads is read as its share begins: in the step the window
  comes back, start a piece's `back()` after it, `within: { start: 0.5 }`.
- The camera at `whole` shows the page as large in a smaller window, cut
  by its edge: frame the whole screen once, `camera.onto(screen, { air: 0
  })` with the screen's box, and the page stays whole in whatever window
  stands.

### A film its own page draws

Where the user's film needs what steps do not give — a world of its own
in three.js — write it as a page that draws each moment itself, and
`defineDrawnFilm({ formats: { wide: { frame } }, address, serve })` it, its
page served by the project's own command, as a plain static server of the
film's folder (`npx http-server -p 8741 -a 127.0.0.1`) or Vite: the page sets
`globalThis.livereelDrawnFilm = { ready, duration, at(seconds) }` as its script
runs, and draws a moment the same however it was asked before, so a still
or a clip of its middle draws alone. Use three.js as it is: write a light,
a plane wearing a picture or a material in its own few lines, never a
wrapper round them. Steps first: reach for this only where they fall short.

## 4. Checking it

You cannot watch a video. Look at frames:

```bash
npx livereel shoot film.ts --format square --out out --sheet --renderer gpu   # the video, and a frame a second side by side
npx livereel clip film.ts --format square --out out --from 12 --to 15 --sheet --sheet-rate 6   # a span, six frames a second side by side
npx livereel still film.ts --format square --out out --at 12.5                 # one still, without the video
```

A full shoot takes minutes: the promo, 20 seconds long, took 98 s on the
graphics card and 289 s in software at 30 frames a second, and more at
the 60 a film is shot at now. Run it in the background; a clip of a few
seconds takes less, and a still seconds.

- `--format` names the format to shoot; a film of one format needs none.
  `--as gif` or `--as webm` makes the video as a GIF or a WebM, and
  `--as mp4 --as gif` both from one take: shoot the kinds the user asked
  for once the film is checked.
- `--quality draft` shoots quicker: at the frame's own size and unblurred.
  Use it for a first look at the timing; judge the film on sheets and
  stills shot at the default, `finest`.
- After every change, read the contact sheet of every format; read every
  new shot at full size with `--at`. A change to one shot needs no whole
  shoot: `clip` its span, read its sheet at six frames a second to follow
  the move, and hand the user the clip.
- A film is shot at 60 frames a second; leave it unless the user asks for
  another, `framesPerSecond: 30` in `defineFilm` (half the frames).
- Check what the eye checks: is the caption about what is lit, is the text
  readable at this size, does any edge of the screen show where it should
  not, is anything cut off.
- Where the camera, the window, the cursor, the light or a title, code,
  the terminal or the card moves fast, comes up masked, wiped, opened or
  grown, or code scrolls fast, a frame is blurred along its way, as a film camera
  blurs it: a still in the middle of a fast move or a slide shows it
  smeared, and that is right. Read text where it has settled.
  Leave the blur as livereel sets it unless the user asks for another:
  `motionBlur: { shutter, exposuresAtMost }` in `defineFilm`, either or
  both, `shutter` from just above 0 to 1 (the smear's length),
  `exposuresAtMost` 2 or more (how smooth the fastest smears are, and the
  shoot's time), or `motionBlur: { enabled: false }` for none.
- Say plainly that you saw frames, not the film: the last look at the
  moving film is the user's.

## Traps already met

- A dynamic page on the stage apart sends its own requests without its
  cookies, so an app behind a sign-in shows nobody signed in. Ask the user
  before writing the film whether the pages it shows need a sign-in; if they
  do, film the page static, or dynamic with `stage: 'inside'`, and an
  account for the film. A session only the user can sign in to (two
  factors, a sign-in elsewhere) cannot be filmed yet: say so and stop, or
  film a page that needs none.
- A dynamic page on the stage apart: a click that moves the top page, as a
  link to `_top` does, takes the stage away, and livereel refuses the film
  saying so: click such a link on the stage inside the app, where it does
  nothing, or leave it out.
- Do clicks in `act`: a dynamic page's screen is laid flat at its own size
  first, as a browser places a click wrongly on a screen the camera has
  scaled; a static page is clicked in its own tab.
- A static page is pictured as sharp as a camera 2.2 times close needs:
  keep `zoomAtMost` and a pose's zoom at 2.2 or under, or its text shows
  softer. A piece grown larger, flat, stays sharp: it is drawn from a
  picture of its own block as close; one lifted `picture: 'held'`, a leant
  one and a lens soften past 2.2.
- A screen taller than the frame, a page laid out whole as a runway the eye
  flies low over (`screen: { width: 1040, height: 5000 }`), is pictured
  whole each time the page changes, 1.8 s each in software at the finest
  quality for 1040 × 5000: keep acts and typing on it few. On a graphics
  card no picture is taken past the card's largest texture on a side
  (16,384 px on an Intel Iris Xe), so a screen 1040 wide and over 3,723 px
  tall shows its close shots softer there, and livereel warns once, naming
  the zoom past which it is softer. In software, the default, it is taken
  whole up to 14,886 px tall, but a fast film shoots far slower there: a
  4 s probe of a low flight over 1040 × 5000 took 301 s in software
  against 39 s on the card. Shoot the close shots in software, or keep the
  camera under the zoom the warning names on the card.
- The page is asked for the light colour scheme: an app that follows the
  system's scheme is filmed light, unless the film writes
  `colourScheme: 'dark'` in `defineFilm`.
- A real app shows real people's addresses, keys and names: ask the user
  what must not be seen, and write `blurred: [selector, …]` in
  `defineFilm`; the page blurs those blocks wherever it shows them. Check on
  the stills that nothing private reads.
- The page is asked for reduced motion, so a page whose styles honour it
  stands still between frames; one whose styles animate anyway animates on
  the wall clock, and two shots of it differ. Where such an animation must
  show (a CSS spinner of the page's own), release it in an `act` and still it
  after: it plays sped up, which reads as time-lapse. What the page's script
  animates plays on the film's time, at its own speed.
- The page's timers run on the film's time: a note the app takes away after
  5 s goes 5 s into the film, however long the shoot takes, with nothing in
  the film about it. While an `act` waits on the page its time runs as the
  wall's, so an act may wait for anything the page does after a delay; the
  page then stands until the film catches up.
- A page shown as a picture, the default, is taken anew after the film
  changes it and after any change to its document it makes of itself — a
  timer, a late answer, data pushed to it — until two pictures of it come out
  alike. One that changes where its document does not — a video, a canvas, an
  animation that ignores reduced motion, a change inside a shadow root —
  stands still through a hold: write `page: 'dynamic'` in `defineFilm` for
  it, and it is captured every frame, at the cost of a slower shoot.
- A long scroll in one frame step shows blank space where the page renders
  lazily: scroll in a `play`, a little each frame.
- A box is read as its move's share begins: a block a scroll in the same
  step is still moving is read mid-way, so start the light after the
  scroll's share ends.
