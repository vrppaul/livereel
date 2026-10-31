/**
 * The filmed page's own time kept to the film's (`PageTime` in `src/studio/ports.ts`), on Playwright's clock, which
 * fakes the timers, animation frames and date of every document in the browser context it is installed in: a static
 * page's own tab, or the stage's, for a page framed live in it; the stage's own script keeps no time. A Web Worker's
 * timers are not the document's, and run on the wall's clock.
 *
 * The clock stands from before the page opens, and only this module runs it on, so how far the page's time has run is
 * counted here, in whole milliseconds since the film began, never read back from the page. A frame runs it on as far
 * as the moment the take names — the film's, at the speed the film sets — where it is behind it, both in whole
 * milliseconds, as the clock runs a part of one as a whole one: run 33⅓ ms a frame, a 2 s timer ran out on the 59th
 * frame, 1.97 s of the film (measured 2026-10-31); run 33, 33 and 34, the film's time and the page's keep together.
 * While the film's own code waits on the page, the clock is run on a step at a time, each as long as the wall's clock
 * took over it and no longer than a step, until the wait is done: the page's time as the wall's, the one length of the
 * wall's clock a take reads, so the page answers; a step's own run is not counted, or a page with a timer of a
 * millisecond, whose run takes four times its length as each timer yields, would run ever further ahead (a wait of
 * 0.5 s ran 8.2 s, the review of 2026-10-31). The page comes out of a wait ahead of the film and stands until the film
 * catches up, so a timer it set runs out as far into the film as its delay, however long the waits after it took; a
 * script's animation stands while it does.
 *
 * The clock is never let run of itself: it stops only at a time no earlier than its own, and one let run is stopped
 * later than it can be told, so stopping it after a wait failed now and then where tests ran four at once
 * (2026-10-31). It stands from the start the same way: installed a minute back and stopped at the time it was
 * installed for, on a page that has nothing yet to keep time for. Its every run is an evaluation in each of the page's
 * frames; one going elsewhere is passed over and takes up the clock where it stood as it opens, from Playwright's log
 * of every run, a script each document the context opens runs first. That log grows a script a frame: a run cost 0.72
 * ms over a 10-minute film's first 3000 frames and 3.44 ms over its last, and a page going elsewhere 19 ms at its start
 * and 192 ms at its end (the review of 2026-10-31); 1.14 ms on average over a short film's first 120 frames.
 *
 * What a timer of the page throws as its time runs on is the page's: Playwright raises it from the run, where the
 * wall's clock would have left it in the page's console. It is said once, by what it says, and the film goes on.
 */
import { performance } from 'node:perf_hooks';
import { setTimeout as after } from 'node:timers/promises';
import type { Clock, Page } from 'playwright-core';
import { MILLISECONDS_A_SECOND } from '../../domain/time.ts';
import type { PageTime } from '../../studio/ports.ts';
import type { Warn } from './warn.ts';

// How far back the clock is installed from the time it then stands at, so stopping it there comes after its own time
// however long the install took: a minute, as no install takes one
const SET_BACK_MS = 60_000;
// How often the clock is run on while the film's code waits on the page, as often as a page draws; no further at once
const WAITING_STEP_MS = 16;
// What a step of a wait settles with: the wait done, or not yet
const DONE = true;
const NOT_YET = false;

export class PlaywrightPageTime implements PageTime {
	private readonly clock: Clock;
	private readonly warn: Warn;
	// How far the page's time has run since the film began, in whole milliseconds: as far as the film's, or further
	// where a wait ran it on ahead
	private ranTo = 0;
	// What the page's timers threw, each said once
	private readonly thrownSaid = new Set<string>();

	private constructor(clock: Clock, warn: Warn) {
		this.clock = clock;
		this.warn = warn;
	}

	/** The clock installed for every document the page's context opens, standing at this machine's time. */
	static async installedOn(page: Page, warn: Warn): Promise<PlaywrightPageTime> {
		const standingAt = Date.now();
		await page.clock.install({ time: standingAt - SET_BACK_MS });
		await page.clock.pauseAt(standingAt);
		return new PlaywrightPageTime(page.clock, warn);
	}

	begin(): void {
		this.ranTo = 0;
	}

	async runTo(moment: number): Promise<void> {
		await this.runOn(Math.round(moment * MILLISECONDS_A_SECOND) - this.ranTo);
	}

	async running(work: () => Promise<void>): Promise<void> {
		const settled = work().then(() => DONE);
		let done = NOT_YET;
		while (done === NOT_YET) {
			const stepBegan = performance.now();
			done = await Promise.race([settled, after(WAITING_STEP_MS, NOT_YET)]);
			await this.runOn(Math.min(Math.round(performance.now() - stepBegan), WAITING_STEP_MS));
		}
	}

	/** The page's time run on so many milliseconds, where they are any; what its timers throw on the way said. */
	private async runOn(milliseconds: number): Promise<void> {
		if (milliseconds <= 0) return;
		this.ranTo += milliseconds;
		try {
			await this.clock.runFor(milliseconds);
		} catch (fault) {
			this.saidOnce(messageOf(fault));
		}
	}

	/** What a timer of the page threw, said to the person the first time it is thrown. */
	private saidOnce(thrown: string): void {
		if (this.thrownSaid.has(thrown)) return;
		this.thrownSaid.add(thrown);
		this.warn(`a timer of the page threw as its time ran on, and the film goes on: ${thrown}`);
	}
}

/** What a fault says. */
function messageOf(fault: unknown): string {
	return fault instanceof Error ? fault.message : String(fault);
}
