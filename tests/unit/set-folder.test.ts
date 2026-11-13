// A film's set kept on the disk: read back as it was written, left as it was by a set begun and let go unwritten, and
// refused where what it holds is not whole
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { SetFolderOnDisk } from '../../src/adapters/set-folder.ts';
import { FilmError } from '../../src/domain/errors.ts';
import type { SetNoted } from '../../src/studio/ports.ts';

const A_PICTURE = new Uint8Array([1]);
const SET: SetNoted = {
	screen: { width: 600, height: 400 },
	sharpness: 3,
	targets: ['#refresh'],
	states: [
		{
			name: 'opened',
			targets: [
				{
					target: '#refresh',
					boxes: [{ left: 1, top: 2, width: 3, height: 4 }],
					ground: '#ffffffff',
					corners: { topLeft: 4, topRight: 4, bottomRight: 2, bottomLeft: 2 }
				}
			]
		}
	]
};

/** A set's folder in a folder of its own, and that folder. */
async function setFolder(): Promise<{ readonly folder: SetFolderOnDisk; readonly beside: string }> {
	const beside = await mkdtemp(join(tmpdir(), 'livereel-set-folder-'));
	return { folder: new SetFolderOnDisk(join(beside, 'film-small.set')), beside };
}

/** A set shot whole into a folder. */
async function written(folder: SetFolderOnDisk, set: SetNoted): Promise<void> {
	await using taking = await folder.taking();
	for (const state of set.states) await taking.keep(state.name, A_PICTURE);
	await taking.write(set);
}

test('a set kept on the disk is read back as it was written, each picture by its address; one shot after it and let go unwritten leaves it as it was, and nothing beside it', async () => {
	const { folder, beside } = await setFolder();
	await written(folder, SET);
	{
		await using taking = await folder.taking();
		await taking.keep('refreshed', A_PICTURE);
	}
	const read = await folder.read();
	expect([read, await readdir(beside)]).toEqual([
		{
			...SET,
			states: [{ ...SET.states[0], picture: expect.stringMatching(/^file:\/\/.*\/film-small\.set\/opened\.png$/) }]
		},
		['film-small.set']
	]);
});

test('a set shot again takes the place of the one shot before, and nothing beside it', async () => {
	const { folder, beside } = await setFolder();
	await written(folder, SET);
	await written(folder, { ...SET, sharpness: 2 });
	expect([(await folder.read()).sharpness, await readdir(beside), await readdir(folder.folder)]).toEqual([
		2,
		['film-small.set'],
		['opened.png', 'set.json']
	]);
});

test('a set read off the disk is refused where none is shot, its file is no JSON or in no form of a set, or a picture of a state is not there', async () => {
	const folders = await Promise.all([setFolder(), setFolder(), setFolder(), setFolder()]);
	const [none, notJson, notASet, noPicture] = folders.map(({ folder }) => folder);
	await written(notJson!, SET);
	await writeFile(join(notJson!.folder, 'set.json'), '{ "screen":');
	await written(notASet!, SET);
	await writeFile(join(notASet!.folder, 'set.json'), JSON.stringify({ ...SET, sharpness: 0 }));
	await written(noPicture!, SET);
	await rm(join(noPicture!.folder, 'opened.png'));
	const refused = await Promise.all([none, notJson, notASet, noPicture].map((folder) => folder!.read().catch(String)));
	expect(refused).toEqual(
		[
			`the film's set is not shot: \`livereel set\` shoots it into ${none!.folder}`,
			`the set in ${notJson!.folder} is no JSON (Unexpected end of JSON input): shoot it again`,
			`the set in ${notASet!.folder}'s sharpness is 0: it is how many of a picture's pixels a page's pixel takes, more than 0`,
			`the set in ${noPicture!.folder} has no picture of its state opened: shoot it again`
		].map((said) => String(new FilmError(said)))
	);
});
