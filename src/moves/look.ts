/**
 * The film's look, changed as it goes: to a theme's values, through the values between in a play, at once in a cut.
 * A theme is read as `defineFilm` reads the film's (`src/direction/theme.ts`), so a ground named alone takes its glow
 * with it; what it leaves out stays as the look has it. A move sets the values its theme names alone, over the look
 * as it stands each frame, so two moves of the look share a step at once where they name no value alike: a glow
 * drifting the whole step while the ink changes in a share of it. The fonts it names go with the move, so the browser
 * reads them before the film is shot.
 */
import { type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import { fontsNamedIn, themeWritten } from '../direction/theme.ts';
import { assertWritten } from '../domain/handed.ts';
import { type Look, type Theme, lookToward, lookWith, namedIn } from '../props/look.ts';
import { withProp } from '../scene.ts';

const PLACE = 'look.to';

/** The film's look on its way to a theme's values. */
export function to(theme: Theme, script: TimingScript = {}): Move {
	const named = themeWritten(theme, PLACE);
	assertWritten(script, TIMING_FORM, PLACE);
	return {
		part: 'look',
		values: namedIn(named),
		timing: timingOf(script),
		fonts: fontsNamedIn(named, PLACE),
		begin: (beginning) => changing(beginning.scene.look, named)
	};
}

function changing(start: Look, theme: Theme): Change {
	const end = lookWith(start, theme);
	return (scene, progress) => withProp(scene, 'look', lookToward(scene.look, start, end, progress));
}
