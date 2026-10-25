import { expect, test } from 'vitest';
import { framedAnyway } from '../../src/adapters/browser/refusals.ts';

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
