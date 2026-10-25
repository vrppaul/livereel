# TODO

## Publishing

- A repository on GitHub, CI running the gates and the tests (and the packed command on Node 22), a release to npm on a tag.

## Faults

- A page redirected to keeps the address asked for in the frame, so its relative addresses break: `route.fetch` follows the redirect. Handing the redirect to the frame (`route.continue()`, or `route.fulfill` with the 3xx and an absolute `Location`) left the frame on `chrome-error://chromewebdata/` (measured by adding a `/` → 301 → `/app/` route to `tests/smoke/app.test.ts` and filming `/`; the route was taken out again); why is not measured.
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. CDP's virtual time (`Emulation.setVirtualTimePolicy`) may put them on the film's clock: probe first.

## Films

- Sound: a track laid under the video, and sounds at moments a film names.
- Motion blur for fast moves: frames shot between frames and blended.
