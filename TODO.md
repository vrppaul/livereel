# TODO

## Publishing

- A repository on GitHub, CI running the gates and the tests (and the packed command on Node 22), a release to npm on a tag.

## Faults

- A page redirected to keeps the address asked for in the frame, so its relative addresses break: `route.fetch` follows the redirect. Handing the redirect to the frame (`route.continue()`, or `route.fulfill` with the 3xx and an absolute `Location`) left the frame on `chrome-error://chromewebdata/` (measured by adding a `/` → 301 → `/app/` route to `tests/smoke/app.test.ts` and filming `/`; the route was taken out again); why is not measured.
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. CDP's virtual time (`Emulation.setVirtualTimePolicy`) holds only part of it, measured on a framed page served from 127.0.0.1: paused, a `setInterval` of 100 ms ticked never in 1 s of wall time and once for each 100 ms of budget, but a CSS animation ran 0.98 s of its 2 s in that second. The page's CSS animations would take the Web Animations API (`document.getAnimations()`, each paused and set to the film's moment) or CDP's `Animation` domain; neither is probed.

## Films

- Sound: a track laid under the video, and sounds at moments a film names.
- Motion blur for fast moves: frames shot between frames and blended.
