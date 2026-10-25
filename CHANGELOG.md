# Changelog

## Unreleased

- A film names its formats, each a frame and the screen its page is laid out on, and is shot in one at a time: `formats: { square: …, wide: … }` in place of `format`, so a film of 0.1 gives its one format a name. `--format` names the format to shoot, and a film of one format needs none; `steps` is handed the format's name after the whole screen's pose, for a pose given in numbers. Every file is named after the film file and the format: `film-square.mp4`, `film-square-sheet.png`, `film-square-6.5s.jpg`.
- `livereel shoot --as webm` and `--as gif` make the video as a WebM (VP9) or a GIF, each at the film's own frame and rate, from the one take; `--as mp4 --as gif` gives both. A kind the system's ffmpeg cannot make is refused before the film is shot.
- The package ships its source, `src/`, which its `exports` name under the `source` condition: published by npm, 0.1.1 named `./src/index.ts` without carrying it, as npm does not apply `publishConfig`, which was to leave it out.
- A film shot without `--draft` is shot at twice the frame's pixels and scaled down, as it was meant to be: livereel captured frames on a CDP session of its own, which saw the page at its own pixels, so a full shoot was as soft as a draft, and a still the same to the byte. Frames are captured by Playwright now. A full shoot takes longer for the pixels (the promo: 151 s against 58 s); a draft is as quick as before.

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
