/**
 * What a prop's drawer is: it draws its prop whole from what it is handed, every frame, and keeps no time.
 *
 * A drawer finds its elements in the stage's markup once, by the `data-prop` its root carries and the `data-part` of
 * each element under it.
 */

export interface Drawer<Drawn> {
	readonly draw: (drawn: Drawn) => void;
}

/** The root of a prop's elements in the stage's markup. */
export function propRoot(page: Document, prop: string): HTMLElement {
	return found(page.querySelector<HTMLElement>(`[data-prop="${prop}"]`), prop);
}

/** An element under a prop's root, by the part it plays. */
export function partOf(root: Element, part: string): HTMLElement {
	return found(root.querySelector<HTMLElement>(`[data-part="${part}"]`), part);
}

export function show(element: HTMLElement | SVGElement, shown: boolean): void {
	element.style.display = shown ? '' : 'none';
}

function found(element: HTMLElement | null, name: string): HTMLElement {
	if (element === null) throw new Error(`the stage's markup has no ${name}`);
	return element;
}
