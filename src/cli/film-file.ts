/**
 * A film file loaded: a TypeScript or JavaScript file whose default export is a film made by `defineFilm`.
 *
 * Node runs a `.ts` film by stripping its types. The film must import the same livereel as the command runs: a film
 * made by another copy is not this copy's film, and its faults are not this copy's errors, so the copy the film's
 * own folder resolves is compared with this one before the film is loaded, and another is refused by its path.
 */
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve as absolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LivereelError, UsageError } from '../domain/errors.ts';
import { type Film, ScriptedFilm } from '../direction/film.ts';

const PACKAGE = 'livereel';
const MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';
// Said with every film that cannot be run: the one cause Node's own words do not name
const AS_A_MODULE = ` (a film is an ES module: its project's package.json says "type": "module", or the file is named .mts)`;

/** The film a file names; one that cannot be loaded, uses another livereel, or exports no film, is refused. */
export async function loadedFilm(file: string): Promise<Film> {
	const path = absolute(file);
	if (!existsSync(path)) throw new UsageError(`${file} is not there`);
	const theirs = livereelOf(path);
	const ours = realpathSync(fileURLToPath(import.meta.resolve(PACKAGE)));
	if (theirs !== ours) {
		throw new UsageError(
			`${file} uses livereel from ${theirs}: run it with that copy, \`npx livereel\` in its project`
		);
	}
	const film = defaultOf(await imported(file, path));
	if (!(film instanceof ScriptedFilm)) {
		throw new UsageError(`${file} exports no film: its default export is made by defineFilm from livereel`);
	}
	return film;
}

/** The livereel a film's own folder resolves, as a real path. */
function livereelOf(path: string): string {
	try {
		return realpathSync(createRequire(path).resolve(PACKAGE));
	} catch (fault) {
		if (fault instanceof Error && 'code' in fault && fault.code === MODULE_NOT_FOUND) {
			throw new UsageError(`${path} finds no livereel: install it in the film's project, \`npm i -D livereel\``, {
				cause: fault
			});
		}
		throw fault;
	}
}

/**
 * The film file run as a module. What stops it running — a syntax error, a module it imports that is not there, a
 * project that runs `.ts` files as CommonJS — is the file's, said as Node says it. What livereel refuses as the film
 * is defined — a film with no format — is said in livereel's own words, as the film's.
 */
async function imported(file: string, path: string): Promise<unknown> {
	try {
		const loaded: unknown = await import(pathToFileURL(path).href);
		return loaded;
	} catch (fault) {
		if (fault instanceof LivereelError || !(fault instanceof Error)) throw fault;
		throw new UsageError(`${file} cannot be run: ${fault.message}${AS_A_MODULE}`, { cause: fault });
	}
}

function defaultOf(loaded: unknown): unknown {
	if (typeof loaded !== 'object' || loaded === null || !('default' in loaded)) return undefined;
	return loaded.default;
}
