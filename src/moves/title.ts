/**
 * Titles: words that come up one after another over the whole frame, on the film's ground, or in a place the film
 * names (`src/domain/place.ts`), in place of any title on the screen, and go. Beside a window, the camera frames the
 * page into a window on the side across (`camera.onto(selector, { side })`).
 */
import type { Box } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place, wordsPlaced } from '../domain/place.ts';
import { linear } from '../domain/time.ts';
import { type Change, type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** Where a title stands: `at` a place on the frame, or over the whole of it, on its ground, where none is named. */
export interface TitleScript extends TimingScript {
	readonly at?: Place;
}

const TITLE_FORM: Form<TitleScript> = { at: A_PLACE, ...TIMING_FORM };

/**
 * A title coming up word by word, over the whole frame its ground first, or in its place; its words come up at an
 * even pace unless the film names a curve.
 */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, 'title.show');
	const said = saidOf(text);
	const place = script.at ?? null;
	return {
		part: 'title',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => showing(said, place === null ? null : wordsPlaced(beginning.format, place))
	};
}

/** The title on the screen going, and its ground with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'title.hide');
	return { part: 'title', timing: timingOf(script), begin: (beginning) => going('title', beginning) };
}

function showing(said: Said, box: Box | null): Change {
	return propChange('title', (progress) => ({ ...said, box, shown: progress, gone: 0 }));
}
