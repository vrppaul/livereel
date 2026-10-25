// Code and dependencies nothing uses. The stage's script is loaded by its page, not imported, so it is an entry
import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	entry: ['examples/*.ts', 'tests/**/*.test.ts', 'tests/cli/films/*.ts', 'stage/stage.js'],
	project: ['src/**/*.ts', 'stage/*.js', 'examples/**/*.ts', 'bin/**/*.js', 'tests/**/*.ts']
};

export default config;
