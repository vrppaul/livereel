import { expect, test } from 'vitest';
import { boundsOf, picturePixelsAtMost, scaleWithin } from '../../src/adapters/browser/bounds.ts';
import { exposuresAtOnceOf, flagsOf, gpuMemoryFlagsOf } from '../../src/adapters/browser/chromium.ts';

// A film camera's shutter, open for half the way, of sixteen exposures at most, and of sixty-four
const HALF_OF_SIXTEEN = { shutter: 0.5, exposuresAtMost: 16 };
const HALF_OF_SIXTY_FOUR = { shutter: 0.5, exposuresAtMost: 64 };
// A frame as most films are shot at, and how many of a picture's pixels a page's pixel takes there at a zoom of 1 at
// the finest quality; how many exposures of it the stage lays at once
const FULL_HD = { width: 1920, height: 1080 };
const FINEST = 2;
const FINEST_AT_ZOOM_ONE = 2;
const ONE_AT_A_TIME = 1;
const SIXTEEN_AT_ONCE = 16;
// A screen a laptop's page is laid out on; one as tall as a runway; one whose picture at livereel's closest is taller
// than a JPEG holds
const LAPTOP = { width: 1040, height: 1080 };
const RUNWAY = { width: 1040, height: 8000 };
const PAST_A_JPEG = { width: 1040, height: 30_000 };
// A screen as large as a 4K frame, and how close it is pictured at livereel's closest on such a frame at the finest
// quality, which passes 2 GiB
const FOUR_K = { width: 3840, height: 2160 };
const FOUR_K_AT_THE_CLOSEST = 8.8;
// How close a picture of the whole runway is asked at livereel's closest, at the finest quality; a count of pixels no
// picture here comes to; and the largest texture of the graphics card livereel was measured on
const RUNWAY_AT_THE_CLOSEST = 4.4;
const A_BILLION_PIXELS = 1_000_000_000;
const IRIS_XE_TEXTURE = 16_384;
// Bounds a picture is taken within: no more than 1,000 px on a side, and 200,000 px in all
const SIDE_AT_MOST = { kind: 'side', most: 1000, says: 'no more than 1,000 px on a side' } as const;
const PIXELS_AT_MOST = { kind: 'pixels', most: 200_000, says: 'no more than 200,000 px' } as const;
const BOTH_BOUNDS = [SIDE_AT_MOST, PIXELS_AT_MOST];

test('the gpu renderer on a system livereel knows no graphics interface of is refused, naming the systems it knows', () => {
	expect(() => flagsOf('gpu', 'freebsd')).toThrow(
		'--renderer gpu draws on a graphics card on linux, darwin, win32: not on freebsd'
	);
});

test("the stage draws a frame's exposures at once only on the graphics card and showing a static page's picture, as many as the blur makes at most, up to sixteen", () => {
	expect([
		exposuresAtOnceOf('gpu', 'static', HALF_OF_SIXTEEN),
		exposuresAtOnceOf('gpu', 'static', HALF_OF_SIXTY_FOUR),
		exposuresAtOnceOf('gpu', 'static', null),
		exposuresAtOnceOf('gpu', 'dynamic', HALF_OF_SIXTEEN),
		exposuresAtOnceOf('software', 'static', HALF_OF_SIXTEEN)
	]).toEqual([16, 16, 1, 1, 1]);
});

test("Chrome is told GPU memory for the stage's copies of a frame where it lays several at once, and for the page's largest picture where it would not draw it whole by itself, the two added; none where neither needs any", () => {
	expect([
		gpuMemoryFlagsOf(ONE_AT_A_TIME, FULL_HD, FINEST, picturePixelsAtMost('static', LAPTOP, FINEST_AT_ZOOM_ONE)),
		gpuMemoryFlagsOf(SIXTEEN_AT_ONCE, FULL_HD, FINEST, picturePixelsAtMost('static', LAPTOP, FINEST_AT_ZOOM_ONE)),
		gpuMemoryFlagsOf(ONE_AT_A_TIME, FULL_HD, FINEST, picturePixelsAtMost('static', RUNWAY, FINEST_AT_ZOOM_ONE)),
		gpuMemoryFlagsOf(SIXTEEN_AT_ONCE, FULL_HD, FINEST, picturePixelsAtMost('static', RUNWAY, FINEST_AT_ZOOM_ONE)),
		gpuMemoryFlagsOf(ONE_AT_A_TIME, FULL_HD, FINEST, picturePixelsAtMost('static', PAST_A_JPEG, FINEST_AT_ZOOM_ONE)),
		gpuMemoryFlagsOf(ONE_AT_A_TIME, FULL_HD, FINEST, picturePixelsAtMost('dynamic', RUNWAY, FINEST_AT_ZOOM_ONE))
	]).toEqual([
		[],
		['--force-gpu-mem-available-mb=2025'],
		['--force-gpu-mem-available-mb=769'],
		['--force-gpu-mem-available-mb=2794'],
		['--force-gpu-mem-available-mb=710'],
		[]
	]);
});

test('a picture is taken as close as asked where it fits every bound, else as close as the tightest bound lets it, which it names', () => {
	expect([
		scaleWithin({ width: 100, height: 50 }, 2, BOTH_BOUNDS),
		scaleWithin({ width: 100, height: 50 }, 20, BOTH_BOUNDS),
		scaleWithin({ width: 400, height: 10 }, 4, BOTH_BOUNDS)
	]).toEqual([
		{ scale: 2, heldBy: null },
		{ scale: Math.sqrt(40), heldBy: PIXELS_AT_MOST },
		{ scale: 2.5, heldBy: SIDE_AT_MOST }
	]);
});

test("a picture is taken no larger on a side than a JPEG holds, nor than 2 GiB, and on a graphics card no larger on a side than the card's largest texture", () => {
	expect([
		scaleWithin(RUNWAY, RUNWAY_AT_THE_CLOSEST, boundsOf(A_BILLION_PIXELS, null)).scale,
		scaleWithin(RUNWAY, RUNWAY_AT_THE_CLOSEST, boundsOf(A_BILLION_PIXELS, IRIS_XE_TEXTURE)).scale,
		scaleWithin(PAST_A_JPEG, RUNWAY_AT_THE_CLOSEST, boundsOf(A_BILLION_PIXELS, null)).scale,
		scaleWithin(FOUR_K, FOUR_K_AT_THE_CLOSEST, boundsOf(A_BILLION_PIXELS, null)).scale
	]).toEqual([
		RUNWAY_AT_THE_CLOSEST,
		IRIS_XE_TEXTURE / RUNWAY.height,
		65_500 / PAST_A_JPEG.height,
		Math.sqrt(2 ** 31 / 4 / (FOUR_K.width * FOUR_K.height))
	]);
});
