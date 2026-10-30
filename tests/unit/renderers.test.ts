import { expect, test } from 'vitest';
import { exposuresAtOnceOf, flagsOf } from '../../src/adapters/browser/chromium.ts';

// A film camera's shutter, open for half the way, of sixteen exposures at most
const HALF_OF_SIXTEEN = { shutter: 0.5, exposuresAtMost: 16 };

test('the gpu renderer on a system livereel knows no graphics interface of is refused, naming the systems it knows', () => {
	expect(() => flagsOf('gpu', 'freebsd')).toThrow(
		'--renderer gpu draws on a graphics card on linux, darwin, win32: not on freebsd'
	);
});

test("the stage draws a frame's exposures at once only on the graphics card and showing a static page's picture, as many as the blur makes at most", () => {
	expect([
		exposuresAtOnceOf('gpu', 'static', HALF_OF_SIXTEEN),
		exposuresAtOnceOf('gpu', 'static', null),
		exposuresAtOnceOf('gpu', 'dynamic', HALF_OF_SIXTEEN),
		exposuresAtOnceOf('software', 'static', HALF_OF_SIXTEEN)
	]).toEqual([16, 1, 1, 1]);
});
