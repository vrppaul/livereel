# TODO

## Faults

- On the stage apart from the app, a click that moves the top page takes the stage away, and the film is refused, saying so (`src/adapters/browser/watch.ts`): Chrome stops a framed page of another site moving it only without a click. Measured by the reviewer of 2026-10-27 through `Chromium.open`: a click on a link to `_top`, and one on a button that sets `top.location`, each left no stage and no frame. The frame inside the app is sandboxed against it; whether the stage apart sandboxes its frame too, so such a film goes on, at the price of what a sandbox changes for an app, is the owner's to decide.
- The stage inside the app, not tried yet: what its sandbox changes for an app beyond claude-review's story film, shot whole under it (2026-10-27) — a popup, a download, storage access; the app's service worker.
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. Setting each of `document.getAnimations()` to the film's moment every frame was built and taken out (2026-10-25): its `frame.evaluate` each frame met navigations (`examples/example-com.ts` failed 3 of 3, "Execution context was destroyed"), a scroll-driven animation threw on `currentTime`, and it overrode what the page does with its own animations (a rate of 2, `reverse()`, a pause after the film first saw it); `document.getAnimations()` misses shadow roots, and a paused animation sought past its end never resolves `finished`. Chrome's construction for a page on a clock of its own is `HeadlessExperimental.beginFrame` with `frameTimeTicks` in the headless shell, which moves the document's timeline and animation frames together; Playwright makes no page with begin-frame control, so the page would be made through CDP. Not probed. CDP's virtual time (`Emulation.setVirtualTimePolicy`) holds timers, measured on a framed page served from 127.0.0.1: paused, a `setInterval` of 100 ms ticked never in 1 s of wall time and once for each 100 ms of budget, but a CSS animation ran 0.98 s of its 2 s in that second.
## Films

- The eye's step, for the motion blur, measured by the eye: `EYE_STEP` in `src/domain/shutter.ts` is a guess, 6 pixels of a 1920 × 1080 frame, which sets both from what smear a frame is blurred and how close its copies stand. Pans of 2 to 32 pixels a frame, shot sharp and blurred with the shutter open for half the way, looked alike to the owner (2026-10-26), so the step may stand higher and spare those frames their exposures; what decides it is the speed from which a pan shot sharp is seen to jump.
- A film of a session the person signs in to themselves (two factors, a sign-in elsewhere), on the stage inside the app: `livereel login <address>`, a visible window the person signs in in, as they would, its session — cookies and local storage — saved to a file a film is shot with (Playwright's `storageState`). The person's own running Chrome cannot be borrowed: Chrome 136 and later refuse a debugging port on the everyday profile, and its cookies are encrypted with a key of the system's.
- Blocks blurred by a selector, so a film of a real app shows no one's address, key or name.
- A theme of the film's own: the fonts and colours of its captions, terminal and ending.
- The keys pressed shown as a badge (`⌘K`) where a film types a shortcut.
- The captions written out as subtitles (SRT) beside the video.
- Films of a phone: its screen size, taps in place of a cursor.
- The page in the dark colour scheme where a film asks for it.
- A player for a person: the film's scene on a scrubber, before anything is shot.
- A GitHub Action that shoots a project's films again on every release, so the videos in its docs show the app as it is.

## Integrations

An integration is a module a film imports, built on the seams livereel already has, with no registry or loader: a page served (`serve` hands back a `Serving`), moves (`Move`), acts (`ActContext`). One that needs nothing but `fetch` is a subpath of this package (`livereel/figma`, a line in `exports`); one that needs a heavy dependency, a package of its own.

- The rest of the seams a film's integration builds on exported as the package's promise: `Beginning` and `FilmedPage`, beside `Serving`, `Move` and `ActContext`, which are.
- A target given as a box in pixels as well as a selector, for the camera, the light and the cursor: a Figma prototype or a canvas has no selector.
- The props stay the core's: the scene's set of them is closed (`src/scene.ts`, `DRAWERS` on the stage), which the compiler holds.

## Figma

- A film of Figma frames, the first integration, `livereel/figma`: the frames exported through Figma's API into a page, a block with an id each, served as the promo's app is and filmed as any page is.
- A film of a Figma prototype by its link: the camera and the light by box, clicks by point; whether Figma's WebGL draws in the headless shell is to be probed first.
- A film's theme read from a Figma file through Figma's MCP server: its colours and fonts; a Figma file behind a login waits on the signed-in film (Faults).
