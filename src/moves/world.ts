/**
 * The world's look, changed as it goes: to the values a film names, through the values between in a play, at once in a
 * cut; what it leaves out stays as the world has it. A move sets the values it names alone, over the world as it stands
 * each frame, so two moves of the world share a step at once where they name no value alike: a glow growing the whole
 * step while the lights change in a share of it.
 */
import { type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import { assertWritten, namesSetBy } from '../domain/handed.ts';
import { type ValuesMoving, valuesToward, valuesWith } from '../domain/values.ts';
import { WORLD_KINDS, WORLD_NAMES, type WorldLook, type WorldScript } from '../props/world.ts';
import { withProp } from '../scene.ts';

const PLACE = 'world.to';

/** The world's look on its way to the values a film names. */
export function to(world: WorldScript, script: TimingScript = {}): Move {
	assertWritten<WorldScript>(world, WORLD_KINDS, PLACE);
	assertWritten(script, TIMING_FORM, PLACE);
	const names = namesSetBy(world, WORLD_NAMES, PLACE);
	return {
		part: 'world',
		valueNames: names,
		timing: timingOf(script),
		begin: (beginning) =>
			changing({ start: beginning.scene.world, end: valuesWith(beginning.scene.world, world, WORLD_KINDS), names })
	};
}

function changing(moving: ValuesMoving<WorldLook>): Change {
	return (scene, progress) => withProp(scene, 'world', valuesToward(scene.world, moving, WORLD_KINDS, progress));
}
