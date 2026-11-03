/**
 * Something done to the page between two frames, to the page as it stands: a cut of one `page.act`, which acts on it
 * at a moment of a play too, so the take acts on the page one way.
 */
import { assertKind } from '../domain/handed.ts';
import { AN_ACTION, type Action } from '../direction/page.ts';
import { type Cut, cut } from '../direction/steps.ts';
import * as page from './page.ts';

export function act(action: Action): Cut {
	assertKind(action, AN_ACTION, "act's action");
	return cut(page.act(action));
}
