/**
 * The code a film shows of itself: the regions of its own file it marks, `// #region name` to `// #endregion`, so the
 * lines on the screen are the lines that shot it. A film reads its regions once, as it is loaded, and hands their
 * lines to `code.show`, which sets them as an editor would.
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

/** The regions a film's file marks, each by its name. */
export async function regionsOf(film: URL): Promise<ReadonlyMap<string, string>> {
	const lines = (await readFile(film, 'utf8')).split('\n');
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
	return name === undefined ? null : { name, text: linesUntilTheEnd(after).join('\n') };
}

function linesUntilTheEnd(lines: readonly string[]): readonly string[] {
	const end = lines.findIndex((line) => REGION_END.test(line));
	return end === NOT_FOUND ? lines : lines.slice(THE_BEGINNING, end);
}

function isRegion(region: Region | null): region is Region {
	return region !== null;
}
