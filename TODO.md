# TODO

## Publishing

- The repository on GitHub, public, `vrppaul/livereel`, and CI's first run green on it.
- The repository's `NPM_TOKEN` secret, then the release `v0.1.0` on a tag: the package on npm, the promo's video on the GitHub release.

## The showcase

- livereel's own promo, `examples/livereel-promo/`, to the storyboard agreed: the film first (a demo app served by the film itself, the camera onto its main number, a real click on Refresh, the camera leaning back over the page), then Claude Code's terminal over it as the reveal, then the ending over the terminal. Its frames checked for a cursor's trail and for flicker.
- The promo as a GIF at the top of the README, under one named exception to the large-file gate for `docs/`.

## Faults

- A page redirected to keeps the address asked for in the frame, so its relative addresses break: `route.fetch` follows the redirect. Handing the redirect to the frame (`route.continue()`, or `route.fulfill` with the 3xx and an absolute `Location`) left the frame on `chrome-error://chromewebdata/` (measured by adding a `/` → 301 → `/app/` route to `tests/smoke/app.test.ts` and filming `/`; the route was taken out again); why is not measured.
- A page's own animations that ignore `prefers-reduced-motion` run on the wall clock, so two shots of such a page differ. CDP's virtual time (`Emulation.setVirtualTimePolicy`) holds only part of it, measured on a framed page served from 127.0.0.1: paused, a `setInterval` of 100 ms ticked never in 1 s of wall time and once for each 100 ms of budget, but a CSS animation ran 0.98 s of its 2 s in that second. The page's CSS animations would take the Web Animations API (`document.getAnimations()`, each paused and set to the film's moment) or CDP's `Animation` domain; neither is probed.
- The terminal's log moves as the agent's work ends on a `work` or `done` line: the thinking line it takes the place of has a margin above it (`stage/stage.css`), those lines none.

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

## Figma

- A film of Figma frames: the frames exported through Figma's API into a page, a block with an id each, filmed as any page is.
- A film of a Figma prototype by its link: the camera and the light by box, clicks by point; whether Figma's WebGL draws in the headless shell is to be probed first.
- A film's theme read from a Figma file through Figma's MCP server: its colours and fonts.
- A signed-in browser for pages and files that need a login: a session a film hands over.
