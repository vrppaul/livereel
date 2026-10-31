/**
 * Whether a page in a tab of its own changed of itself since the take last asked, so its picture is taken anew
 * (`PicturedStage.changedOfItself` in `src/studio/ports.ts`).
 *
 * Every document the tab opens is watched from its first moment: its elements, their attributes and their text. Each
 * change is told to livereel through a binding of the tab as it is made, so a change a timer of the page makes is heard
 * before the clock that ran the timer returns, and after the page goes elsewhere (measured 2026-10-31). What changes no
 * element of the document is not heard: a canvas drawn on, a video playing, a style the page moves by its own
 * animations, and a change inside a shadow root, as a block in one is not blurred either; a page that does those is
 * framed live (`page: 'dynamic'`). A shadow root opened in the page was heard too where its `attachShadow` was wrapped
 * (probed 2026-10-31), which takes a script of more than one function in the page: not built.
 */
import type { Page } from 'playwright-core';

/** What the page is told: the binding it tells livereel through, and what of an element it watches. */
interface Telling {
	readonly binding: string;
	readonly watched: MutationObserverInit;
}

// The binding a page tells livereel of a change through, named as no page's own would be
const TOLD_THROUGH = '__livereelPageChanged';
// Every change of an element, below a watched root: its children, its attributes, its text
const EVERY_CHANGE: MutationObserverInit = { subtree: true, childList: true, attributes: true, characterData: true };

export class ChangesHeard {
	private heard = false;

	/** The tab's every document watched for its changes, from its first moment. */
	static async on(tab: Page): Promise<ChangesHeard> {
		const changes = new ChangesHeard();
		await tab.exposeBinding(TOLD_THROUGH, () => changes.hear());
		await tab.addInitScript(changesTold, { binding: TOLD_THROUGH, watched: EVERY_CHANGE });
		return changes;
	}

	/** Whether a change was heard since last asked; from then on, none until another is. */
	heardSinceAsked(): boolean {
		const heard = this.heard;
		this.heard = false;
		return heard;
	}

	private hear(): void {
		this.heard = true;
	}
}

// What follows runs in the page, handed over alone

/** A document watched for every change of its elements, each told as it is made. */
function changesTold(telling: Telling): void {
	const observer = new MutationObserver(() => (Reflect.get(window, telling.binding) as () => void)());
	observer.observe(document, telling.watched);
}
