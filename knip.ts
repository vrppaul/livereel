// Code and dependencies nothing uses. The stage's scripts are loaded by its page, not imported, so they are entries:
// its own, and the room's; so are the servers films' serve commands run, the examples' app and the tests' page.
// ffmpeg, which the tests make an image with, and ffprobe, which they read a video with, are the system's and not
// packages: livereel finds ffmpeg on the path, and ffprobe comes with it
import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	entry: [
		'examples/*.ts',
		'examples/livereel-promo/server.ts',
		'scripts/check-*.ts',
		'tests/**/*.test.ts',
		'tests/cli/films/*.ts',
		'tests/smoke/serving.ts',
		'stage/stage.js',
		'stage/room.js'
	],
	project: ['src/**/*.ts', 'stage/*.js', 'examples/**/*.ts', 'scripts/*.ts', 'bin/**/*.js', 'tests/**/*.ts'],
	ignoreBinaries: ['ffmpeg', 'ffprobe']
};

export default config;
