# Changelog

## Unreleased

- The terminal's log no longer moves as the agent's work ends on a `work` or `done` line: every two lines of it stand as far apart, whatever their kinds.
- The terminal's line being typed is one line high again, its prompt at its start: it had kept the line breaks and the indent of the stage's markup.

## 0.1.0

- Film a live web page frame by frame: a camera with angles, the screen coming up, a light, a cursor, captions, a drawn agent's terminal and an ending card, on a clock of the film's own.
- A film is a TypeScript file whose default export is `defineFilm`; the package runs on Node 22.20 and later.
- `livereel shoot` makes the video as the film is shot, with a contact sheet (`--sheet`); `livereel still --at` shoots one still, refused at once past the film's end; `--draft` shoots either at the frame's own size; `livereel setup` installs the browser and looks for ffmpeg.
- A film of example.com, `examples/example-com.ts`.
- The `reel` skill: how an agent directs a film, installed with `npx skills add` or as the plugin.
