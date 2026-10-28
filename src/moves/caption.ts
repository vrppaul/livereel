/** Captions: words that come up one after another at the frame's foot, in place of any on the screen, and go. */
import { assertKind, assertWritten } from '../domain/handed.ts';
import { linear } from '../domain/time.ts';
import { type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { A_WORDING, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** A caption coming up word by word; its words come up at an even pace unless the film names a curve. */
export function show(text: Wording, script: TimingScript = {}): Move {
	assertKind(text, A_WORDING, "caption.show's text");
	assertWritten(script, TIMING_FORM, 'caption.show');
	const said = saidOf(text);
	return {
		part: 'caption',
		timing: timingOf({ ease: linear, ...script }),
		begin: () => propChange('caption', (progress) => ({ ...said, shown: progress, gone: 0 }))
	};
}

/** The caption on the screen going; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'caption.hide');
	return { part: 'caption', timing: timingOf(script), begin: (beginning) => going('caption', beginning) };
}
