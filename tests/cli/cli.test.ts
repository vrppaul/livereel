// The command line run as it is run, as a process: what it refuses, and what it writes
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const SHORT = 'tests/cli/films/short.ts';
const NO_FILM = 'tests/cli/films/no-film.ts';

interface Ran {
	readonly code: number | null;
	readonly said: string;
}

function livereel(...given: string[]): Ran {
	const ran = spawnSync(process.execPath, ['-C', 'source', 'src/cli/main.ts', ...given], { encoding: 'utf8' });
	return { code: ran.status, said: ran.stdout + ran.stderr };
}

function scratch(): string {
	return mkdtempSync(join(tmpdir(), 'livereel-cli-'));
}

test('a file that exports no film is refused as a wrong command line', () => {
	const ran = livereel('still', NO_FILM, '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining('exports no film')]);
});

test('an option a command does not take is refused, naming it', () => {
	const ran = livereel('still', SHORT, '--out', scratch(), '--at', '0', '--sheet');
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining("'--sheet'")]);
});

test("a still past the end of the film is refused with the film's length", () => {
	const ran = livereel('still', SHORT, '--out', scratch(), '--at', '5');
	expect([ran.code, ran.said]).toEqual([1, expect.stringContaining('the film is 0.2 s long (6 frames)')]);
});

test('a still is written where it is asked for', () => {
	const out = scratch();
	const ran = livereel('still', SHORT, '--out', out, '--at', '0.1', '--draft');
	expect([ran.code, readdirSync(out)]).toEqual([0, ['short-0.1s.jpg']]);
});
