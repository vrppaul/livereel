// The stage inside the app: the address it stands on, and the headers a page that refuses frames is answered anew with
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { fulfilledHeaders, stageAddressOf } from '../../src/adapters/browser/inside.ts';

test("the stage stands on the origin of the page it films, at livereel's own path", () => {
	expect(stageAddressOf('http://127.0.0.1:5173/app/?tab=2#top')).toBe('http://127.0.0.1:5173/__livereel__/stage.html');
});

test('a page no server serves has no address for the stage to stand on: it is refused, by its address', () => {
	expect(() => stageAddressOf('file:///home/page.html')).toThrow(
		new FilmError('stage: "inside" stands on the address of a page a server serves: file:///home/page.html is none')
	);
	expect(() => stageAddressOf('nowhere')).toThrow(
		new FilmError('stage: "inside" stands on the address of a page a server serves: nowhere is none')
	);
});

test('a page answered anew keeps no refusal to be framed, nor the length and coding of a body handed over decoded', () => {
	expect(
		fulfilledHeaders([
			{ name: 'Content-Type', value: 'text/html' },
			{ name: 'X-Frame-Options', value: 'DENY' },
			{ name: 'content-security-policy', value: "default-src 'self'; frame-ancestors 'none'" },
			{ name: 'Content-Encoding', value: 'gzip' },
			{ name: 'content-length', value: '512' },
			{ name: 'Set-Cookie', value: 'visited=yes' }
		])
	).toEqual([
		{ name: 'Content-Type', value: 'text/html' },
		{ name: 'content-security-policy', value: "default-src 'self'" },
		{ name: 'Set-Cookie', value: 'visited=yes' }
	]);
});
