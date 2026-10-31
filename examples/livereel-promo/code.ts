/**
 * The code a film shows of itself: the regions of its own file it marks, `// #region name` to `// #endregion`, so the
 * lines on the screen are the lines that shot it; or its file whole, its comments left out, the marks among them. A
 * film reads them once, as it is loaded, and hands their lines to `code.show`, which sets them as an editor would.
 */
import { readFile } from 'node:fs/promises';

/** A region a film's file marks: its name, and its lines as the file has them. */
interface Region {
	readonly name: string;
	readonly text: string;
}

// Where a region starts and ends in a film's file, its name after the start
const REGION_START = /^\s*\/\/ #region (?<name>[\w-]+)\s*$/;
const REGION_END = /^\s*\/\/ #endregion\s*$/;
// The line after a region's start, a region with no end, and where a file's lines begin
const NEXT_LINE = 1;
const NOT_FOUND = -1;
const THE_BEGINNING = 0;
// Where a line of a film's file ends
const NEW_LINE = '\n';
// A comment on lines of its own: a block of documentation, or a line of two slashes, a region's marks among them
const DOCUMENTATION = /^[\t ]*\/\*\*[\s\S]*?\*\/\n/gmu;
const LINE_COMMENT = /^[\t ]*\/\/.*\n/gmu;
const LEFT_OUT = '';

/** A film's file, line by line. */
async function linesOf(film: URL): Promise<readonly string[]> {
	return (await readFile(film, 'utf8')).split(NEW_LINE);
}

/** A film's file whole, as it shot the film, its comments left out, the marks of its regions among them. */
export async function sourceOf(film: URL): Promise<string> {
	const source = await readFile(film, 'utf8');
	return source.replace(DOCUMENTATION, LEFT_OUT).replace(LINE_COMMENT, LEFT_OUT);
}

/** The regions a film's file marks, each by its name. */
export async function regionsOf(film: URL): Promise<ReadonlyMap<string, string>> {
	const lines = await linesOf(film);
	const regions = lines.map((line, place) => regionAt(line, lines.slice(place + NEXT_LINE))).filter(isRegion);
	return new Map(regions.map((region) => [region.name, region.text]));
}

/** A region's lines, by its name; a name the file marks no region by is refused. */
export function regionNamed(regions: ReadonlyMap<string, string>, name: string): string {
	const text = regions.get(name);
	if (text === undefined) throw new Error(`the film marks no region "${name}": mark it with // #region ${name}`);
	return text;
}

/** The region a line starts, its lines those after it up to its end; none where the line starts none. */
function regionAt(line: string, after: readonly string[]): Region | null {
	const name = REGION_START.exec(line)?.groups?.['name'];
	return name === undefined ? null : { name, text: linesUntilTheEnd(after).join(NEW_LINE) };
}

function linesUntilTheEnd(lines: readonly string[]): readonly string[] {
	const end = lines.findIndex((line) => REGION_END.test(line));
	return end === NOT_FOUND ? lines : lines.slice(THE_BEGINNING, end);
}

function isRegion(region: Region | null): region is Region {
	return region !== null;
}
