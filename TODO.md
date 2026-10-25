# TODO

## Faults

- The filmed page sits in a frame of a `file://` stage, and three faults come of it; whether the page should be a page of its own, the stage drawn over it, is the construction to weigh before mending each:
  - A page redirected to keeps the address asked for in the frame, so its relative addresses break: `route.fetch` follows the redirect. Why handing the redirect to the frame fails is measured: Playwright routes no step of a redirect after the first ("The handler will only be called for the first url if the response is a redirect"), so the page it leads to keeps its `X-Frame-Options` and the frame lands on `chrome-error://chromewebdata/`; handed to a page that lets itself be framed, the redirect works. An empty page sending the frame on by `Refresh` was tried and taken out: Playwright's waits resolved on it, so `examples/example-com.ts` showed a blank page where IANA's should be, and a redirect to a page not reached waited out the ready timeout instead of being refused. CDP's `Fetch` domain at the response stage pauses every step of a redirect (probed by the reviewer of 2026-10-25: the 307, then the 200 with `redirectedRequestId`; continuing the first and fulfilling the second without the refusal left the frame at `/app/`, its styles loaded; `Fetch.continueResponse` with the header taken off did not lift the refusal). Frames nested in the filmed page are not probed under it.
  - An app that signs in cannot be filmed: the framed page is a third party to the stage, and its own requests go without its cookies. Measured on a local app (2026-10-25) whose `POST /login` sets `session=demo; HttpOnly; SameSite=Lax` and redirects to `/`: the page after it came with the cookie, as the route fetches each page with the context's cookies, but its stylesheet and its own `fetch('/api/me')` went with none, so the server answered "nobody"; the frame's `document.cookie` was empty, and its address read `/login` on the signed-in page. The candidates, each a probe of minutes on that app: the stage served from the app's own address (a route answering `https://app/__livereel__/stage.html` with the stage), so the frame is first-party; or a browser profile that is not incognito (`launchPersistentContext`), as Chrome blocks third-party cookies in incognito. Then `livereel login <address>`: a visible window the person signs in in, as they would (2FA, a sign-in elsewhere), its session — cookies and local storage — saved to a file a film is shot with (Playwright's `storageState`). The person's own running Chrome cannot be borrowed: Chrome 136 and later refuse a debugging port on the everyday profile, and its cookies are encrypted with a key of the system's.
  - Chrome's Local Network Access checks are off for the framed page to hear its server's WebSocket (`src/adapters/browser/chromium.ts`).
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. Setting each of `document.getAnimations()` to the film's moment every frame was built and taken out (2026-10-25): its `frame.evaluate` each frame met navigations (`examples/example-com.ts` failed 3 of 3, "Execution context was destroyed"), a scroll-driven animation threw on `currentTime`, and it overrode what the page does with its own animations (a rate of 2, `reverse()`, a pause after the film first saw it); `document.getAnimations()` misses shadow roots, and a paused animation sought past its end never resolves `finished`. Chrome's construction for a page on a clock of its own is `HeadlessExperimental.beginFrame` with `frameTimeTicks` in the headless shell, which moves the document's timeline and animation frames together; Playwright makes no page with begin-frame control, so the page would be made through CDP. Not probed. CDP's virtual time (`Emulation.setVirtualTimePolicy`) holds timers, measured on a framed page served from 127.0.0.1: paused, a `setInterval` of 100 ms ticked never in 1 s of wall time and once for each 100 ms of budget, but a CSS animation ran 0.98 s of its 2 s in that second.

## Films

The next two, agreed with the owner on 2026-10-25, in this order, each a chunk of its own with its own review:

- Sound, laid by ffmpeg after the video, each sound on its own frame since the film keeps its own time: a track under the film (`music: { file, volume }` in `defineFilm`, cut to the film's length, faded out at its end); the moves that make a sound note it as they play (`cursor.click`, the keys typed, the ending), the take keeps each moment and sound, and ffmpeg lays them in. Default sounds ship with the package, CC0 alone (Kenney's interface sounds, say; each file's licence checked before it is added; not Pixabay's, whose licence forbids handing sounds on). A film replaces them or turns them off (`sounds: { click, key, ending }` or `sounds: null`), gives one move its own (`cursor.click(action, { sound })`), or plays any sound at a moment as a move (`sound.play(file, { within })`); a path is from the film's file, any format ffmpeg reads. The skill says sounds are few and quiet: a click, not every camera move.
- Motion blur for fast moves: where the camera moves fast, four frames shot between two and blended by ffmpeg (`tmix`), the rest shot once; how fast is fast is measured, not guessed.
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
- A film's theme read from a Figma file through Figma's MCP server: its colours and fonts; a Figma file behind a login waits on the signed-in film (Faults).
