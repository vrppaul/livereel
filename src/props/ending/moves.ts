/** The ending card coming up over the frame. */
import {
	PropChange,
	type PropMotion,
	type SceneChange,
	type SceneMove,
	type Timing,
	type TimingScript,
	timingOf
} from '#direction/move';
import type { Ending, EndingCard } from './state.ts';

export class EndingShow implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'ending';
	readonly timing: Timing;
	readonly card: EndingCard;

	constructor(card: EndingCard, script: TimingScript) {
		this.timing = timingOf(script);
		this.card = card;
	}

	begin(): Promise<SceneChange> {
		return Promise.resolve(new PropChange('ending', new Coming(this.card)));
	}
}

class Coming implements PropMotion<Ending> {
	readonly card: EndingCard;

	constructor(card: EndingCard) {
		this.card = card;
	}

	next(progress: number): Ending {
		return { card: this.card, shown: progress };
	}
}

export function show(card: EndingCard, script: TimingScript = {}): EndingShow {
	return new EndingShow(card, script);
}
