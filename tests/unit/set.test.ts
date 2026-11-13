// A film's set shot against an app, a browser and a folder that keep what they are asked, in order; and a film shot
// on its set, against a browser that keeps what it was opened on
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { SQUARE_CORNERS, type Size } from '../../src/domain/geometry.ts';
import { defineFilm } from '../../src/direction/film.ts';
import type { FilmInFormat } from '../../src/direction/film.ts';
import type { SetContext } from '../../src/direction/set.ts';
import type {
	Browser,
	Filmed,
	Opened,
	OpenedForSet,
	PageServer,
	ServedPage,
	SetBrowser,
	SetFolder,
	SetNoted,
	SetShot,
	SetTaking,
	StateTaken,
	TargetShot
} from '../../src/studio/ports.ts';
import { shootSet } from '../../src/studio/set.ts';
import { shoot } from '../../src/studio/shoot.ts';
import { FootageOf, PageOfBoxes, PicturedStageThatKeeps, SMALL, TrackThatKeeps, openedOn } from './fakes.ts';

// The one target the set shoots, where it stands in every state, and the ground behind it
const REFRESH = '#refresh';
const WHERE = { left: 10, top: 20, width: 30, height: 40 };
const GROUND = '#ffffffff';
const A_PICTURE = new Uint8Array([1]);
// A set's sharpness where the film names none
const SHARPNESS = 3;

/** How a set shot before stands: the screen it was shot on, its targets, and how sharp. */
interface ShotAs {
	readonly screen: Size;
	readonly targets: readonly string[];
	readonly sharpness: number;
}

const AS_THE_FILM_NAMES_IT: ShotAs = { screen: SMALL.screen, targets: [REFRESH], sharpness: SHARPNESS };

/** The app as the browser opens it for its set: each state taken, said, with the one target where it stands. */
class AppOpened implements OpenedForSet {
	// No unit test acts on a real app
	readonly act = { page: undefined as never, motion: undefined as never, set: undefined as never };
	readonly happened: string[];

	constructor(happened: string[]) {
		this.happened = happened;
	}

	taken(name: string, targets: readonly string[]): Promise<StateTaken> {
		this.happened.push(`taken ${name}`);
		return Promise.resolve({ name, picture: A_PICTURE, targets: targets.map((target) => shotOf(target)) });
	}

	[Symbol.asyncDispose](): Promise<void> {
		this.happened.push('closed');
		return Promise.resolve();
	}
}

/** A set being shot that says each picture kept, keeps each set written, and says when it is let go. */
class TakingThatKeeps implements SetTaking {
	readonly happened: string[];
	readonly written: SetNoted[];

	constructor(happened: string[], written: SetNoted[]) {
		this.happened = happened;
		this.written = written;
	}

	keep(name: string): Promise<void> {
		this.happened.push(`kept ${name}`);
		return Promise.resolve();
	}

	write(set: SetNoted): Promise<void> {
		this.happened.push('written');
		this.written.push(set);
		return Promise.resolve();
	}

	[Symbol.asyncDispose](): Promise<void> {
		this.happened.push('let go');
		return Promise.resolve();
	}
}

/** A folder holding a set shot before as given, and keeping each set shot into it. */
class FolderThatKeeps implements SetFolder {
	readonly happened: string[];
	readonly written: SetNoted[] = [];
	readonly shotAs: ShotAs;

	constructor(happened: string[], shotAs: ShotAs = AS_THE_FILM_NAMES_IT) {
		this.happened = happened;
		this.shotAs = shotAs;
	}

	read(): Promise<SetShot> {
		const states = [{ name: 'opened', picture: 'file:///set/opened.png', targets: [shotOf(REFRESH)] }] as const;
		return Promise.resolve({ ...this.shotAs, states });
	}

	taking(): Promise<SetTaking> {
		return Promise.resolve(new TakingThatKeeps(this.happened, this.written));
	}
}

/** A server that serves at once, and says it served and stopped. */
class ServerThatSays implements PageServer {
	readonly happened: string[];

	constructor(happened: string[]) {
		this.happened = happened;
	}

	serve(): Promise<ServedPage> {
		this.happened.push('served');
		return Promise.resolve({
			address: 'http://127.0.0.1:8770/',
			[Symbol.asyncDispose]: () => Promise.resolve(void this.happened.push('server stopped'))
		});
	}
}

/** A browser that opens the app for its set, or a film's page on a stage, saying what it opened a take on. */
class BrowserThatSays implements Browser, SetBrowser {
	readonly happened: string[];

	constructor(happened: string[]) {
		this.happened = happened;
	}

	openForSet(): Promise<OpenedForSet> {
		return Promise.resolve(new AppOpened(this.happened));
	}

	open(_setting: unknown, filmed: Filmed): Promise<Opened> {
		this.happened.push(`opened on ${filmed.kind}`);
		return Promise.resolve(openedOn(new PageOfBoxes(new Map()), new PicturedStageThatKeeps()));
	}
}

function shotOf(target: string): TargetShot {
	return { target, boxes: [WHERE], ground: GROUND, rounding: SQUARE_CORNERS };
}

/** A film written with these, its set's scenario as given, made ready by saying so. */
function filmWith(happened: string[], written: object): FilmInFormat {
	return defineFilm({
		formats: { small: SMALL },
		address: 'http://127.0.0.1:8770/',
		serve: 'node app.ts',
		ready: () => Promise.resolve(void happened.push('ready')),
		steps: () => [],
		...written
	} as never).formats.get('small')!;
}

