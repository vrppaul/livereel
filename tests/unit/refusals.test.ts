import { expect, test } from 'vitest';
import { framedAnyway, refusalAmong } from '../../src/adapters/browser/refusals.ts';

test('a page that refuses every frame is framed anyway: the refusal goes', () => {
	expect([
		framedAnyway('X-Frame-Options', 'DENY'),
		framedAnyway('Content-Security-Policy', "frame-ancestors 'none'")
	]).toEqual([null, null]);
});

test('every policy of a page loses who may frame it, in whatever case it is written, and keeps its other rules', () => {
	expect([
		framedAnyway('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; img-src *"),
		framedAnyway(
			'content-security-policy',
			"default-src 'self'; FRAME-ANCESTORS 'none', frame-ancestors 'self'; img-src *"
		)
	]).toEqual(["default-src 'self'; img-src *", "default-src 'self', img-src *"]);
});

test('any other header goes by untouched', () => {
	expect(framedAnyway('Content-Type', 'text/html')).toBe('text/html');
});

test("the header that refuses a page's frame is found among its headers; a page that refuses none has none", () => {
	const options = { name: 'X-Frame-Options', value: 'SAMEORIGIN' };
	const ancestors = { name: 'content-security-policy', value: "default-src 'self'; frame-ancestors 'none'" };
	const policy = { name: 'Content-Security-Policy', value: "default-src 'self';" };
	const packed = { name: 'Content-Security-Policy', value: "default-src 'self';script-src 'self'" };
	const type = { name: 'Content-Type', value: 'text/html' };
	expect(
		[
			[type, options],
			[policy, ancestors],
			[policy, packed, type]
		].map(refusalAmong)
	).toEqual([options, ancestors, undefined]);
});
