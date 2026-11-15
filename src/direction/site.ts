/**
 * Where a film's page is, and how it comes to be served there: its address apart from the command that serves it, as
 * Playwright's `webServer` has them. Both are values, so a film hands livereel nothing to run or to stop: what serves
 * the page is a process of its own, which livereel alone starts, waits for and stops.
 */
import { FilmError } from '../domain/errors.ts';
import { AN_ADDRESS, A_COMMAND, type Form, needed } from '../domain/handed.ts';

/** Where a film's page is, as a film writes it. */
export interface SiteScript {
	/** The page's address: a public site, an app already running, or where `serve` serves the page. */
	readonly address: string;
	/**
	 * The command that serves the page at its address, run in the film's folder for as long as a take lasts, as the
	 * project's own server is run (`npx vite`, `npm run dev`, `node server.ts`), and stopped as the take ends or livereel
	 * is stopped; none where someone else serves the page.
	 */
	readonly serve?: string;
}

/** Where a film's page is, and the command that serves it there for a take: none where someone else serves it. */
export interface Site {
	readonly address: string;
	readonly command: string | undefined;
}

// The address a command serves its page at is one livereel asks over HTTP until it answers
const SERVED_OVER = new Set(['http:', 'https:']);

export const SITE_FORM: Form<SiteScript> = { address: needed(AN_ADDRESS), serve: A_COMMAND };

/**
 * Where a film's page is, from its script, its form checked with the rest of the film's; a page its command serves at
 * an address no HTTP request reaches, as a file's, is refused, as livereel could never tell it was served.
 */
export function siteOf(script: SiteScript): Site {
	if (script.serve !== undefined && !isServedOverHttp(script.address)) {
		throw new FilmError(
			`the film's address is ${JSON.stringify(script.address)}: ` +
				'a page its serve command serves is at an http or https address'
		);
	}
	return { address: script.address, command: script.serve };
}

function isServedOverHttp(address: string): boolean {
	return URL.canParse(address) && SERVED_OVER.has(new URL(address).protocol);
}
