/**
 * The stage inside the app: served on the filmed page's own origin, for a dynamic page, framed live, that signs in or
 * refuses to be framed.
 *
 * Framed in a stage of another site, a page is a third party to it, and its cookies of `SameSite=Lax` go with none of
 * its own requests: an app that signs in shows nobody signed in. On its own origin the page is first-party to the
 * stage: its cookies go, a sign-in made in the frame holds, and a redirect lands in the frame as the browser follows
 * it (measured 2026-10-27). CDP's `Fetch`, on a session of livereel's own, answers the stage's address with the
 * package's stage files and, as each page's answer comes, fulfils a page that refuses to be framed anew without its
 * refusal; every other answer, and every step of a redirect, goes on as it came. The frame is sandboxed short of
 * moving the page it stands in: on one origin a page that breaks out of frames (`top.location = …`) would take the
 * stage with it at any time, where Chrome lets a page of another site do it only on a click. A link to `_top` then
 * does nothing (measured 2026-10-27). A page answered anew hears its server on this machine only as the browser is
 * granted `local-network-access` (`chromium.ts`).
 */
import { readFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';
import type { CDPSession, Page } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import { type Header, framedAnyway, refusalAmong } from './refusals.ts';
import { type Opening, STAGE_FOLDER, STAGE_PAGE } from './stage.ts';
import type { Warn } from './warn.ts';

/** What livereel reads of a request `Fetch` paused: at the response stage, the answer's status and headers. */
interface Paused {
	readonly requestId: string;
	readonly request: { readonly url: string };
	readonly responseStatusCode?: number;
	readonly responseErrorReason?: string;
	readonly responseHeaders?: readonly Header[];
}

/** A file of the package's stage, as the stage's address answers it: its kind of content, and itself in base64. */
interface StageFile {
	readonly type: string;
	readonly body: string;
}

// The ways a page comes from a server, and where the stage stands on the app's origin: a path of livereel's own,
// which no app is expected to serve
const SERVED = new Set(['http:', 'https:']);
const STAGE_PATH = '/__livereel__/';
const CONTENT_TYPES: ReadonlyMap<string, string> = new Map([
	['.html', 'text/html; charset=utf-8'],
	['.css', 'text/css; charset=utf-8'],
	['.js', 'text/javascript; charset=utf-8']
]);
// The statuses a stage file is answered with: sent, or not one of the stage's
const FILE_SENT = 200;
const NO_SUCH_FILE = 404;
const CONTENT_TYPE = 'Content-Type';
// What Fetch pauses: every request for the stage's own files, and every page's answer as it comes
const PAGE_RESOURCE = 'Document';
const REDIRECTS = { first: 300, last: 399 };
const NO_HEADERS: readonly Header[] = [];
// What a body Fetch hands over decoded no longer is once it is fulfilled anew: of the length and coding it came in
const DECODED_AWAY = new Set(['content-encoding', 'content-length']);
const BASE64 = 'base64';
// What the page in the frame may do: all a page does but move the page it stands in
const SANDBOX = [
	'allow-downloads',
	'allow-forms',
	'allow-modals',
	'allow-orientation-lock',
	'allow-pointer-lock',
	'allow-popups',
	'allow-popups-to-escape-sandbox',
	'allow-presentation',
	'allow-same-origin',
	'allow-scripts',
	'allow-storage-access-by-user-activation'
].join(' ');

/** The stage opened inside the app the page is served by; how its frame then opens the page, sandboxed. */
export async function stagedInside(page: Page, address: string, warn: Warn): Promise<Opening> {
	const stage = stageAddressOf(address);
	const files = await stageFiles();
	const session = await page.context().newCDPSession(page);
	session.on('Fetch.requestPaused', (paused) => void answeredAnyway(session, paused, files, warn));
	await session.send('Fetch.enable', {
		patterns: [
			{ urlPattern: `${new URL(STAGE_PATH, stage).href}*`, requestStage: 'Request' },
			{ resourceType: PAGE_RESOURCE, requestStage: 'Response' }
		]
	});
	await page.goto(stage);
	return { address, sandbox: SANDBOX };
}

/** Where the stage stands for a page: on the page's own origin, at livereel's path; a page no server serves has none. */
export function stageAddressOf(address: string): string {
	const served = URL.parse(address);
	if (served === null || !SERVED.has(served.protocol)) {
		throw new FilmError(`stage: "inside" stands on the address of a page a server serves: ${address} is none`);
	}
	return new URL(`${STAGE_PATH}${STAGE_PAGE}`, served.origin).href;
}

/** The headers a page that refuses frames is answered anew with: its refusal gone, and its body's length and coding. */
export function fulfilledHeaders(headers: readonly Header[]): Header[] {
	return headers
		.filter((header) => !DECODED_AWAY.has(header.name.toLowerCase()))
		.map((header) => ({ name: header.name, value: framedAnyway(header.name, header.value) }))
		.filter((header): header is Header => header.value !== null);
}

/** The package's stage files the stage's address answers, by name: those of a kind of content it knows. */
async function stageFiles(): Promise<ReadonlyMap<string, StageFile>> {
	const names = await readdir(STAGE_FOLDER);
	return new Map(await Promise.all(names.flatMap(stageFileNamed)));
}

/** A file of the stage, read, by its name; none where its kind of content is not one a stage file is of. */
function stageFileNamed(name: string): Promise<readonly [string, StageFile]>[] {
	const type = CONTENT_TYPES.get(extname(name));
	return type === undefined ? [] : [stageFileRead(name, type)];
}

async function stageFileRead(name: string, type: string): Promise<readonly [string, StageFile]> {
	const body = await readFile(new URL(name, STAGE_FOLDER));
	return [name, { type, body: body.toString(BASE64) }];
}

/** A request Fetch paused, answered as livereel answers it, or let go as it came where that fails. */
function answeredAnyway(
	session: CDPSession,
	paused: Paused,
	files: ReadonlyMap<string, StageFile>,
	warn: Warn
): Promise<void> {
	return answered(session, paused, files).catch((fault: unknown) => answeredAsCame(session, paused, fault, warn));
}

/**
 * A request Fetch paused, answered: one for the stage's own files, paused before it was sent, with the file; a page
 * that refuses to be framed anew without its refusal; anything else, a redirect or an error among them, as it came.
 */
async function answered(session: CDPSession, paused: Paused, files: ReadonlyMap<string, StageFile>): Promise<void> {
	const { requestId, responseStatusCode, responseErrorReason, responseHeaders = NO_HEADERS } = paused;
	if (responseStatusCode === undefined && responseErrorReason === undefined) {
		return stageFileSent(session, paused, files);
	}
	if (
		responseStatusCode === undefined ||
		isRedirect(responseStatusCode) ||
		refusalAmong(responseHeaders) === undefined
	) {
		return asCame(session, requestId);
	}
	const { body, base64Encoded } = await session.send('Fetch.getResponseBody', { requestId });
	await session.send('Fetch.fulfillRequest', {
		requestId,
		responseCode: responseStatusCode,
		responseHeaders: fulfilledHeaders(responseHeaders),
		body: base64Encoded ? body : Buffer.from(body).toString(BASE64)
	});
}

/** A request for the stage's own files answered with the file it names, or as not found. */
async function stageFileSent(
	session: CDPSession,
	paused: Paused,
	files: ReadonlyMap<string, StageFile>
): Promise<void> {
	const file = files.get(new URL(paused.request.url).pathname.slice(STAGE_PATH.length));
	if (file === undefined) {
		await session.send('Fetch.fulfillRequest', { requestId: paused.requestId, responseCode: NO_SUCH_FILE });
		return;
	}
	await session.send('Fetch.fulfillRequest', {
		requestId: paused.requestId,
		responseCode: FILE_SENT,
		responseHeaders: [{ name: CONTENT_TYPE, value: file.type }],
		body: file.body
	});
}

async function asCame(session: CDPSession, requestId: string): Promise<void> {
	await session.send('Fetch.continueRequest', { requestId });
}

/**
 * A request that could not be answered as livereel answers it, let go as it came: where it goes on, the person is told
 * why what it brings may differ, a page refused its frame among them; one the page dropped meanwhile is gone, and
 * nothing is left to answer.
 */
async function answeredAsCame(session: CDPSession, paused: Paused, fault: unknown, warn: Warn): Promise<void> {
	const wentOn = await asCame(session, paused.requestId).then(
		() => true,
		() => false
	);
	if (wentOn) {
		warn(
			`stage: "inside" could not answer ${paused.request.url} itself, and let it go on as it came: ${String(fault)}`
		);
	}
}

function isRedirect(status: number): boolean {
	return status >= REDIRECTS.first && status <= REDIRECTS.last;
}
