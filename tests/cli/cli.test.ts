// The command line run as it is run, as a process: what it refuses, and what it writes
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const SHORT = 'tests/cli/films/short.ts';
const NO_FILM = 'tests/cli/films/no-film.ts';
const THROWS = 'tests/cli/films/throws.ts';
const AS_A_MODULE = JSON.stringify({ type: 'module' });
// A command that hangs is stopped and fails its test, rather than holding the whole run
const A_COMMAND_AT_MOST_MILLISECONDS = 30_000;

interface Ran {
	readonly code: number | null;
	readonly said: string;
}

function livereel(...given: string[]): Ran {
	return livereelWith(process.env, ...given);
}

function livereelWith(environment: NodeJS.ProcessEnv, ...given: string[]): Ran {
	const ran = spawnSync(process.execPath, ['-C', 'source', 'src/cli/main.ts', ...given], {
		encoding: 'utf8',
		env: environment,
		timeout: A_COMMAND_AT_MOST_MILLISECONDS
	});
	return { code: ran.status, said: ran.stdout + ran.stderr };
}

function scratch(): string {
	return mkdtempSync(join(tmpdir(), 'livereel-cli-'));
}

/** A project of its own with another livereel installed, and a film in it. */
function projectWithAnotherCopy(): string {
	const project = scratch();
	const copy = join(project, 'node_modules', 'livereel');
	mkdirSync(copy, { recursive: true });
	writeFileSync(join(copy, 'package.json'), JSON.stringify({ name: 'livereel', exports: { '.': './index.js' } }));
	writeFileSync(join(copy, 'index.js'), '');
	writeFileSync(join(project, 'package.json'), AS_A_MODULE);
	writeFileSync(join(project, 'film.ts'), "export { default } from 'livereel';\n");
	return join(project, 'film.ts');
}

test('a film file that is not there is refused as a wrong command line', () => {
	const ran = livereel('still', 'tests/cli/films/nowhere.ts', '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining('nowhere.ts is not there')]);
});

test('a film file that fails as it is run is refused as a wrong command line, with what it said', () => {
	const ran = livereel('still', THROWS, '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining('cannot be run: this film breaks as it is run')]);
});

test('a film that uses another copy of livereel is refused, naming where that copy is', () => {
	const ran = livereel('still', projectWithAnotherCopy(), '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining('node_modules/livereel/index.js')]);
});

test("a fault in the film's own code is said as the film's, naming where it was met", () => {
	const unserved = livereel('still', 'tests/cli/films/never-served.ts', '--out', scratch(), '--at', '0');
	const unready = livereel('still', 'tests/cli/films/never-ready.ts', '--out', scratch(), '--at', '0');
	expect([unserved.code, unserved.said, unready.code, unready.said]).toEqual([
		1,
		"livereel still: the film's serve failed: the port is taken\n",
		1,
		"livereel still: the film's ready failed: the page never came\n"
	]);
});

test('a page that cannot be reached is refused as it is opened, by its address', () => {
	const ran = livereel('still', 'tests/cli/films/unreachable.ts', '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([1, 'livereel still: the page at http://127.0.0.1:9/ could not be reached\n']);
});

test('a film is not shot where ffmpeg is not on the path', () => {
	const ran = livereelWith({ PATH: scratch() }, 'shoot', SHORT, '--out', scratch());
	expect([ran.code, ran.said]).toEqual([1, expect.stringContaining('ffmpeg is not on the path')]);
});

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
