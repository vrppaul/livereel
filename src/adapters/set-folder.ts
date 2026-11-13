/**
 * A film's set kept on the disk, a folder for each of the film's formats: a picture of each state, a PNG named by the
 * state, and `set.json`, the set as it was written. A set is shot into a folder beside its own and put in its place
 * only once it is written whole, so a scenario that fails leaves the set shot before as it was, and nothing beside it.
 * What is read is checked where it enters, its pictures there too, as the files are a person's to change.
 */
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FilmError } from '../domain/errors.ts';
import { A_BOX, type Corners, type Size } from '../domain/geometry.ts';
import {
	A_COLOUR,
	A_PIXELS,
	A_SELECTOR,
	A_SHARPNESS,
	A_SIZE,
	A_STRING,
	EitherOf,
	type Form,
	ListOf,
	OfForm,
	SELECTORS,
	assertWritten,
	needed
} from '../domain/handed.ts';
import { A_STATE_NAME } from '../direction/set.ts';
import type { SetFolder, SetNoted, SetShot, SetTaking, StateNoted, StateShot, TargetShot } from '../studio/ports.ts';

// The set's own file in its folder, its pictures' kind, and the names of the folder a set is shot into and the one the
// set shot before is set aside in, after its own
const SET_FILE = 'set.json';
const PICTURE_SUFFIX = '.png';
const TAKING_SUFFIX = '.taking';
const ASIDE_SUFFIX = '.aside';
// What Node says of a file that is not there
const NO_SUCH_FILE = 'ENOENT';
// A folder taken whole, what is in it with it, and one the set is shot into made with those it stands in
const WHOLE = { recursive: true, force: true } as const;
const WITH_ITS_FOLDERS = { recursive: true } as const;
const CORNERS_FORM: Form<Corners> = {
	topLeft: needed(A_PIXELS),
	topRight: needed(A_PIXELS),
	bottomRight: needed(A_PIXELS),
	bottomLeft: needed(A_PIXELS)
};
const TARGET_FORM: Form<TargetShot> = {
	target: needed(A_SELECTOR),
	boxes: needed(new ListOf(A_BOX, 'a list of boxes')),
	ground: needed(A_COLOUR),
	rounding: needed(
		new EitherOf<Corners, { readonly unread: string }>(
			new OfForm(CORNERS_FORM, 'corners: { topLeft, topRight, bottomRight, bottomLeft }'),
			new OfForm({ unread: needed(A_STRING) }, 'corners, or a radius no length reads: { unread }')
		)
	)
};
const STATE_FORM: Form<StateNoted> = {
	name: needed(A_STATE_NAME),
	targets: needed(
		new ListOf(new OfForm(TARGET_FORM, 'a target as shot: { target, boxes, ground, rounding }'), 'a list')
	)
};
const SET_FILE_FORM: Form<SetNoted> = {
	screen: needed(new OfForm<Size>({ width: needed(A_SIZE), height: needed(A_SIZE) }, 'a size: { width, height }')),
	sharpness: needed(A_SHARPNESS),
	targets: needed(SELECTORS),
	states: needed(new ListOf(new OfForm(STATE_FORM, 'a state: { name, targets }'), 'a list of states'))
};

export class SetFolderOnDisk implements SetFolder {
	readonly folder: string;

	constructor(folder: string) {
		this.folder = folder;
	}

	async read(): Promise<SetShot> {
		const noted = parsedOf(await this.written(), this.folder);
		assertWritten(noted, SET_FILE_FORM, `the set in ${this.folder}`);
		const states: StateShot[] = [];
		for (const state of noted.states) states.push({ ...state, picture: await this.pictureAddressOf(state.name) });
		const [first, ...others] = states;
		if (first === undefined) throw new FilmError(`the set in ${this.folder} has no state: shoot it again`);
		return { ...noted, states: [first, ...others] };
	}

	/** A set begun in a folder beside this one, made anew, so nothing a set shot before left there is in it. */
	async taking(): Promise<SetTaking> {
		const taking = `${this.folder}${TAKING_SUFFIX}`;
		await rm(taking, WHOLE);
		await mkdir(taking, WITH_ITS_FOLDERS);
		return new SetTakingOnDisk(this.folder, taking);
	}

	/** The set's own file as written; refused where no set is shot there. */
	private async written(): Promise<string> {
		try {
			return await readFile(join(this.folder, SET_FILE), 'utf8');
		} catch (fault) {
			if (!isMissing(fault)) throw fault;
			throw new FilmError(`the film's set is not shot: \`livereel set\` shoots it into ${this.folder}`, {
				cause: fault
			});
		}
	}

	/** The address of a state's picture; refused where the picture is not there. */
	private async pictureAddressOf(name: string): Promise<string> {
		const picture = join(this.folder, `${name}${PICTURE_SUFFIX}`);
		try {
			await access(picture);
		} catch (fault) {
			if (!isMissing(fault)) throw fault;
			throw new FilmError(`the set in ${this.folder} has no picture of its state ${name}: shoot it again`, {
				cause: fault
			});
		}
		return pathToFileURL(picture).href;
	}
}

/**
 * A set being shot into a folder of its own beside the set's: written whole, the set shot before is set aside, this
 * one put in its place, and the one set aside removed, so the set's place never holds half a set; let go, the folder
 * it was shot into is removed, whatever it holds.
 */
class SetTakingOnDisk implements SetTaking {
	readonly folder: string;
	readonly taking: string;

	constructor(folder: string, taking: string) {
		this.folder = folder;
		this.taking = taking;
	}

	keep(name: string, picture: Uint8Array): Promise<void> {
		return writeFile(join(this.taking, `${name}${PICTURE_SUFFIX}`), picture);
	}

	async write(set: SetNoted): Promise<void> {
		const aside = `${this.folder}${ASIDE_SUFFIX}`;
		await writeFile(join(this.taking, SET_FILE), JSON.stringify(set));
		await rm(aside, WHOLE);
		await movedWhereThere(this.folder, aside);
		await rename(this.taking, this.folder);
		await rm(aside, WHOLE);
	}

	[Symbol.asyncDispose](): Promise<void> {
		return rm(this.taking, WHOLE);
	}
}

/** A folder moved to another name, where it is there: a set's place holds none before its first set. */
async function movedWhereThere(from: string, to: string): Promise<void> {
	try {
		await rename(from, to);
	} catch (fault) {
		if (!isMissing(fault)) throw fault;
	}
}

/** Whether a fault of Node's file system says a file or folder is not there. */
function isMissing(fault: unknown): boolean {
	return fault instanceof Error && 'code' in fault && fault.code === NO_SUCH_FILE;
}

/** A set's own file read as JSON; refused, naming its folder, where it is none. */
function parsedOf(written: string, folder: string): unknown {
	try {
		return JSON.parse(written);
	} catch (fault) {
		if (!(fault instanceof SyntaxError)) throw fault;
		throw new FilmError(`the set in ${folder} is no JSON (${fault.message}): shoot it again`, { cause: fault });
	}
}
