/**
 * The code a film shows of itself: the regions of its own file it marks, `// #region name` to `// #endregion`, each
 * set as a block of the code page with its lines lit by kind, so the lines on the screen are the lines that shot it.
 *
 * A region's block is found by its test id, `code-<name>`; its lines lose the indent they share. The colours are the
 * page's (`app/code.css`): the server names each piece's kind by a class and writes no style.
 */
import { readFile } from 'node:fs/promises';

/** A piece of a line of code and its kind, the class the page colours it by; plain text where it has none. */
interface Piece {
	readonly text: string;
	readonly kind: string | null;
}

// Where a region starts and ends in a film's file, its name after the start
const REGION_START = /^\s*\/\/ #region (?<name>[\w-]+)\s*$/;
const REGION_END = /^\s*\/\/ #endregion\s*$/;
// The kinds of the pieces of a line, the first that matches at a place winning: a comment to the line's end, a string,
// a number, a word the language keeps, a function called, a name given a value, and anything else as it stands
const PIECES =
	/(?<comment>\/\/.*$)|(?<string>'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?<number>\b\d+(?:\.\d+)?\b)|(?<keyword>\b(?:const|function|return|import|from|export|default|await|async|readonly)\b)|(?<call>\b[A-Za-z_]\w*(?=\())|(?<key>\b[A-Za-z_]\w*(?=:\s))/gu;
const PLACE_HOLDER = '<!-- regions -->';
const ESCAPED: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const TO_ESCAPE = /[&<>]/g;
// The line after a region's start, a region with no end, and where a file's or a line's text begins
const NEXT_LINE = 1;
const NOT_FOUND = -1;
const THE_BEGINNING = 0;

/** The code page: its template with every region of the film's file set in it, in the order the file gives them. */
export async function codePage(template: URL, film: URL): Promise<string> {
	const [page, source] = await Promise.all([readFile(template, 'utf8'), readFile(film, 'utf8')]);
	return page.replace(PLACE_HOLDER, regionsOf(source.split('\n')).join('\n'));
}

/** The film's regions, each set as a block of the page. */
function regionsOf(lines: readonly string[]): string[] {
	return lines.flatMap((_line, place) => regionAt(lines, place));
}

/** The region a line starts, set as a block; none where the line starts none. */
function regionAt(lines: readonly string[], place: number): string[] {
	const name = REGION_START.exec(lines[place] ?? '')?.groups?.['name'];
	return name === undefined ? [] : [blockOf(name, linesUntilTheEnd(lines.slice(place + NEXT_LINE)))];
}

function linesUntilTheEnd(lines: readonly string[]): readonly string[] {
	const end = lines.findIndex((line) => REGION_END.test(line));
	return end === NOT_FOUND ? lines : lines.slice(THE_BEGINNING, end);
}

function blockOf(name: string, lines: readonly string[]): string {
	const shared = Math.min(...lines.filter((line) => line.trim() !== '').map(indentOf));
	const code = lines.map((line) => lit(line.slice(shared))).join('\n');
	return `<section class="region" data-testid="code-${name}"><pre><code>${code}</code></pre></section>`;
}

function indentOf(line: string): number {
	return line.length - line.trimStart().length;
}

/** A line set as its pieces, each in a span of its kind. */
function lit(line: string): string {
	return piecesOf(line)
		.map((piece) =>
			piece.kind === null ? escaped(piece.text) : `<span class="${piece.kind}">${escaped(piece.text)}</span>`
		)
		.join('');
}

function piecesOf(line: string): Piece[] {
	const pieces: Piece[] = [];
	let reached = THE_BEGINNING;
	for (const found of line.matchAll(PIECES)) {
		const [text] = found;
		pieces.push({ text: line.slice(reached, found.index), kind: null });
		pieces.push({ text, kind: kindOf(found.groups ?? {}) });
		reached = found.index + text.length;
	}
	pieces.push({ text: line.slice(reached), kind: null });
	return pieces;
}

/** The kind of the group that matched: the one with a value. */
function kindOf(groups: Readonly<Record<string, string | undefined>>): string | null {
	return Object.keys(groups).find((name) => groups[name] !== undefined) ?? null;
}

function escaped(text: string): string {
	return text.replace(TO_ESCAPE, (character) => ESCAPED[character] ?? character);
}
