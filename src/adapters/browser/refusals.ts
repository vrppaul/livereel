/**
 * A page's refusal to be shown in another page's frame (`X-Frame-Options`, a CSP's `frame-ancestors`), found, and
 * taken off.
 *
 * On the stage apart from the app a page is framed as it comes, and one that refuses is refused with its refusal
 * named. On the stage inside the app, CDP's `Fetch` takes the refusal off a page that sends one and lets everything
 * else go by untouched (`inside.ts`): a page on the disk refuses nothing, and only a page — not a script or an
 * image — is ever framed.
 */

/** A header of a page's answer, as CDP and Playwright list them. */
export interface Header {
	readonly name: string;
	readonly value: string;
}

// Two policies sent as two headers come joined by a comma; a policy's directives, and the one of them that says which
// pages may frame this one
const POLICIES_APART = ',';
const POLICIES_JOINED = ', ';
const DIRECTIVES_APART = ';';
const DIRECTIVES_JOINED = '; ';
const ANCESTORS = 'frame-ancestors';
const FRAME_OPTIONS = 'x-frame-options';
const CONTENT_SECURITY_POLICY = 'content-security-policy';

/**
 * The first of a page's headers that refuses to let it be framed, where one does, by the part of it that refuses:
 * `X-Frame-Options` whatever it says, or a CSP by the directives that name which pages may frame the page.
 */
export function refusalAmong(headers: readonly Header[]): Header | undefined {
	const [first] = headers.flatMap(refusalIn);
	return first;
}

/** The part of a header that refuses a frame, as a header of its own; none where no part does. */
function refusalIn(header: Header): Header[] {
	switch (header.name.toLowerCase()) {
		case FRAME_OPTIONS:
			return [header];
		case CONTENT_SECURITY_POLICY:
			return ancestorsIn(header);
		default:
			return [];
	}
}

/**
 * A CSP said by its directives that name which pages may frame the page alone, each policy's apart as the policies
 * were; none where it has none.
 */
function ancestorsIn(policy: Header): Header[] {
	const ancestors = policy.value.split(POLICIES_APART).flatMap(directivesOf).filter(namesAncestors);
	return ancestors.length === 0 ? [] : [{ name: policy.name, value: ancestors.join(POLICIES_JOINED) }];
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
