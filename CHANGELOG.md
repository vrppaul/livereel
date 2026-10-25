# Changelog

## 0.1.1

- A face-on camera too far back for the screen to fill the frame along a side sets the screen in the frame's middle along it: framing a wide block near the page's top showed the ground above the screen and none below.
- `terminal.open(title)` brings the terminal up over the frame along its share of a play, as `terminal.leave()` takes it away; in a cut it is there at once, as before.
- livereel's own promo, `examples/livereel-promo.ts`: an app served by the film itself, a real click on it, then the agent who made the film.
- The terminal's log no longer moves as the agent's work ends on a `work` or `done` line: every two lines of it stand as far apart, whatever their kinds.
- The terminal's line being typed is one line high again, its prompt at its start: it had kept the line breaks and the indent of the stage's markup.

## 0.1.0

- Film a live web page frame by frame: a camera with angles, the screen coming up, a light, a cursor, captions, a drawn agent's terminal and an ending card, on a clock of the film's own.
- A film is a TypeScript file whose default export is `defineFilm`; the package runs on Node 22.20 and later.
- `livereel shoot` makes the video as the film is shot, with a contact sheet (`--sheet`); `livereel still --at` shoots one still, refused at once past the film's end; `--draft` shoots either at the frame's own size; `livereel setup` installs the browser and looks for ffmpeg.
- A film of example.com, `examples/example-com.ts`.
- The `reel` skill: how an agent directs a film, installed with `npx skills add` or as the plugin.
