/**
 * The code a film shows of itself: the regions of its own file it marks, `// #region name` to `// #endregion`, so the
 * lines on the screen are the lines that shot it. A film reads its regions once, as it is loaded, and hands one to
 * `code.show`, which sets it as an editor would.
 */
import { readFile } from 'node:fs/promises';

/** The regions a film's file marks, each by its name. */
export class Regions {
	readonly texts: ReadonlyMap<string, string>;

	constructor(texts: ReadonlyMap<string, string>) {
		this.texts = texts;
	}

	/** A region's lines, as the file has them; a name the file marks no region by is refused. */
	named(name: string): string {
		const text = this.texts.get(name);
		if (text === undefined) throw new Error(`the film marks no region "${name}": mark it with // #region ${name}`);
		return text;
	}
}

// Where a region starts and ends in a film's file, its name after the start
const REGION_START = /^\s*\/\/ #region (?<name>[\w-]+)\s*$/;
const REGION_END = /^\s*\/\/ #endregion\s*$/;
// The line after a region's start, a region with no end, and where a file's lines begin
const NEXT_LINE = 1;
const NOT_FOUND = -1;
const THE_BEGINNING = 0;

/** The regions a film's file marks, in the order it gives them. */
export async function regionsOf(film: URL): Promise<Regions> {
	const lines = (await readFile(film, 'utf8')).split('\n');
	return new Regions(new Map(lines.flatMap((_line, place) => regionAt(lines, place))));
}

/** The region a line starts, by its name; none where the line starts none. */
function regionAt(lines: readonly string[], place: number): [string, string][] {
	const name = REGION_START.exec(lines[place] ?? '')?.groups?.['name'];
	return name === undefined ? [] : [[name, linesUntilTheEnd(lines.slice(place + NEXT_LINE)).join('\n')]];
}

function linesUntilTheEnd(lines: readonly string[]): readonly string[] {
	const end = lines.findIndex((line) => REGION_END.test(line));
	return end === NOT_FOUND ? lines : lines.slice(THE_BEGINNING, end);
}
