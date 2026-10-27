/**
 * A page shown even where it refuses to be shown in another page's frame.
 *
 * The filming browser alone takes the refusal (`X-Frame-Options`, a CSP's `frame-ancestors`) off a page's answer and
 * lets everything else a page asks for go by untouched: a page on the disk refuses nothing, and only a page — not a
 * script or an image — is ever framed. On the stage apart from the app, Playwright's route takes it off every page's
 * answer; on the stage inside the app, CDP's `Fetch` takes it off a page that sends one (`inside.ts`).
 */
import type { APIResponse, Route } from 'playwright-core';

/** A header of a page's answer, as CDP and Playwright list them. */
export interface Header {
	readonly name: string;
	readonly value: string;
}

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
 * The first of a page's headers that refuses to let it be framed, where one does: `X-Frame-Options` whatever it says,
 * or a CSP that names which pages may frame the page.
 */
export function refusalAmong(headers: readonly Header[]): Header | undefined {
	return headers.find(isRefusal);
}

function isRefusal(header: Header): boolean {
	switch (header.name.toLowerCase()) {
		case FRAME_OPTIONS:
			return true;
		case CONTENT_SECURITY_POLICY:
			return header.value.split(POLICIES_APART).flatMap(directivesOf).some(namesAncestors);
		default:
			return false;
	}
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
		.filter((header): header is readonly [string, string] => header[1] !== null);
	await route.fulfill({ response: answer, headers: Object.fromEntries(headers) });
}

/**
 * A header as it stands once it no longer refuses a frame, or none: `X-Frame-Options` goes, each CSP loses
 * `frame-ancestors`, and a CSP left with nothing goes.
 */
export function framedAnyway(name: string, value: string): string | null {
	switch (name.toLowerCase()) {
		case FRAME_OPTIONS:
			return null;
		case CONTENT_SECURITY_POLICY:
			return policiesLeft(value);
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

/** A CSP's policies, each less who may frame the page; none where no policy has anything else. */
function policiesLeft(value: string): string | null {
	const policies = value
		.split(POLICIES_APART)
		.map(withoutAncestors)
		.filter((policy) => policy !== '');
	return policies.length === 0 ? null : policies.join(POLICIES_JOINED);
}

/** One policy less the directive that names who may frame the page. */
function withoutAncestors(policy: string): string {
	return directivesOf(policy)
		.filter((directive) => !namesAncestors(directive))
		.join(DIRECTIVES_JOINED);
}

/** A policy's directives, each trimmed, none empty. */
function directivesOf(policy: string): string[] {
	return policy
		.split(DIRECTIVES_APART)
		.map((directive) => directive.trim())
		.filter((directive) => directive !== '');
}

/** Whether a directive is the one that says which pages may frame the page; directive names are read in any case. */
function namesAncestors(directive: string): boolean {
	return directive.toLowerCase().startsWith(ANCESTORS);
}
