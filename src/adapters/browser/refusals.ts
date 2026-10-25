/**
 * A page shown even where it refuses to be shown in another page's frame.
 *
 * The filming browser alone takes the refusal (`X-Frame-Options`, a CSP's `frame-ancestors`) off every page's answer
 * and lets everything else a page asks for go by untouched: a page on the disk refuses nothing, and only a page — not
 * a script or an image — is ever framed.
 */
import type { APIResponse, Route } from 'playwright-core';

// The ways a page comes from a server, and what a page is among what a page asks for
const SERVED = new Set(['http:', 'https:']);
const DOCUMENT = 'document';
// Two policies sent as two headers come joined by a comma; a policy's directives, and the one of them that says which
// pages may frame this one
const POLICIES_APART = ',';
const POLICIES_JOINED = ', ';
const DIRECTIVES_APART = ';';
const DIRECTIVES_JOINED = '; ';
const ANCESTORS = 'frame-ancestors';
const FRAME_OPTIONS = 'x-frame-options';
const CONTENT_SECURITY_POLICY = 'content-security-policy';

/** Whether a request goes to a server. */
export function isServed(requested: URL): boolean {
	return SERVED.has(requested.protocol);
}

/**
 * A page's answer with its refusals to be framed taken off; anything but a page goes on untouched. A page that cannot
 * be reached is left to the browser, which shows it unreached as it would anywhere. A redirect is followed here, so
 * the frame keeps the address it asked for (TODO.md: a redirect handed on to the frame was not followed by it).
 */
export async function withoutFrameRefusals(route: Route): Promise<void> {
	if (route.request().resourceType() !== DOCUMENT) {
		await route.fallback();
		return;
	}
	const answer = await answered(route);
	if (answer === null) {
		await route.continue();
		return;
	}
	const headers = Object.entries(answer.headers())
		.map(([name, value]) => [name, framedAnyway(name, value)] as const)
		.filter(([, value]) => value !== '');
	await route.fulfill({ response: answer, headers: Object.fromEntries(headers) });
}

/** A header as it stands once it no longer refuses a frame: `X-Frame-Options` gone, each CSP less `frame-ancestors`. */
export function framedAnyway(name: string, value: string): string {
	switch (name.toLowerCase()) {
		case FRAME_OPTIONS:
			return '';
		case CONTENT_SECURITY_POLICY:
			return value
				.split(POLICIES_APART)
				.map(withoutAncestors)
				.filter((policy) => policy !== '')
				.join(POLICIES_JOINED);
		default:
			return value;
	}
}

async function answered(route: Route): Promise<APIResponse | null> {
	try {
		return await route.fetch();
	} catch (fault) {
		if (fault instanceof Error) return null;
		throw fault;
	}
}

/** One policy less the directive that names who may frame the page; directive names are read in any case. */
function withoutAncestors(policy: string): string {
	return policy
		.split(DIRECTIVES_APART)
		.map((directive) => directive.trim())
		.filter((directive) => directive !== '' && !directive.toLowerCase().startsWith(ANCESTORS))
		.join(DIRECTIVES_JOINED);
}
