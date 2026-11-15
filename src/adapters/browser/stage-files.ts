/**
 * The package's stage files, read to be answered by an address of livereel's own, where the stage is served rather than
 * opened from the disk: inside the app, on its own origin (`inside.ts`), and drawn as a room, on an origin of its own
 * (`room.ts`). Each is read once, as the stage is opened, with its kind of content.
 */
import { readFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';
import { STAGE_FOLDER } from './stage.ts';

/** A file as an address of livereel's own answers it: its kind of content, and its bytes. */
export interface ServedFile {
	readonly type: string;
	readonly body: Buffer;
}

// The statuses a file is answered with: sent, or none by the name asked
export const FILE_SENT = 200;
export const NO_SUCH_FILE = 404;
// The kind of content of each file the stage is made of, by its extension
const CONTENT_TYPES: ReadonlyMap<string, string> = new Map([
	['.html', 'text/html; charset=utf-8'],
	['.css', 'text/css; charset=utf-8'],
	['.js', 'text/javascript; charset=utf-8']
]);

/** The package's stage files, by name: those of a kind of content a stage file is of. */
export async function stageFiles(): Promise<ReadonlyMap<string, ServedFile>> {
	return filesNamed(STAGE_FOLDER, await readdir(STAGE_FOLDER));
}

/** The files of a folder by these names, read, by name: those of a kind of content a stage file is of. */
export async function filesNamed(folder: URL, names: readonly string[]): Promise<ReadonlyMap<string, ServedFile>> {
	return new Map(await Promise.all(names.flatMap((name) => fileNamed(folder, name))));
}

/** A file of a folder, read, by its name; none where its kind of content is not one a stage file is of. */
function fileNamed(folder: URL, name: string): Promise<readonly [string, ServedFile]>[] {
	const type = CONTENT_TYPES.get(extname(name));
	return type === undefined ? [] : [fileRead(folder, name, type)];
}

async function fileRead(folder: URL, name: string, type: string): Promise<readonly [string, ServedFile]> {
	return [name, { type, body: await readFile(new URL(name, folder)) }];
}
