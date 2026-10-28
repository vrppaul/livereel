/**
 * Callouts: words on a card beside a block of the page, pointing at it, in place of any callout shown, and going. The
 * block is read as the move's share begins, what the screen shows of it, as the camera and the cursor read it; one the
 * screen shows none of is refused there.
 */
import { A_SELECTOR, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	propChange,
	shownPart,
	timingOf
} from '../direction/move.ts';
import { A_BLOCK_SIDE, type BlockSide } from '../props/callout.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** The side of the block a callout stands on: `above` where none is named. */
export interface CalloutScript extends TimingScript {
	readonly side?: BlockSide;
}

const CALLOUT_FORM: Form<CalloutScript> = { side: A_BLOCK_SIDE, ...TIMING_FORM };
const SIDE_WHERE_NONE_IS_NAMED: BlockSide = 'above';
// A callout points at one block: the first a selector matches
const THE_FIRST = 1;

/** A callout coming up beside the block a selector matches, its card first, then its words one after another. */
export function show(target: string, text: Wording, script: CalloutScript = {}): Move {
	assertKind(target, A_SELECTOR, "callout.show's selector");
	assertKind(text, A_WORDING, "callout.show's text");
	assertWritten(script, CALLOUT_FORM, 'callout.show');
	const said = saidOf(text);
	const side = script.side ?? SIDE_WHERE_NONE_IS_NAMED;
	return {
		part: 'callout',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => pointing(beginning, target, said, side)
	};
}

/** The callout on the screen going; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'callout.hide');
	return { part: 'callout', timing: timingOf(script), begin: (beginning) => going('callout', beginning) };
}

async function pointing(beginning: Beginning, target: string, said: Said, side: BlockSide): Promise<Change> {
	const box = await shownPart(beginning, target, THE_FIRST, 'callout.show');
	return propChange('callout', (progress) => ({ ...said, box, side, shown: progress, gone: 0 }));
}
