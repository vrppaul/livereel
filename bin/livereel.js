#!/usr/bin/env node
// The command as installed. Node 14.8 and later parse it, the first to take an `await` at a module's top, so a Node
// too old for livereel but not that old is told so by name rather than failing on syntax it cannot parse.
const OLDEST = { major: 22, minor: 20 };
// The machine's to put right, as src/cli/main.ts exits for what a machine lacks; written again here, as nothing of
// the package is imported before the Node is known new enough
const NOT_SET_UP = 3;
const [major, minor] = process.versions.node.split('.').map(Number);
const tooOld = major < OLDEST.major || (major === OLDEST.major && minor < OLDEST.minor);
if (tooOld) {
	process.stderr.write(
		`livereel needs Node ${OLDEST.major}.${OLDEST.minor} or later; this is Node ${process.versions.node}\n`
	);
	process.exit(NOT_SET_UP);
}
await import('../dist/cli/main.js');
