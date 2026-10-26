import { expect, test } from 'vitest';
import { flagsOf } from '../../src/adapters/browser/chromium.ts';

test('the gpu renderer on a system livereel knows no graphics interface of is refused, naming the systems it knows', () => {
	expect(() => flagsOf('gpu', 'freebsd')).toThrow(
		'--renderer gpu draws on a graphics card on linux, darwin, win32: not on freebsd'
	);
});
