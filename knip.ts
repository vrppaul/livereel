// Code and dependencies nothing uses. Knip resolves the package's `#` imports by conditions of its own, which do
// not include `source`, so each is given here as the path `source` names in package.json: the one place they are
// written.
import type { KnipConfig } from 'knip';
import manifest from './package.json' with { type: 'json' };

const paths = Object.fromEntries(
	Object.entries(manifest.imports).map(([specifier, target]) => [specifier, [target.source]])
);

const config: KnipConfig = {
	entry: ['examples/*.ts', 'tests/**/*.test.ts', 'tests/cli/films/*.ts'],
	project: ['src/**/*.ts', 'examples/**/*.ts', 'bin/**/*.js', 'tests/**/*.ts'],
	paths
};

export default config;
