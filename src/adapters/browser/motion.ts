/**
 * The page's own motion as an act switches it: stilled by the reduced motion its tab is asked for, as every move in a
 * film is the film's, and let go by asking for none, for a shot that shows it sped up. A tab of the filmed page's own,
 * the stage's for a page framed live in it, or the app's as its set is shot.
 */
import type { Page } from 'playwright-core';
import type { PageMotionSwitch } from '../../direction/page.ts';

export class PageMotion implements PageMotionSwitch {
	readonly page: Page;
	released = false;

	constructor(page: Page) {
		this.page = page;
	}

	/** Said let go as it is asked, so an act that does not wait for it still has the page captured every frame. */
	release(): Promise<void> {
		this.released = true;
		return this.page.emulateMedia({ reducedMotion: 'no-preference' });
	}

	async still(): Promise<void> {
		await this.page.emulateMedia({ reducedMotion: 'reduce' });
		this.released = false;
	}
}
