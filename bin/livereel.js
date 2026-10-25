#!/usr/bin/env node
// The command as installed. Written in the JavaScript every Node reads, so a Node too old for livereel is told so
// by name rather than failing on syntax it cannot parse.
const OLDEST = [22, 20];
const [major, minor] = process.versions.node.split('.').map(Number);
const tooOld = major < OLDEST[0] || (major === OLDEST[0] && minor < OLDEST[1]);
if (tooOld) {
	process.stderr.write(`livereel needs Node ${OLDEST.join('.')} or later; this is Node ${process.versions.node}\n`);
	process.exit(1);
}
await import('../dist/cli/main.js');
