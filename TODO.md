# TODO

## Faults

- On a system Playwright does not run on (FreeBSD, among those Node knows), livereel stops as it starts on Playwright's own error, `Unsupported platform`, and exits 1 with its stack. With `PLAYWRIGHT_BROWSERS_PATH` set it gets as far as the launch: Playwright's `chromium is not supported on <unknown>`, exit 1 with its stack, or, for `--renderer gpu`, livereel's refusal of the system's graphics card, exit 3, as if the software renderer would do. The system refused once as the machine's, as a Node too old is (`bin/livereel.js`), would say it alike every way. Seen with `process.platform` said to be `freebsd` (2026-10-27).
- The stage inside the app, not tried yet: what its sandbox changes for an app beyond claude-review's story film, shot whole under it (2026-10-27) — a popup, a download, storage access; the app's service worker.
- An act's Playwright click on a block not wholly on the screen scrolls the page first, between one frame and the next: a block 1200 pixels tall, its top 1000 above a 600 × 400 viewport, was clicked after a scroll of 200, one with its top 300 down after a scroll of 300, a block 40 tall half past the viewport's foot after a scroll of 20, and a block 700 wide reaching off to the left or the right after a sideways scroll of 400 or 300; a block wholly in the viewport was clicked unscrolled (measured 2026-10-28, `locator.click()` on a plain page, not through livereel's stage). The page would jump in the film, and the skill names no such trap.
- `examples/livereel-promo.ts` shot as a draft fails now and then at 7.5 s, step 8, waiting for the count Refresh brings ("12,517"): 2 of 7 draft shoots on f4bba22, and 3 of 3 on c02c26a, before the stage's rework (2026-10-27); a still at 9 s passed both times tried. Cause not found.
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. Setting each of `document.getAnimations()` to the film's moment every frame was built and taken out (2026-10-25): its `frame.evaluate` each frame met navigations (`examples/example-com.ts` failed 3 of 3, "Execution context was destroyed"), a scroll-driven animation threw on `currentTime`, and it overrode what the page does with its own animations (a rate of 2, `reverse()`, a pause after the film first saw it); `document.getAnimations()` misses shadow roots, and a paused animation sought past its end never resolves `finished`. Chrome's construction for a page on a clock of its own is `HeadlessExperimental.beginFrame` with `frameTimeTicks` in the headless shell, which moves the document's timeline and animation frames together; Playwright makes no page with begin-frame control, so the page would be made through CDP. Not probed. CDP's virtual time (`Emulation.setVirtualTimePolicy`) holds timers, measured on a framed page served from 127.0.0.1: paused, a `setInterval` of 100 ms ticked never in 1 s of wall time and once for each 100 ms of budget, but a CSS animation ran 0.98 s of its 2 s in that second.
## Films

- The eye's step, for the motion blur, measured by the eye: `EYE_STEP` in `src/domain/shutter.ts` is a guess, 6 pixels of a 1920 × 1080 frame, which sets both from what smear a frame is blurred and how close its copies stand. Pans of 2 to 32 pixels a frame, shot sharp and blurred with the shutter open for half the way, looked alike to the owner (2026-10-26), so the step may stand higher and spare those frames their exposures; what decides it is the speed from which a pan shot sharp is seen to jump.
- A film of a session the person signs in to themselves (two factors, a sign-in elsewhere), on the stage inside the app: `livereel login <address>`, a visible window the person signs in in, as they would, its session — cookies and local storage — saved to a file a film is shot with (Playwright's `storageState`). The person's own running Chrome cannot be borrowed: Chrome 136 and later refuse a debugging port on the everyday profile, and its cookies are encrypted with a key of the system's.
- The rest of a theme: a ground from an image of the film's, a font from a file of the film's (`theme.font` names one installed on the machine), and the terminal's colours, which stay livereel's.
- The keys pressed shown as a badge (`⌘K`) where a film types a shortcut.
- The captions written out as subtitles (SRT) beside the video.
- Films of a phone: its screen size, taps in place of a cursor.
- A player for a person: the film's scene on a scrubber, before anything is shot.
- A GitHub Action that shoots a project's films again on every release, so the videos in its docs show the app as it is.

## Screens: what the window, the marks and the theme left open (2026-10-29)

- A shorthand for a side per format, `side: { square: 'top', wide: 'left' }`, offered, not answered; today a film names sides from `steps`' format name.
- A note's line runs from its block across the page to the window's edge and strikes through the page's text on its way.
- Pins lie on the screen, so their marks and labels scale with the camera's zoom: small in a zoomed-out window.
- Mid-lift at an angle, `.view-shadow` stands on the view's box while the cut is still open, so a faint ring shows apart from the picture for a few frames.
- Keys' caps take `--terminal`, `--terminal-ink` and `--terminal-edge`: a theme's `terminal` recolours them too, and the theme's doc does not say so.
- Written more than once: the act's flat format (`src/studio/take.ts` and `src/adapters/browser/stage.ts`, beside `flatCamera`); the keyed rebuild of a drawer's markup (four drawers in `stage/stage.js`); `THE_FIRST` in three moves.
- From the storyboard board (https://claude.ai/artifact/46tDazJ5nnEmMxxB4QvUWT), not built: one word larger than the frame, line breaks in a title for beats, a strike drawn across as it comes, two windows side by side (the terminal beside the page), text blurred in the terminal, an address bar over the window (it needs the page's address each frame: a change of construction, the owner's word first), a voice with subtitles (a new dependency, the owner's word first).

## Integrations

An integration is a module a film imports, with no registry or loader, built on livereel's seams: a page served (`serve` hands back a `Serving`), acts (`ActContext`), and moves of its own, which no film can make yet. One that needs nothing but `fetch` is a subpath of this package (`livereel/figma`, a line in `exports`); one that needs a heavy dependency, a package of its own.

- A move made outside livereel, the seam an integration's moves stand on, exported as the package's promise: `Share` and `timingOf`, `Beginning`, `FilmedPage`, `Change` and the scene a move is handed. Today a step takes only a move livereel made (`Move`, `src/direction/move.ts`).
- A target given as a box in pixels as well as a selector, for the camera, the light and the cursor: a Figma prototype or a canvas has no selector.
- The props stay the core's: the scene's set of them is closed (`src/scene.ts`, `DRAWERS` on the stage), which the compiler holds.

## Figma

- A film of Figma frames, the first integration, `livereel/figma`: the frames exported through Figma's API into a page, a block with an id each, served as the promo's app is and filmed as any page is.
- A film of a Figma prototype by its link: the camera and the light by box, clicks by point; whether Figma's WebGL draws in the headless shell is to be probed first.
- A film's theme read from a Figma file through Figma's MCP server: its colours and fonts; a Figma file behind a login waits on the signed-in film (Faults).
