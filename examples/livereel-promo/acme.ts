/**
 * Acme's analytics app as the films reach it: where it is served, the command that serves it there (`server.ts`, run
 * from the films' folder), and what each click on its Refresh brings.
 *
 * What the server answers on each refresh, in order, is data, `app/refreshed.json`, read by the server and by the
 * films alike, so a film knows what the page shows once each of its clicks is answered.
 */
import refreshed from './app/refreshed.json' with { type: 'json' };

/**
 * Today's numbers as a refresh brings them: the visitors, how they stand against yesterday, today's bar in percent,
 * and whether the page says they were updated.
 */
export type Refreshed = (typeof refreshed)[number];

// The port the app is served on, the films' own
const PORT = 8741;
// How refreshes are numbered: the first is 1
export const FIRST_REFRESH = 1;

/** Where the app is, and the command that serves it there for a take, spread into a film's script. */
export const ACME = {
	address: `http://127.0.0.1:${String(PORT)}/`,
	serve: `node livereel-promo/server.ts ${String(PORT)}`
};

/** What the refresh of an order brings, the first numbered 1; past the last, the last. */
export function broughtBy(order: number): Refreshed {
	const answer = refreshed[Math.min(order, refreshed.length) - FIRST_REFRESH];
	if (answer === undefined)
		throw new Error(`no refresh is numbered ${String(order)}: the first is ${String(FIRST_REFRESH)}`);
	return answer;
}
