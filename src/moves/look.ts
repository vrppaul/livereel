/**
 * The film's look, changed as it goes: to a theme's values, through the values between in a play, at once in a cut.
 * A theme is read as `defineFilm` reads the film's (`src/direction/theme.ts`), so a ground named alone takes its glow
 * with it; what it leaves out stays as the look has it. The fonts it names go with the move, so the browser reads them
 * before the film is shot.
 */
import { type Change, type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { fontsNamedIn, themeWritten } from '../direction/theme.ts';
import { assertWritten } from '../domain/handed.ts';
import { type Look, type Theme, lookToward, lookWith } from '../props/look.ts';

const PLACE = 'look.to';

/** The film's look on its way to a theme's values. */
export function to(theme: Theme, script: TimingScript = {}): Move {
	const named = themeWritten(theme, PLACE);
	assertWritten(script, TIMING_FORM, PLACE);
	return {
		part: 'look',
		timing: timingOf(script),
		fonts: fontsNamedIn(named, PLACE),
		begin: (beginning) => changing(beginning.scene.look, named)
	};
}

function changing(start: Look, theme: Theme): Change {
	const end = lookWith(start, theme);
	return propChange('look', (progress) => lookToward(start, end, progress));
}
