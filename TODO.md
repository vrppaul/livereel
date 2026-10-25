# TODO

## Faults

- The filmed page sits in a frame of a `file://` stage, and three faults come of it; whether the page should be a page of its own, the stage drawn over it, is the construction to weigh before mending each:
  - A page redirected to keeps the address asked for in the frame, so its relative addresses break: `route.fetch` follows the redirect. Why handing the redirect to the frame fails is measured: Playwright routes no step of a redirect after the first ("The handler will only be called for the first url if the response is a redirect"), so the page it leads to keeps its `X-Frame-Options` and the frame lands on `chrome-error://chromewebdata/`; handed to a page that lets itself be framed, the redirect works. An empty page sending the frame on by `Refresh` was tried and taken out: Playwright's waits resolved on it, so `examples/example-com.ts` showed a blank page where IANA's should be, and a redirect to a page not reached waited out the ready timeout instead of being refused. CDP's `Fetch` domain at the response stage pauses every step of a redirect (probed by the reviewer of 2026-10-25: the 307, then the 200 with `redirectedRequestId`; continuing the first and fulfilling the second without the refusal left the frame at `/app/`, its styles loaded; `Fetch.continueResponse` with the header taken off did not lift the refusal). Frames nested in the filmed page are not probed under it.
  - A framed page keeps no cookie of its own, the filmed page being a third party to the stage. Measured on a page whose answer sets `plain=set; Path=/`: unrouted, no cookie at all; routed, Playwright puts it in the context (`SameSite=Lax`) but the frame's `document.cookie` is empty. A film of an app that signs in cannot keep the session.
  - Chrome's Local Network Access checks are off for the framed page to hear its server's WebSocket (`src/adapters/browser/chromium.ts`).
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. Setting each of `document.getAnimations()` to the film's moment every frame was built and taken out (2026-10-25): its `frame.evaluate` each frame met navigations (`examples/example-com.ts` failed 3 of 3, "Execution context was destroyed"), a scroll-driven animation threw on `currentTime`, and it overrode what the page does with its own animations (a rate of 2, `reverse()`, a pause after the film first saw it); `document.getAnimations()` misses shadow roots, and a paused animation sought past its end never resolves `finished`. Chrome's construction for a page on a clock of its own is `HeadlessExperimental.beginFrame` with `frameTimeTicks` in the headless shell, which moves the document's timeline and animation frames together; Playwright makes no page with begin-frame control, so the page would be made through CDP. Not probed. CDP's virtual time (`Emulation.setVirtualTimePolicy`) holds timers, measured on a framed page served from 127.0.0.1: paused, a `setInterval` of 100 ms ticked never in 1 s of wall time and once for each 100 ms of budget, but a CSS animation ran 0.98 s of its 2 s in that second.

## Films

- Sound: a track laid under the video, and sounds at moments a film names (a click, keys, a chime on the ending).
- Motion blur for fast moves: frames shot between frames and blended.
- One film in several formats: the frame as 16:9, 1:1 or 9:16, and the video as MP4, WebM or GIF.
- Blocks blurred by a selector, so a film of a real app shows no one's address, key or name.
- A theme of the film's own: the fonts and colours of its captions, terminal and ending.
- The keys pressed shown as a badge (`⌘K`) where a film types a shortcut.
- The captions written out as subtitles (SRT) beside the video.
- Films of a phone: its screen size, taps in place of a cursor.
- The page in the dark colour scheme where a film asks for it.
- A player for a person: the film's scene on a scrubber, before anything is shot.
- A GitHub Action that shoots a project's films again on every release, so the videos in its docs show the app as it is.
- The camera and the light onto a box given in pixels, for a page whose parts have no selector (a canvas).

## Integrations

An integration is a module a film imports, built on the seams livereel already has, with no registry or loader: a page served (`serve` hands back a `Serving`), moves (`Move`), acts (`ActContext`). One that needs nothing but `fetch` is a subpath of this package (`livereel/figma`, a line in `exports`); one that needs a heavy dependency, a package of its own.

- The seams a film's integration builds on exported as the package's promise, types and all: `Serving`, `Move`, `Beginning`, `ActContext`, `FilmedPage`.
- A target given as a box in pixels as well as a selector, for the camera, the light and the cursor (the Films item on a canvas): a Figma prototype or a canvas has no selector.
- The props stay the core's: the scene's set of them is closed (`src/scene.ts`, `DRAWERS` on the stage), which the compiler holds.

## Figma

- A film of Figma frames, the first integration, `livereel/figma`: the frames exported through Figma's API into a page, a block with an id each, served as the promo's app is and filmed as any page is.
- A film of a Figma prototype by its link: the camera and the light by box, clicks by point; whether Figma's WebGL draws in the headless shell is to be probed first.
- A film's theme read from a Figma file through Figma's MCP server: its colours and fonts.
- A signed-in browser for pages and files that need a login: a session a film hands over.
