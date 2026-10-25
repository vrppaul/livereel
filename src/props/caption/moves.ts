/** Captions: words that come up one after another, and go. */
import { FilmError } from '#domain/errors';
import { type Ease, linear } from '#domain/time';
import {
	type Beginning,
	PropChange,
	type PropMotion,
	type SceneChange,
	type SceneMove,
	type Timing,
	type TimingScript,
	timingOf
} from '#direction/move';
import type { Caption } from './state.ts';

// Words come up at an even pace unless the film names a curve
const SHOWN_AT: Ease = linear;

/** A caption coming up word by word, in place of any on the screen. */
export class CaptionShow implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'caption';
	readonly timing: Timing;
	readonly text: string;

	constructor(text: string, script: TimingScript) {
		this.timing = timingOf({ ease: SHOWN_AT, ...script });
		this.text = text;
	}

	begin(): Promise<SceneChange> {
		return Promise.resolve(new PropChange('caption', new Showing(this.text)));
	}
}

/** The caption on the screen going; once gone, there is none. */
export class CaptionHide implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'caption';
	readonly timing: Timing;

	constructor(script: TimingScript) {
		this.timing = timingOf(script);
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		const caption = beginning.scene.caption;
		if (caption === null) return Promise.reject(new FilmError('a caption is hidden, but none is on the screen'));
		return Promise.resolve(new PropChange('caption', new Going(caption)));
	}
}

class Showing implements PropMotion<Caption> {
	readonly text: string;

	constructor(text: string) {
		this.text = text;
	}

	next(progress: number): Caption {
		return { text: this.text, shown: progress, gone: 0 };
	}
}

class Going implements PropMotion<Caption | null> {
	readonly caption: Caption;

	constructor(caption: Caption) {
		this.caption = caption;
	}

	next(progress: number): Caption | null {
		if (progress >= 1) return null;
		return { text: this.caption.text, shown: this.caption.shown, gone: progress };
	}
}

export function show(text: string, script: TimingScript = {}): CaptionShow {
	return new CaptionShow(text, script);
}

export function hide(script: TimingScript = {}): CaptionHide {
	return new CaptionHide(script);
}
