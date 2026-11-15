/**
 * Two flights of the eye low over the promo's app (`livereel-promo/`), as the claude-review promo flies over its own
 * page: a run toward a button, sinking and turning to it, holding it a little below the frame's middle as it runs low,
 * then rising to look straight down on it; and a dive, arriving level along a row of cards from its left, running
 * along it and on past it, lifting its sight away as it goes. Each flight is legs and a gaze written apart, the eye
 * back at rest after each.
 *
 *     pnpm livereel shoot examples/livereel-flights.ts --out out/flights --sheet
 *
 * Flat, the page is drawn from a picture no closer than livereel's bound, so the low passes show it soft.
 */
import { type Step, defineFilm, eye, hold, play, softThenHeld } from 'livereel';
import { ACME } from './livereel-promo/acme.ts';

const WIDE = { frame: { width: 1920, height: 1080 }, screen: { width: 1440, height: 900 } };
// The blocks the eye flies over and looks at
const REFRESH = '[data-testid=refresh]';
const VISITORS = '[data-testid=visitors]';
const SIGN_UPS = '[data-testid=sign-ups]';
const REVENUE = '[data-testid=revenue]';
// How high over the page the run sinks, runs and rises to, in film pixels
const SUNK = 520;
const RUNNING = 260;
const OVER_THE_BUTTON = 700;
// Where the run holds the button, as a share down the frame: a little below its middle
const HELD_DOWN_THE_FRAME = 0.58;
// The run's heading at its end, up the page, and its tip there, straight down
const UP_THE_PAGE = 0;
const STRAIGHT_DOWN = -90;
// How high the dive runs along the row, the way it arrives, right along the page, and how far before the row its turn
// stands, in shares of its first leg's chord
const ALONG_THE_ROW = 150;
const RIGHT = 90;
const BEND = 0.5;
// The dive's tip: level along the row, then lifted away past it; how far on it flies, in times the row's length
const LEVEL = 0;
const LIFTED_AWAY = 35;
const ON_PAST_THE_ROW = 1;
// When the dive is at its fastest, as a share of its time, held from then on
const FASTEST_AT = 0.35;

/** The run: sinking toward the button and turning to it, running low holding it, rising to look straight down on it. */
function theRun(): readonly Step[] {
	return [
		play({
			seconds: 6,
			moves: [
				eye.fly(
					[
						{ to: { over: VISITORS, height: SUNK } },
						{ to: { over: SIGN_UPS, height: RUNNING } },
						{ to: { over: REFRESH, height: OVER_THE_BUTTON } }
					],
					{
						heading: [
							{ by: 0, toward: REFRESH },
							{ by: 1, toward: REFRESH },
							{ by: 2, degrees: UP_THE_PAGE }
						],
						tip: [
							{ by: 0, holding: REFRESH, at: HELD_DOWN_THE_FRAME },
							{ by: 1, holding: REFRESH, at: HELD_DOWN_THE_FRAME },
							{ by: 2, degrees: STRAIGHT_DOWN }
						]
					}
				)
			]
		}),
		hold({ seconds: 1 }),
		play({ seconds: 2, moves: [eye.to('rest')] })
	];
}

/** The dive: arriving level along the row of cards from its left, running along it, and on past it lifting away. */
function theDive(): readonly Step[] {
	return [
		play({
			seconds: 5,
			ease: softThenHeld(FASTEST_AT),
			moves: [
				eye.fly(
					[
						{ to: { over: VISITORS, height: ALONG_THE_ROW }, arriving: RIGHT, bend: BEND },
						{ to: { over: REVENUE, height: ALONG_THE_ROW } },
						{ ahead: ON_PAST_THE_ROW }
					],
					{
						heading: [{ by: 0, degrees: RIGHT }],
						tip: [
							{ by: 0, degrees: LEVEL },
							{ by: 1, degrees: LEVEL },
							{ by: 2, degrees: LIFTED_AWAY }
						]
					}
				)
			]
		}),
		hold({ seconds: 0.5 }),
		play({ seconds: 2, moves: [eye.to('rest')] })
	];
}

export default defineFilm({
	formats: { wide: WIDE },
	...ACME,
	ready: ({ page }) => page.locator(REFRESH).waitFor(),
	steps: () => [hold({ seconds: 0.5 }), ...theRun(), ...theDive(), hold({ seconds: 0.5 })]
});
