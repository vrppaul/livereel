/**
 * The stage and its frame, watched as a film goes, so a frame left on no page, or a stage gone, is said by why: as
 * the frame opens, and whenever the take asks (`src/studio/take.ts`), rather than shot on Chrome's error page or
 * failing at something that error does not name.
 *
 * Chrome shows a page that refuses to be framed and one it could not reach alike, on an error page of its own. The
 * answer the frame's page came with tells them apart, and names the page that refused, past any redirect: it is the
 * frame's own answer, as the frame asked for it, not one asked for again. On the stage apart a click may take the
 * stage itself away, as a link to `_top` does: Chrome stops a page of another site moving the page it is framed in
 * only without a click (measured 2026-10-27). A page in a tab of its own refuses no frame and takes no stage away: it
 * is watched only for a page Chrome could not reach (`TabWatch`).
 */
import type { Frame, Page, Request, Response } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import type { StagePlace } from '../../direction/film.ts';
import { refusalAmong } from './refusals.ts';

/** Where the frame's page last went: the address asked for, and the answer it came with, once one came. */
interface Going {
	readonly address: string;
	readonly answer: Response | null;
}

// Where Chrome leaves a frame whose page it could not reach, or would not show in a frame
const NOT_SHOWN = 'chrome-error:';
// What a film whose page refuses to be framed is told, by where its stage stands
const REFUSED_ON: { readonly [Place in StagePlace]: string } = {
	apart: 'film it with stage: "inside", where livereel takes the refusal off',
	inside: 'the stage inside the app could not take it off'
};
const STAGE_TAKEN =
	'a click took the page the stage stands in away from the stage, as a link to `_top` does: film it with ' +
	'stage: "inside", where the frame is sandboxed against it';

export class FrameWatch {
	readonly stagePage: Page;
	readonly stageAddress: string;
	readonly place: StagePlace;
	private going: Going;

	/** The stage watched from where it stands now, its frame about to go to the film's address. */
	constructor(stagePage: Page, place: StagePlace, address: string) {
		this.stagePage = stagePage;
		this.stageAddress = stagePage.url();
		this.place = place;
		this.going = { address, answer: null };
		stagePage.on('request', (asked) => this.asked(asked));
		stagePage.on('response', (answer) => this.answered(answer));
	}

	/** Why the stage, or the page in its frame, is no longer there, where one is not; none where both are. */
	async absence(filmed: Frame): Promise<FilmError | undefined> {
		if (this.stagePage.url() !== this.stageAddress) return new FilmError(STAGE_TAKEN);
		if (!filmed.url().startsWith(NOT_SHOWN)) return undefined;
		return notShownFault(this.going, this.place);
	}

	private asked(asked: Request): void {
		if (isGoingInTheFrame(this.stagePage, asked)) this.going = { address: asked.url(), answer: null };
	}

	private answered(answer: Response): void {
		if (isGoingInTheFrame(this.stagePage, answer.request())) this.going = { address: answer.url(), answer };
	}
}

/** A page in a tab of its own, watched for Chrome's error page, by the address it last went to. */
export class TabWatch {
	readonly tab: Page;
	private address: string;

	/** The tab watched from its first address on. */
	constructor(tab: Page, address: string) {
		this.tab = tab;
		this.address = address;
		tab.on('request', (asked) => this.asked(asked));
	}

	/** Why the tab shows no page, where Chrome could not reach the one it went to; none where it shows one. */
	absence(): FilmError | undefined {
		if (!this.tab.url().startsWith(NOT_SHOWN)) return undefined;
		return notReached(this.address);
	}

	private asked(asked: Request): void {
		if (asked.isNavigationRequest() && asked.frame() === this.tab.mainFrame()) this.address = asked.url();
	}
}

/** A page Chrome could not reach, refused by its address. */
export function notReached(address: string, options?: ErrorOptions): FilmError {
	return new FilmError(`the page at ${address} could not be reached`, options);
}

/** Whether a request takes the stage's own frame to a page: not the stage, nor a frame within the filmed page. */
function isGoingInTheFrame(stagePage: Page, asked: Request): boolean {
	return asked.isNavigationRequest() && asked.frame().parentFrame() === stagePage.mainFrame();
}

/** Why the frame shows no page: its page refuses to be framed, its refusal named, or it could not be reached. */
async function notShownFault(going: Going, place: StagePlace): Promise<FilmError> {
	if (going.answer === null) return notReached(going.address);
	const refusal = refusalAmong(await going.answer.headersArray());
	if (refusal === undefined) {
		return new FilmError(`the page at ${going.address} answered, but Chrome would not show it in a frame`);
	}
	return new FilmError(
		`the page at ${going.address} refuses to be framed (${refusal.name}: ${refusal.value}): ${REFUSED_ON[place]}`
	);
}
