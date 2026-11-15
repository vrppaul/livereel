/**
 * What the repository names is here: every file the code of `src/`, `stage/`, `scripts/`, `bin/` and `examples/`, and
 * the documents, name between backticks is one git tracks; no line points into a session's scratch folder; no line of
 * `src/` or `stage/` names a film outside livereel; and nothing names film pixels, or a film's own page or picture, by
 * an old name.
 *
 * A name of a file the repository no longer holds sends its reader looking for code that is gone, and a scratch folder
 * is gone once its session ends. livereel shoots films kept outside it, the claude-review promo among them: a comment
 * that explains a rule of livereel's by one of them says nothing to a reader who has not got that film, and goes stale
 * as the film changes. Film pixels (`SHORTER_SIDE_IN_FILM_PIXELS` in `src/domain/geometry.ts`) have one name: one old
 * name, by a frame's height, was false on a frame taller than wide, and another, after the frame, reads as the frame's
 * own pixels, which the code counts apart. A film's own page or picture, `ownPage` and `filmsPictures` in the code, has
 * that one name in the prose too, with its noun last, as the reader looks for it. The last three are word checks: they
 * keep these slips from coming back, and prove nothing more. An old name is looked for across line breaks, as its words
 * wrap. The changelog is left out, as it tells what was in the names of then; and the tests, held to formatting alone.
 *
 * A script rather than eslint and stylelint rules on comments: the file rule needs one anyway, and it reads code,
 * styles, markup and documents alike.
 *
 * Run in the repository's root, as pre-commit runs it: `node -C source scripts/check-references.ts`. It prints each
 * line at fault, by its file and line, a line each, and exits 1; it prints nothing and exits 0 where none is.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { reported } from './disagreements.ts';
import { trackedFiles } from './tracked.ts';

// The folders of code read, and the documents
const SOURCES = /^(src|stage|scripts|bin|examples)\//;
const DOCUMENTS = ['README.md', 'TODO.md', 'CONTRIBUTING.md', 'skills/reel/SKILL.md'];
// The folders that are livereel itself
const ENGINE = /^(src|stage)\//;
// A file named between backticks: a path of words, dots and dashes, ending in an extension of what the repository
// keeps; not a picture or a video, which name what a shoot makes
const FILE_NAMED = /(?<=`)[\w.-]+(?:\/[\w.-]+)*\.(?:ts|js|css|html|md|json|yaml|yml|toml|py|ogg)(?=`)/g;
// Where a film's project holds livereel installed, as the skill names its files
const INSTALLED = 'node_modules/livereel/';
// The files of a film's own the documents name, no file of livereel's: a film's file, and its set's
const A_FILMS_OWN = new Set(['film.ts', 'set.json']);
// A session's scratch folder, by its session, its wave or its place under the system's temporary folder
const SCRATCH = /session [0-9a-f]{8}|\bwave[A-Z]+\/|\/tmp\/claude-/;
// A film outside livereel, by its name; livereel's own promo, `examples/livereel-promo.ts`, is livereel's
const OUTSIDE_FILM = /claude-review|(?<!livereel-)\bpromo\b/i;

/** What has one name now, and its old names, each word by word. */
interface Renamed {
	readonly now: string;
	readonly oldNames: readonly (readonly string[])[];
}

// The names given anew: film pixels, once named by a frame of 1080, high or on its shorter side, after the frame, and
// by what the look was made on; and a film's own page or picture, once named with its noun first
const RENAMED: readonly Renamed[] = [
	{
		now: 'film pixels',
		oldNames: [
			['pixels?', 'of', 'a', 'frame', '1080'],
			['pixels?', 'of', 'a', '1080', 'frame'],
			['frame', 'pixels?'],
			['frames?', 'the', 'look', 'was', 'made', 'on'],
			['frames?', 'the', "stage's", 'look', 'was', 'made', 'on']
		]
	},
	{ now: "a film's own page or picture", oldNames: [['(?:pages?|pictures?)', 'of', '(?:the|a)', "film's", 'own']] }
];
// What stands between two words of a name: a space, or a line's end and the comment marker the next line opens with
const BETWEEN_WORDS = String.raw`\s+(?:(?:\*|//)\s+)?`;
// Every place two words of a name stand apart, to say the name found on one line
const WORDS_APART = new RegExp(BETWEEN_WORDS, 'g');

/** A file read whole, by its path from the root. */
interface FileRead {
	readonly file: string;
	readonly text: string;
}

/** A line of a file, by its number from 1. */
interface Line {
	readonly file: string;
	readonly number: number;
	readonly text: string;
}

/** Whether a file a line names is tracked: from the root, beside the line's file, or in livereel installed. */
function isTracked(named: string, namedIn: string, tracked: ReadonlySet<string>): boolean {
	const candidates = [named, join(dirname(namedIn), named), named.replace(INSTALLED, '')];
	return candidates.some((candidate) => tracked.has(normalize(candidate)));
}

/** Every line of a file. */
function linesOf(read: FileRead): Line[] {
	return read.text.split('\n').map((text, index) => ({ file: read.file, number: index + 1, text }));
}

/** Any old name of what is renamed, anywhere in a file, as a whole word at either end. */
function oldNamesOf(renamed: Renamed): RegExp {
	return new RegExp(
		renamed.oldNames.map((words) => String.raw`(?<![\w-])${words.join(BETWEEN_WORDS)}(?![\w-])`).join('|'),
		'gi'
	);
}

/** What is renamed, and a pattern of its old names, made once. */
interface SoughtNames {
	readonly now: string;
	readonly oldNames: RegExp;
}

const SOUGHT: readonly SoughtNames[] = RENAMED.map((renamed) => ({ now: renamed.now, oldNames: oldNamesOf(renamed) }));

/** Each old name a file holds of what is renamed, by the line it starts on. */
function oldNamesIn(read: FileRead, sought: SoughtNames): string[] {
	return [...read.text.matchAll(sought.oldNames)].map(
		(found) =>
			`${read.file}:${lineAt(read.text, found.index)} names ${sought.now} by an old name: ${found[0].replace(WORDS_APART, ' ')}`
	);
}

/** The number, from 1, of the line a place in a text stands on. */
function lineAt(text: string, place: number): number {
	return text.slice(0, place).split('\n').length;
}

/** What is at fault in a line: each file it names that is not tracked, a scratch folder, a film outside livereel. */
function faultsOf(line: Line, tracked: ReadonlySet<string>): string[] {
	const where = `${line.file}:${line.number}`;
	const missing = (line.text.match(FILE_NAMED) ?? [])
		.filter((named) => !A_FILMS_OWN.has(named) && !isTracked(named, line.file, tracked))
		.map((named) => `${where} names ${named}, which the repository does not hold`);
	const scratch = SCRATCH.test(line.text) ? [`${where} points into a session's scratch folder`] : [];
	const outside =
		ENGINE.test(line.file) && OUTSIDE_FILM.test(line.text) ? [`${where} names a film outside livereel`] : [];
	return [...missing, ...scratch, ...outside];
}

const tracked = trackedFiles();
const trackedSet = new Set(tracked);
const filesRead = tracked
	.filter((file) => SOURCES.test(file) || DOCUMENTS.includes(file))
	.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
reported([
	...filesRead.flatMap(linesOf).flatMap((line) => faultsOf(line, trackedSet)),
	...filesRead.flatMap((read) => SOUGHT.flatMap((sought) => oldNamesIn(read, sought)))
]);
