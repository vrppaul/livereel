import { expect, test } from 'vitest';
import { framedAnyway } from '#adapters/browser/refusals';

test('a page that refuses every frame is framed anyway', () => {
	expect(framedAnyway('X-Frame-Options', 'DENY')).toBe('');
});

test("a page's other rules stay: only who may frame it goes", () => {
	expect(framedAnyway('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; img-src *")).toBe(
		"default-src 'self'; img-src *"
	);
});

test('any other header goes by untouched', () => {
	expect(framedAnyway('Content-Type', 'text/html')).toBe('text/html');
});