function filmOnSet(happened: string[], scenario: (context: SetContext) => Promise<void>): FilmInFormat {
	return filmWith(happened, { set: { scenario, targets: [REFRESH] } });
}

function setShootingOf(happened: string[], folder: FolderThatKeeps) {
	return { server: new ServerThatSays(happened), browser: new BrowserThatSays(happened), folder };
}

/** A film's set shot, refused or not: what it said, and all that happened. */
async function setShotFor(film: (happened: string[]) => FilmInFormat) {
	const happened: string[] = [];
	const folder = new FolderThatKeeps(happened);
	const said = await shootSet(film(happened), setShootingOf(happened, folder)).catch(String);
	return { said, happened, written: folder.written };
}

test("a film's set is shot on the app its command serves, made ready first: each state its scenario marks taken with the set's targets and its picture kept, in order, the set written whole once the scenario is done, then let go, the browser closed and the server stopped", async () => {
	const shot = await setShotFor((happened) =>
		filmOnSet(happened, async ({ state }) => {
			await state('opened');
			await state('refreshed');
		})
	);
	expect(shot).toEqual({
		said: 2,
		happened: [
			'served',
			'ready',
			'taken opened',
			'kept opened',
			'taken refreshed',
			'kept refreshed',
			'written',
			'let go',
			'closed',
			'server stopped'
		],
		written: [
			{
				screen: SMALL.screen,
				sharpness: SHARPNESS,
				targets: [REFRESH],
				states: [
					{ name: 'opened', targets: [shotOf(REFRESH)] },
					{ name: 'refreshed', targets: [shotOf(REFRESH)] }
				]
			}
		]
	});
});

test("a set's states are written in the order its scenario marked them, though it waits on none of them", async () => {
	const shot = await setShotFor((happened) =>
		filmOnSet(happened, ({ state }) => {
			void state('opened');
			void state('refreshed');
			return Promise.resolve();
		})
	);
	expect(shot.written.map((set) => set.states.map((state) => state.name))).toEqual([['opened', 'refreshed']]);
});

test('a film with no set, a scenario that marks a state by a name that names no file, one name twice, no state at all, or that fails is refused, writes no set, and lets go of all it opened', async () => {
	const shots = await Promise.all([
		setShotFor((happened) => filmWith(happened, {})),
		setShotFor((happened) => filmOnSet(happened, ({ state }) => state('../up'))),
		setShotFor((happened) =>
			filmOnSet(happened, async ({ state }) => {
				await state('opened');
				await state('opened');
			})
		),
		setShotFor((happened) => filmOnSet(happened, () => Promise.resolve())),
		setShotFor((happened) => filmOnSet(happened, () => Promise.reject(new Error('the app is down'))))
	]);
	const opened = ['served', 'ready'];
	const letGo = ['let go', 'closed', 'server stopped'];
	expect(shots).toEqual([
		{
			said: String(new FilmError('the film names no set to shoot: give it set: { scenario, targets }')),
			happened: [],
			written: []
		},
		{
			said: String(
				new FilmError(
					`the set's state is "../up": it is a state's name: letters, digits, dashes and underscores, from a letter or digit, as 'refreshed' or 'typed-3'`
				)
			),
			happened: [...opened, ...letGo],
			written: []
		},
		{
			said: String(new FilmError(`the set's scenario marks the state "opened" twice: give each its own name`)),
			happened: [...opened, 'taken opened', 'kept opened', ...letGo],
			written: []
		},
		{
			said: String(
				new FilmError("the set's scenario marked no state: mark each the film shows, with context.state(name)")
			),
			happened: [...opened, ...letGo],
			written: []
		},
		{
			said: String(new FilmError("the film's set's scenario failed: the app is down")),
			happened: [...opened, ...letGo],
			written: []
		}
	]);
});

test('a film shot on its set opens the browser on the set as it was shot, with no server started and no wait for the page; a set shot on another screen, with other targets, or as sharp as the film no longer names, is refused before the browser opens', async () => {
	const happened: string[] = [];
	const film = filmOnSet(happened, () => Promise.resolve());
	const shooting = {
		server: new ServerThatSays(happened),
		browser: new BrowserThatSays(happened),
		footage: new FootageOf([0]),
		track: new TrackThatKeeps(),
		quality: { sharpness: 1, blurred: false, framesHanded: 'scaled' }
	};
	const shotAs = (changed: Partial<ShotAs>) => ({
		...shooting,
		set: new FolderThatKeeps(happened, { ...AS_THE_FILM_NAMES_IT, ...changed })
	});
	await shoot(film, shotAs({}));
	const refused = await Promise.all([
		shoot(film, shotAs({ screen: { width: 800, height: 400 } })).catch(String),
		shoot(film, shotAs({ targets: ['#refresh', '#visitors'] })).catch(String),
		shoot(film, shotAs({ targets: [] })).catch(String),
		shoot(film, shotAs({ sharpness: 2 })).catch(String)
	]);
	expect([happened, refused]).toEqual([
		['opened on set'],
		[
			"the film's set was shot on a screen of 800 × 400, and its small format's is 600 × 400: shoot the set again, with `livereel set`",
			"the film's set was shot with the targets #refresh, #visitors, and the film names #refresh: shoot the set again, with `livereel set`",
			"the film's set was shot with the targets none, and the film names #refresh: shoot the set again, with `livereel set`",
			"the film's set was shot at a sharpness of 2, and the film names 3: shoot the set again, with `livereel set`"
		].map((said) => String(new FilmError(said)))
	]);
});
