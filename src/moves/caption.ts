/** Captions: words that come up one after another, in place of any on the screen, and go. */
import { linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	type TimingScript,
	present,
	propChange,
	timingOf
} from '../direction/move.ts';
import type { Caption } from '../props/caption.ts';

/** A caption coming up word by word; its words come up at an even pace unless the film names a curve. */
export function show(text: string, script: TimingScript = {}): Move {
	return { part: 'caption', timing: timingOf({ ease: linear, ...script }), begin: () => showing(text) };
}

/** The caption on the screen going; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	return { part: 'caption', timing: timingOf(script), begin: going };
}

function showing(text: string): Change {
	return propChange('caption', (progress) => ({ text, shown: progress, gone: 0 }));
}

function going(beginning: Beginning): Change {
	const caption = present(beginning, 'caption', 'a caption is hidden, but none is on the screen');
	return propChange('caption', (progress) => goneAt(caption, progress));
}

function goneAt(caption: Caption, progress: number): Caption | null {
	if (progress >= 1) return null;
	return { ...caption, gone: progress };
}
