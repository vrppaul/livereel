// Code and dependencies nothing uses. The stage's script is loaded by its page, not imported, so it is an entry.
// ffprobe, which the tests read a video with, is the system's and comes with its ffmpeg, as ffmpeg does
import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	entry: ['examples/*.ts', 'scripts/*.ts', 'tests/**/*.test.ts', 'tests/cli/films/*.ts', 'stage/stage.js'],
	project: ['src/**/*.ts', 'stage/*.js', 'examples/**/*.ts', 'scripts/*.ts', 'bin/**/*.js', 'tests/**/*.ts'],
	ignoreBinaries: ['ffprobe']
};

export default config;
