/**
 * Titles: words that come up one after another over the whole frame, or over a half of it, on the film's ground, in
 * place of any title on the screen, and go. Over a half, the camera frames the page into the other one
 * (`camera.onto(selector, { half })`).
 */
import { A_FRAME_HALF, type FrameHalf } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { linear } from '../domain/time.ts';
import { type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { A_WORDING, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** Where a title stands: over a `half` of the frame, or over the whole of it where none is named. */
export interface TitleScript extends TimingScript {
	readonly half?: FrameHalf;
}

const TITLE_FORM: Form<TitleScript> = { half: A_FRAME_HALF, ...TIMING_FORM };

/** A title coming up word by word, its ground first; its words come up at an even pace unless the film names a curve. */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, 'title.show');
	const said = saidOf(text);
	const half = script.half ?? null;
	return {
		part: 'title',
		timing: timingOf({ ease: linear, ...script }),
		begin: () => propChange('title', (progress) => ({ ...said, half, shown: progress, gone: 0 }))
	};
}

/** The title on the screen going, and its ground with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'title.hide');
	return { part: 'title', timing: timingOf(script), begin: (beginning) => going('title', beginning) };
}
