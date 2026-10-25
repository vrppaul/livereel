/**
 * The skill names everything a film can call: every function livereel exports, and every move of every prop.
 *
 * An agent writes a film from the skill alone, so a function the skill leaves out is one no agent uses, and a move
 * added to the package without a line in the skill is half done. A name counts as named where it stands in the
 * skill's code, inline or in a block.
 *
 * Run in the repository's root, as pre-commit runs it: `node -C source scripts/check-skill.ts`. It prints each name
 * the skill leaves out, a line each, and exits 1; it prints nothing and exits 0 when the skill names them all.
 */
import { readFileSync } from 'node:fs';
import * as livereel from 'livereel';

const SKILL = 'skills/reel/SKILL.md';
const LEFT_OUT = 1;
// What the skill writes as code: a fenced block, or a span between backticks, which may run on to the next line
const CODE = /```[\s\S]*?```|`[^`]+`/g;
const SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Every function a film can call: those exported, and those of each prop's moves, by its prop's name. */
function callable(exported: object): string[] {
	return Object.entries(exported).flatMap(([name, value]: [string, unknown]) => namesIn(name, value));
}

function namesIn(name: string, value: unknown): string[] {
	if (typeof value === 'function') return [name];
	if (typeof value !== 'object' || value === null) return [];
	return Object.entries(value)
		.filter(([, member]: [string, unknown]) => typeof member === 'function')
		.map(([member]) => `${name}.${member}`);
}

function isNamedIn(code: string, name: string): boolean {
	return new RegExp(`\\b${name.replace(SPECIAL, '\\$&')}\\b`).test(code);
}

const code = (readFileSync(SKILL, 'utf8').match(CODE) ?? []).join('\n');
const leftOut = callable(livereel).filter((name) => !isNamedIn(code, name));
for (const name of leftOut) process.stdout.write(`${SKILL} does not name ${name}\n`);
if (leftOut.length > 0) process.exitCode = LEFT_OUT;
