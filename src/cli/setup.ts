/**
 * What a machine needs to shoot films: Chromium's headless shell, at the version this livereel's Playwright drives,
 * and ffmpeg on the path, which livereel leaves to the system, with the encoders of the kinds of video asked.
 *
 * The browser is installed by Playwright's own command line, found where Playwright's manifest says it is.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SetupError } from '../domain/errors.ts';
import { closed } from '../adapters/processes.ts';
import { ffmpegEncoders, ffmpegFound } from '../adapters/video/ffmpeg.ts';
import { type Kind, SHOT_INTO, encodersOf } from '../adapters/video/kinds.ts';

const PLAYWRIGHT = 'playwright-core';
const PLAYWRIGHT_MANIFEST = import.meta.resolve(`${PLAYWRIGHT}/package.json`);
// What Playwright is asked to install: the headless shell alone, which a headless launch starts
const INSTALL_THE_SHELL = ['install', '--only-shell', 'chromium'];
const NO_FFMPEG = 'ffmpeg is not on the path: install it as your system does (apt, brew, winget)';

/** The browser installed, then ffmpeg looked for; what is still missing is said and refused. */
export async function setUp(): Promise<void> {
	const commandLine = await playwrightCommandLine();
	const installing = spawn(process.execPath, [commandLine, ...INSTALL_THE_SHELL], { stdio: 'inherit' });
	const code = await closed(installing);
	if (code !== 0) throw new SetupError(`installing the browser failed (Playwright exited with ${String(code)})`);
	await ffmpegNeeded();
}

/** ffmpeg, which a video is made with, looked for before a film is shot rather than after. */
export async function ffmpegNeeded(): Promise<void> {
	if (!(await ffmpegFound())) throw new SetupError(NO_FFMPEG);
}

/** The encoders of the kinds of video asked, and of the MP4 every other kind is made from, looked for in ffmpeg. */
export async function encodersNeeded(kinds: readonly Kind[]): Promise<void> {
	const encoders = await ffmpegEncoders();
	const needed = [SHOT_INTO, ...kinds].flatMap((kind) => encodersOf(kind).map((encoder) => ({ kind, encoder })));
	const lacking = needed.find((each) => !encoders.has(each.encoder));
	if (lacking === undefined) return;
	throw new SetupError(
		`ffmpeg on the path cannot make ${lacking.kind}: it has no ${lacking.encoder} encoder; ` +
			'install an ffmpeg built with it'
	);
}

/** The file Playwright's manifest names as its command. */
async function playwrightCommandLine(): Promise<string> {
	const manifestPath = fileURLToPath(PLAYWRIGHT_MANIFEST);
	const manifest: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
	const command = binOf(manifest);
	if (command === null) throw new SetupError(`Playwright's manifest names no command: ${manifestPath}`);
	return join(dirname(manifestPath), command);
}

function binOf(manifest: unknown): string | null {
	if (typeof manifest !== 'object' || manifest === null || !('bin' in manifest)) return null;
	const bin = manifest.bin;
	if (typeof bin !== 'object' || bin === null || !(PLAYWRIGHT in bin)) return null;
	const command: unknown = bin[PLAYWRIGHT];
	return typeof command === 'string' ? command : null;
}
