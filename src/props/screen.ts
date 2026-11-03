/**
 * The screen the page is shown on, how far it has come up out of the ground, and what it shows: the filmed page, or a
 * page of the film's own, written whole in HTML, as a slide is, shown in its place — framed by the camera, leant with
 * the window, seen and blurred by the eye as the filmed page is. A page of the film's own is known by a key its move
 * works out from its HTML (`src/direction/page.ts`), so the scene and every frame drawn carry the key alone.
 */
import { type Fraction, NONE, WHOLE } from '../domain/fraction.ts';

/** What the screen shows: the filmed page, or a page of the film's own by its key. */
export type Shows = { readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string };

/** How far the screen has come up, as a film may open on the ground alone, and what it shows. */
export interface Screen {
	readonly shown: Fraction;
	readonly shows: Shows;
}

export const THE_FILMED_PAGE: Shows = { kind: 'filmed' };
export const SCREEN_UP: Screen = { shown: WHOLE, shows: THE_FILMED_PAGE };
export const SCREEN_DOWN: Screen = { shown: NONE, shows: THE_FILMED_PAGE };
