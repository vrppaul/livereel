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
  and the frame: 16:9 for a page or a talk, square for a feed.
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
| action | `act` — a real click (`cursor.click`), real keys (`page.type`), a command |
| caption | `caption.show(text)`, `caption.hide()` |
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

What reads as generated: a zoom on every click, a window floating on a
gradient wallpaper, a glow behind the product, springy overshoot, ripples
on clicks. Leave them out.

## 3. The film

livereel is installed in the project the film lives in, and needs Node 22.20
or later and ffmpeg on the path. If `node` is missing, tell the user to
install Node and stop; do not install it yourself. Otherwise:

```bash
npm i -D livereel      # or pnpm add -D livereel
npx livereel setup     # the browser films are shot in; it says if ffmpeg is missing
```

A film is a TypeScript file whose default export is `defineFilm({ format,
serve, ready, steps })` from `livereel`: the frame and screen sizes, how the
page is served (`atAddress(url)` for a page someone else serves, or a server
the film starts and stops), when the page is ready, and its steps. Read
`node_modules/livereel/examples/example-com.ts` first: it is a whole film.
`examples/livereel-promo.ts` serves an app of its own and clicks it for
real; its server is `examples/livereel-promo/server.ts`.

- Split the steps into acts, a function each; name every selector at the
  top, by test id or role where the page has them.
- Write each number as the value of its keyword in place (`seconds`, `air`,
  `start`, `end`, `seed`, `pace`); any other number is a constant at the top.
- Two moves of one part — a prop, or the page — share a step only one after
  the other: `play` and `cut` refuse them at once.

### What a film is written with

Every move that runs over time takes, last, its timing: `within: { start,
end }`, the share of its step it runs over (0 to 1, the whole step if left
out), and `ease`, its own curve where it does not take its step's.
`cursor.hide()`, `screen.lower()` and `terminal.submit()` are made at once
and take none: write them in a `cut`. Any other move in a `cut` is set at
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
| `camera.onto(selector, { every, air, zoomAtMost, tilt, turn })` | frames the first `every` blocks a selector matches, `air` pixels round them |
| `screen.rise()`, `screen.lower()` | the screen up out of the ground; down in it, in a `cut` |
| `light.on(selector, { dim })`, `light.to(selector)`, `light.off()` | one block lit, the rest dimmed by `dim`; carried; put out |
| `cursor.to(selector, { entering, bow })` | along an arc to a block, from `entering` if not yet on the screen |
| `cursor.press()`, `cursor.release()`, `cursor.hide()` | pressed in, let go, taken off the screen |
| `cursor.click(action)` | pressed, `act(action)`, let go: the steps of a click |
| `caption.show(text)`, `caption.hide()` | words coming up one after another, in place of any shown; going |
| `terminal.open(title)` | an agent's terminal coming up over the frame; in a `cut`, there at once |
| `terminal.type(strokes)`, `terminal.submit()` | keys typed into it; Enter |
| `terminal.works(lines, thinking, { thinkingShare })` | the agent thinking, its spinner beside the words `thinking`, then its lines written one after another; a line is `{ kind, text }`, its kind `work` (a tool and what it is used on), `said` or `done` |
| `terminal.leave()` | the terminal giving way |
| `ending.show(card)` | the last card: `{ name, line, command }` |
| `page.scrollBy(selector, { pixels })` | a block's own scroll moved so many pixels |
| `page.scrollTo(selector, { top })` | the page scrolled until a block stands `top` pixels below the top of what scrolls it |
| `page.type(strokes)` | real keys typed into whatever holds the page's keyboard |

The rest: `keystrokes(text, { seed, slipAt, pace })` makes the strokes a
person types; the curves are `linear`, `easeInOutSine` (a step's own),
`easeInOutCubic`, `easeOutCubic` and `easeOutQuint`.
- Prefer the page's own states to anything drawn over it: open a panel with
  its own button, not by hiding parts of the page.
- A page that refuses frames (`X-Frame-Options`) is shown anyway: livereel
  takes the refusal off in its own browser.

## 4. Checking it

You cannot watch a video. Look at frames:

```bash
npx livereel shoot film.ts --out out --sheet     # the video, and a frame a second side by side
npx livereel still film.ts --out out --at 12.5   # one still, without the video
```

- After every change, read the contact sheet; read every new shot at full
  size with `--at`.
- Check what the eye checks: is the caption about what is lit, is the text
  readable at this size, does any edge of the screen show where it should
  not, is anything cut off.
- Say plainly that you saw frames, not the film: the last look at the
  moving film is the user's.

## Traps already met

- A browser places a click wrongly on a screen the camera has scaled: an
  `act` lays the screen flat at its own size first. Do clicks in `act`.
- The page is asked for the light colour scheme: an app that follows the
  system's scheme is filmed light.
- The page is asked for reduced motion, so a page that honours it stands
  still between frames; one that ignores it animates on the wall clock, and
  two shots of it differ. Where the page's own animation must show (a
  spinner of its own), release it in an `act` and still it after: it plays
  sped up, which reads as time-lapse.
- A long scroll in one frame step shows blank space where the page renders
  lazily: scroll in a `play`, a little each frame.
- An element the camera frames must be on the page's screen, not scrolled
  out of it: scroll it in with `page.scrollTo` first, then frame it.
- A box is read as its move's share begins: a block a scroll in the same
  step is still moving is read mid-way, so start the light after the
  scroll's share ends.
