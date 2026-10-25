---
name: reel
description: Direct and shoot a short film of a live web page with livereel — story first, then a storyboard, then the film as steps, checked frame by frame. Use when the user asks for a promo, a demo or an explainer video of a web app, or a GIF of a feature.
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
| framing | `Camera(onto=…, air=…)` — what the frame holds |
| angle | `Camera(tilt=…, turn=…)` — the screen leans back or swings |
| camera move | a `Play` of `seconds` with an `ease` |
| light | `LightOn`, `LightTo`, `LightOff` — one block lit, the rest dimmed |
| cast | what the page shows, opened and closed by `Act` |
| action | `Act` — a real click, real keys (`TypeIntoPage`), a command |
| caption | `CaptionIn`, `CaptionOut` |
| tempo | how long each `Play` and `hold` lasts |

What reads as made with care:

- **One motion at a time.** The camera leads, settles, then holds long
  enough to read: about a second for every four words on the screen.
- **The camera does the transitions**: it travels from one block to the
  next rather than cutting.
- **Captions of three to six words**, addressed to the viewer as "you", and
  about what is lit at that moment, never about something else.
- **Real UI the whole time**, cropped close to the part that matters. A
  phone shows a whole page too small to read.
- **People type unevenly**: `keystrokes(text, seed=…, typo_at=…)` with a
  slip now and then; an agent works for a second or two before it answers.

What reads as generated: a zoom on every click, a window floating on a
gradient wallpaper, a glow behind the product, springy overshoot, ripples
on clicks. Leave them out.

## 3. The film

A film is a Python file that names `PRODUCTION`, a `Production` of
`livereel.studio`: its `film_format` (frame and screen sizes), `served()`
(the page's address while it is up: start a server here and stop it after),
`ready()` (wait for the page's first state) and `steps()`. Read the repository's
`examples/example_com.py` first: it is the smallest whole film.

- Split the steps into acts, a function each; name every selector at the
  top, by test id or role where the page has them.
- Prefer the page's own states to anything drawn over it: open a panel with
  its own button, not by hiding parts of the page.
- A page that refuses frames (`X-Frame-Options`) is shown anyway: livereel
  takes the refusal off in its own browser.

## 4. Checking it

You cannot watch a video. Look at frames:

```bash
uv run livereel shoot film.py --out out --sheet     # the video, and a frame a second side by side
uv run livereel still film.py --out out --at 12.5   # one still, without the video
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
  `Act` lays the screen flat at its own size first. Do clicks in `Act`.
- `backdrop-filter` on a moved screen mirrors what lies under it: the light
  dims and never blurs.
- The page's own animations are stilled. Where one must show (a spinner of
  the page's own), let it run in real time for that shot: it plays sped up,
  which reads as time-lapse.
- A long scroll in one frame step shows blank space where the page renders
  lazily: scroll in a `Play`, a little each frame.
- An element the camera frames must be on the page's screen, not scrolled
  out of it: scroll it in with `ScrollTo` first, then frame it.
- A box read before a scroll is wrong after it: frame and light a block in
  the step after the one that scrolls to it.
