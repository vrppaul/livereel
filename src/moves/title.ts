/**
 * Titles: words that come up one after another over the whole frame, on the film's ground, or on a side of it beside
 * the page's window, in place of any title on the screen, and go. Beside a window, the camera frames the page into a
 * window on the side across (`camera.onto(selector, { side })`).
 */
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_FRAME_SIDE, type Beside, type FrameSide, besideOn } from '../domain/split.ts';
import { linear } from '../domain/time.ts';
import { type Change, type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** Where a title stands: on a `side` of the frame, beside the page's window, or over the whole of it where none is named. */
export interface TitleScript extends TimingScript {
	readonly side?: FrameSide;
}

const TITLE_FORM: Form<TitleScript> = { side: A_FRAME_SIDE, ...TIMING_FORM };

/**
 * A title coming up word by word, over the whole frame its ground first; its words come up at an even pace unless the
 * film names a curve.
 */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, 'title.show');
	const said = saidOf(text);
	const side = script.side ?? null;
	return {
		part: 'title',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => showing(said, side === null ? null : besideOn(beginning.format, side))
	};
}

/** The title on the screen going, and its ground with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'title.hide');
	return { part: 'title', timing: timingOf(script), begin: (beginning) => going('title', beginning) };
}

function showing(said: Said, beside: Beside | null): Change {
	return propChange('title', (progress) => ({ ...said, beside, shown: progress, gone: 0 }));
}
