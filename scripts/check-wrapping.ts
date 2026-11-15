/**
 * Every comment of `src/`, `stage/` and `scripts/` is wrapped tight: no line of a paragraph of prose ends where the
 * next word fits on it, or runs past 120 columns, a tab counted as 2, as Prettier counts it.
 *
 * A comment broken early reads as two thoughts where it holds one, and each rewrite of a sentence leaves one behind:
 * every review found them by hand. A paragraph is a run of whole-line comment lines, `// ` or ` * `, of one prefix; it
 * ends at a blank comment line, a tag (`@`), a list item, an indented line, a code fence, or a sentence that ends at a
 * line's end before one that starts with a capital, which is a paragraph of its own. A code span is never split, so a
 * line ends early where the span after it would not fit. What an `@example` or a fence holds is code, and not read.
 *
 * Run in the repository's root, as pre-commit runs it: `node -C source scripts/check-wrapping.ts`. It prints each
 * paragraph at fault, by its file and the line it goes wrong on, a line each, and exits 1; it prints nothing and exits
 * 0 where none is.
 */
import { readFileSync } from 'node:fs';
import { reported } from './disagreements.ts';
import { trackedFiles } from './tracked.ts';

// The files whose comments are read: the engine's TypeScript, the stage's scripts and styles, and these gates
const READ = /^(?:src\/.+\.ts|stage\/[^/]+\.(?:js|css)|scripts\/[^/]+\.ts)$/;
// How far a line may run, and how many columns a tab takes, as Prettier counts them
const LINE_LIMIT = 120;
const TAB = '\t';
const TAB_AS_SPACES = '  ';
// A line of prose in a comment: its prefix, `// ` or ` * ` after its indent, and its text, which opens no tag, list
// item or numbered item
const PROSE_LINE = /^(?<prefix>\s*(?:\* |\/\/ ))(?![-@]|\d+\.)(?<text>\S.*)$/;
// Where code stands in a comment: an `@example` up to the next tag or the comment's end, and a fence
const EXAMPLE_TAG = /^\s*\* @example/;
const TAG_LINE = /^\s*\* @/;
const COMMENT_END = /\*\/\s*$/;
const FENCE = /^\s*(?:\*|\/\/)\s*```/;
// A sentence ending a line, and one starting the next with a capital: a paragraph of its own
const SENTENCE_END = /[.!?]$/;
const CAPITAL_START = /^[A-Z]/;
// A code span, whose spaces are held while its paragraph is wrapped, in a character no comment writes
const CODE_SPAN = /`[^`]*`/g;
const SPACE = ' ';
const HELD_SPACE = '';

/** A file's lines, by its path from the root. */
interface FileLines {
	readonly file: string;
	readonly lines: readonly string[];
}

/** A paragraph of a comment: the places of its first line and of the line past its last, and the prefix of each. */
interface Paragraph {
	readonly start: number;
	readonly end: number;
	readonly prefix: string;
}

/** How many columns a line takes, a tab as 2. */
function columnsOf(line: string): number {
	return line.replaceAll(TAB, TAB_AS_SPACES).length;
}

/** The places of a file's lines inside an `@example` or a code fence, which hold code, not prose. */
function codeLinesOf(lines: readonly string[]): ReadonlySet<number> {
	const code = new Set<number>();
	let inExample = false;
	let inFence = false;
	for (const [place, line] of lines.entries()) {
		if (FENCE.test(line)) {
			inFence = !inFence;
			code.add(place);
			continue;
		}
		if (EXAMPLE_TAG.test(line)) inExample = true;
		else if (inExample && (TAG_LINE.test(line) || COMMENT_END.test(line))) inExample = false;
		if (inExample || inFence) code.add(place);
	}
	return code;
}

/** The prefix a line of prose opens with; none for a line that is no prose. */
function prefixOf(line: string): string | undefined {
	return PROSE_LINE.exec(line)?.groups?.prefix;
}

/** Whether a line goes on the paragraph the line before it is in: prose of its prefix, and no sentence of its own. */
function goesOn(before: string, line: string, prefix: string): boolean {
	const following = PROSE_LINE.exec(line)?.groups;
	if (following?.prefix !== prefix) return false;
	return !(SENTENCE_END.test(before) && CAPITAL_START.test(following.text ?? ''));
}

/** Every paragraph of prose in a file's comments, in order. */
function paragraphsOf(lines: readonly string[]): Paragraph[] {
	const code = codeLinesOf(lines);
	const paragraphs: Paragraph[] = [];
	let start = 0;
	while (start < lines.length) {
		const prefix = prefixOf(lines[start] ?? '');
		if (prefix === undefined || code.has(start)) {
			start += 1;
			continue;
		}
		let end = start + 1;
		while (end < lines.length && !code.has(end) && goesOn(lines[end - 1] ?? '', lines[end] ?? '', prefix)) end += 1;
		paragraphs.push({ start, end, prefix });
		start = end;
	}
	return paragraphs;
}

/** A paragraph's words wrapped tight after its prefix, within the line limit, no code span split. */
function wrappedTight(texts: readonly string[], prefix: string): string[] {
	const held = texts.join(SPACE).replace(CODE_SPAN, (span) => span.replaceAll(SPACE, HELD_SPACE));
	const room = LINE_LIMIT - columnsOf(prefix);
	const wrapped: string[] = [];
	let line: string | undefined;
	for (const word of held.split(SPACE)) {
		if (line === undefined) line = word;
		else if (line.length + SPACE.length + word.length <= room) line = `${line}${SPACE}${word}`;
		else {
			wrapped.push(line);
			line = word;
		}
	}
	if (line !== undefined) wrapped.push(line);
	return wrapped.map((tight) => `${prefix}${tight.replaceAll(HELD_SPACE, SPACE)}`);
}

/**
 * What is at fault in a paragraph, by the line it first goes wrong on: a line past the limit, or one that ends where
 * the next word fits; none where it is wrapped tight. One whose words wrapped tight take more lines is a code span too
 * long to wrap, not at fault.
 */
function faultOf(read: FileLines, paragraph: Paragraph): string[] {
	const lines = read.lines.slice(paragraph.start, paragraph.end);
	const tight = wrappedTight(
		lines.map((line) => line.slice(paragraph.prefix.length)),
		paragraph.prefix
	);
	const past = lines.findIndex((line) => columnsOf(line) > LINE_LIMIT);
	if (past !== -1) return [`${read.file}:${paragraph.start + past + 1} runs past ${LINE_LIMIT} columns`];
	if (tight.length > lines.length) return [];
	const early = lines.findIndex((line, place) => line !== tight[place]);
	if (early === -1) return [];
	return [`${read.file}:${paragraph.start + early + 1} ends where the next word of its comment fits`];
}

/** What is at fault in a file's comments, each paragraph's fault apart. */
function faultsIn(read: FileLines): string[] {
	return paragraphsOf(read.lines).flatMap((paragraph) => faultOf(read, paragraph));
}

reported(
	trackedFiles()
		.filter((file) => READ.test(file))
		.map((file) => ({ file, lines: readFileSync(file, 'utf8').split('\n') }))
		.flatMap(faultsIn)
);
