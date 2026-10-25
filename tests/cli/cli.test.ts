// The command line run as it is run, as a process: what it refuses, and what it writes
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const SHORT = 'tests/cli/films/short.ts';
const FORMATS = 'tests/cli/films/formats.ts';
const MADE_BEFORE = 'an MP4 made before';
const NO_FILM = 'tests/cli/films/no-film.ts';
const THROWS = 'tests/cli/films/throws.ts';
const AS_A_MODULE = JSON.stringify({ type: 'module' });
// An ffmpeg that is there, but lists H.264 alone among its encoders, whatever it is asked
const FFMPEG_OF_H264_ALONE = "#!/bin/sh\necho ' V....D libx264              libx264 H.264'\n";
const RUNS = 0o755;
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

/** What ffprobe says of a video's first stream: the entries asked, comma apart. */
function probed(video: string, entries: string): string {
	const ran = spawnSync(
		'ffprobe',
		['-v', 'error', '-count_frames', '-show_entries', `stream=${entries}`, '-of', 'csv=p=0', video],
		{
			encoding: 'utf8'
		}
	);
	return ran.stdout.trim();
}

/** A path whose ffmpeg makes H.264 alone. */
function pathOfAnFfmpegOfH264Alone(): string {
	const directory = scratch();
	writeFileSync(join(directory, 'ffmpeg'), FFMPEG_OF_H264_ALONE, { mode: RUNS });
	return directory;
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

test('steps livereel refuses as they are written are said in its own words', () => {
	const ran = livereel('still', 'tests/cli/films/no-time.ts', '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([1, expect.stringContaining('livereel still: a step of 0 s cannot be shot')]);
});

test('a film is shot whole into a video of every frame at 30 a second, and its contact sheet', () => {
	const out = scratch();
	const ran = livereel('shoot', SHORT, '--out', out, '--draft', '--sheet');
	expect([ran.code, readdirSync(out), probed(join(out, 'short-small.mp4'), 'r_frame_rate,nb_read_frames')]).toEqual([
		0,
		['short-small-sheet.png', 'short-small.mp4'],
		'30/1,6'
	]);
});

test('a film is shot in the format asked, and named after it', () => {
	const out = scratch();
	const ran = livereel('shoot', FORMATS, '--out', out, '--draft', '--format', 'tall');
	expect([ran.code, readdirSync(out), probed(join(out, 'formats-tall.mp4'), 'width,height')]).toEqual([
		0,
		['formats-tall.mp4'],
		'320,480'
	]);
});

test('a film is made as every kind of video asked, and as no MP4 unless it is asked for', () => {
	const out = scratch();
	const ran = livereel('shoot', SHORT, '--out', out, '--draft', '--as', 'webm', '--as', 'gif');
	expect([
		ran.code,
		readdirSync(out),
		probed(join(out, 'short-small.webm'), 'codec_name,nb_read_frames'),
		probed(join(out, 'short-small.gif'), 'codec_name,nb_read_frames')
	]).toEqual([0, ['short-small.gif', 'short-small.webm'], 'vp9,6', 'gif,6']);
});

test('a kind of video livereel does not make is refused, naming those it makes', () => {
	const ran = livereel('shoot', SHORT, '--out', scratch(), '--as', 'avi');
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining('mp4, webm, gif')]);
});

test("a kind of video the system's ffmpeg cannot make is refused before the film is shot", () => {
	const out = scratch();
	const ran = livereelWith({ PATH: pathOfAnFfmpegOfH264Alone() }, 'shoot', SHORT, '--out', out, '--as', 'webm');
	expect([ran.code, ran.said, readdirSync(out)]).toEqual([
		1,
		'livereel shoot: ffmpeg on the path cannot make webm: it has no libvpx-vp9 encoder; install an ffmpeg built with it\n',
		[]
	]);
});

test('a film made as an MP4 and a GIF keeps both', () => {
	const out = scratch();
	const ran = livereel('shoot', SHORT, '--out', out, '--draft', '--as', 'mp4', '--as', 'gif');
	expect([ran.code, readdirSync(out)]).toEqual([0, ['short-small.gif', 'short-small.mp4']]);
});

test('an MP4 made before is left as it was when another kind alone is asked for', () => {
	const out = scratch();
	writeFileSync(join(out, 'short-small.mp4'), MADE_BEFORE);
	const ran = livereel('shoot', SHORT, '--out', out, '--draft', '--as', 'gif');
	expect([ran.code, readdirSync(out), readFileSync(join(out, 'short-small.mp4'), 'utf8')]).toEqual([
		0,
		['short-small.gif', 'short-small.mp4'],
		MADE_BEFORE
	]);
});

test('a film of several formats is not shot until one is named, and says its formats', () => {
	const ran = livereel('still', FORMATS, '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([
		2,
		expect.stringContaining('the film has several formats: --format names one of small, tall')
	]);
});

test('a format the film does not have is refused, naming those it has', () => {
	const ran = livereel('still', FORMATS, '--out', scratch(), '--at', '0', '--format', 'wide');
	expect([ran.code, ran.said]).toEqual([
		2,
		expect.stringContaining('the film has no format wide: --format names one of small, tall')
	]);
});

test("a film with no format is refused in livereel's own words, as the film's", () => {
	const ran = livereel('still', 'tests/cli/films/no-format.ts', '--out', scratch(), '--at', '0');
	expect([ran.code, ran.said]).toEqual([
		1,
		'livereel still: a film has a format at least: the frame it is shot in, and the screen its page is laid out on\n'
	]);
});

test('a command livereel does not have is refused as a wrong command line, naming it', () => {
	const ran = livereel('film', SHORT);
	expect([ran.code, ran.said]).toEqual([2, expect.stringContaining('livereel has no command film')]);
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
	expect([ran.code, readdirSync(out)]).toEqual([0, ['short-small-0.1s.jpg']]);
});
