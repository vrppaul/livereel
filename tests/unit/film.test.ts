// A film in its formats: each by its name, and the steps told which one they are shot in; its music's volume, its
// keys, and its blur
import { expect, test } from 'vitest';
import { wholePose } from '../../src/domain/camera.ts';
import { FilmError } from '../../src/domain/errors.ts';
import { linear } from '../../src/domain/time.ts';
import type { MotionBlurScript } from '../../src/direction/blur.ts';
import { atAddress, defineFilm } from '../../src/direction/film.ts';
import { act, play } from '../../src/direction/steps.ts';
import * as camera from '../../src/moves/camera.ts';
import * as title from '../../src/moves/title.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import type { KeyboardSound, LivereelSoundsScript, Music } from '../../src/direction/sound.ts';
import { SMALL } from './fakes.ts';

const TALL = { frame: { width: 400, height: 600 }, screen: { width: 400, height: 600 } };

test('the steps are handed the name of the format the film is shot in', async () => {
	const named: string[] = [];
	const film = defineFilm({
		formats: { small: SMALL, tall: TALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: (_served, _whole, formatName) => {
			named.push(formatName);
			return [];
		}
	});
	await using served = await film.formats.get('tall')!.serve();
	served.steps(wholePose(TALL));
	expect(named).toEqual(['tall']);
});

/** A film written so, as a film whose types nobody checked may write it, the rest of it as a film needs. */
function filmWritten(written: object) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		...written
	} as never);
}

/** The steps a film gives, as livereel reads them once the film is served. */
async function stepsGiven(steps: unknown) {
	const film = filmWritten({ steps: () => steps });
	await using served = await film.formats.get('small')!.serve();
	return served.steps(wholePose(SMALL));
}

/** What a film's serve gives, as livereel reads it as the film is served. */
async function servedFrom(serving: unknown) {
	const film = filmWritten({ serve: () => serving });
	await using served = await film.formats.get('small')!.serve();
	return served.address;
}

test('a film in no form of one is refused as it is defined, where it stands: its names, its formats and where their captions stand, its functions', () => {
	expect(() => defineFilm(null as never)).toThrow(
		new FilmError(
			'the film is null: it is an object of formats, serve, stage, ready, steps, sounds, music, motionBlur, theme, colourScheme, blurred, page'
		)
	);
	expect(() => filmWritten({ motionblur: {} })).toThrow(
		new FilmError(
			'the film names motionblur: it names formats, serve, stage, ready, steps, sounds, music, motionBlur, theme, colourScheme, blurred, page, or fewer'
		)
	);
	expect(() => filmWritten({ colourScheme: 'night' })).toThrow(
		new FilmError('the film\'s colourScheme is "night": it is "light" or "dark"')
	);
	expect(() => filmWritten({ page: 'moving' })).toThrow(
		new FilmError(
			'the film\'s page is "moving": it is "still", changed only by the film, or "live" for a page that changes of itself, as an animation or live data does'
		)
	);
	expect(() => filmWritten({ blurred: '.email' })).toThrow(
		new FilmError('the film\'s blurred is ".email": it is a list of selectors')
	);
	expect(() => filmWritten({ blurred: ['.email', ''] })).toThrow(
		new FilmError('the film\'s blurred[1] is "": it is a selector: a string that names blocks of the page')
	);
	expect(() => filmWritten({ formats: null })).toThrow(
		new FilmError("the film's formats is null: it is an object of the film's formats, by name")
	);
	expect(() => filmWritten({ formats: { small: { ...SMALL, frame: { width: 321, height: 320 } } } })).toThrow(
		new FilmError(
			"the film's small format's frame's width is 321: it is a whole, even count of pixels, as a video holds them"
		)
	);
	expect(() => filmWritten({ formats: { small: { ...SMALL, screen: { width: -5, height: 320 } } } })).toThrow(
		new FilmError("the film's small format's screen's width is -5: it is a number of pixels, more than none")
	);
	expect(() => filmWritten({ formats: { small: { frame: SMALL.frame } } })).toThrow(
		new FilmError("the film's small format's screen is undefined: it is a screen: { width, height }")
	);
	expect(() => filmWritten({ formats: { small: { ...SMALL, captionAt: 'middle' } } })).toThrow(
		new FilmError(`the film's small format's captionAt is "middle": it is where a caption stands: "bottom" or "top"`)
	);
	expect(() => filmWritten({ serve: null })).toThrow(new FilmError("the film's serve is null: it is a function"));
});

test('steps a film gives in no form of a list of steps are refused as it is served: a click or a typing not spread, a step written by hand in no form of one, anything else', async () => {
	await expect(stepsGiven([[act(() => Promise.resolve())]])).rejects.toThrow(
		new FilmError(
			"the film's steps[0] is a list: spread the steps cursor.click and typing give among the others, as ...cursor.click(action)"
		)
	);
	await expect(stepsGiven([{ kind: 'play', seconds: 1 }])).rejects.toThrow(
		new FilmError("the film's steps[0]'s moves is undefined: it is a list of moves")
	);
	await expect(
		stepsGiven([{ kind: 'play', seconds: 1, moves: [camera.onto('#a'), camera.onto('#b')], ease: linear }])
	).rejects.toThrow(new FilmError('two moves on the camera at once in one step'));
	await expect(stepsGiven([null])).rejects.toThrow(
		new FilmError("the film's steps[0] is null: it is a step, as play, hold, cut or act makes one")
	);
	await expect(stepsGiven(Promise.resolve([]))).rejects.toThrow(
		new FilmError("the film's steps are a promise: they are a list of steps")
	);
	await expect(stepsGiven('steps')).rejects.toThrow(
		new FilmError('the film\'s steps are "steps": they are a list of steps')
	);
});

test('what a film serves in no form of a page served is refused as it is served, what it started stopped first', async () => {
	const stopped: string[] = [];
	const startedWithNoAddress = {
		url: 'http://127.0.0.1:9/',
		[Symbol.asyncDispose]: () => Promise.resolve(void stopped.push('stopped'))
	};
	await expect(servedFrom('about:blank')).rejects.toThrow(
		new FilmError(
			'what the film\'s serve gives is "about:blank": it is a page served, as atAddress gives one: { address }, disposed of'
		)
	);
	await expect(servedFrom(startedWithNoAddress)).rejects.toThrow(FilmError);
	expect(stopped).toEqual(['stopped']);
});

test('a sound or music file named by an empty path is refused as the film is defined', () => {
	expect(() => filmSounding({ click: '' })).toThrow(
		new FilmError('the film\'s sounds.click is "": a sound is a file, or { enabled: false } to turn it off')
	);
	expect(() => filmPlaying({ file: '', volume: 1 })).toThrow(
		new FilmError("the film's music.file is \"\": it is a file's path, from the film's file")
	);
});

/** A film defined with its music at a volume. */
function filmWithMusicAt(volume: number) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		music: { file: './music.ogg', volume }
	});
}

test('music at a volume that is no level is refused as the film is defined: not a number, endless, below none', () => {
	expect(() => filmWithMusicAt(Number.NaN)).toThrow(FilmError);
	expect(() => filmWithMusicAt(Number.POSITIVE_INFINITY)).toThrow(FilmError);
	expect(() => filmWithMusicAt(-1)).toThrow(FilmError);
});

/** A film defined with livereel's sounds written so, as a film whose types nobody checked may write them. */
function filmSounding(sounds: LivereelSoundsScript) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		sounds
	});
}

test('keys livereel cannot lay are refused as the film is defined: a keyboard it has not, a file or off beside a keyboard, a key in no form of one before the pair', () => {
	expect(() => filmSounding({ keyboard: 'typewriter' as KeyboardSound })).toThrow(FilmError);
	expect(() => filmSounding({ keyboard: null } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError(
			"the film's sounds.keyboard is null: it is one of livereel's keyboards: membrane, mechanical, mechanical-bright, butterfly, laptop, clicky"
		)
	);
	expect(() => filmSounding({ keyboard: 'laptop', key: './key.wav' } as LivereelSoundsScript)).toThrow(FilmError);
	expect(() => filmSounding({ keyboard: 'laptop', key: { enabled: false } } as LivereelSoundsScript)).toThrow(
		FilmError
	);
	expect(() => filmSounding({ keyboard: 'laptop', key: null } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError("the film's sounds.key is null: a sound is a file, or { enabled: false } to turn it off")
	);
});

test("each of livereel's sounds a film turns off is off, and the rest stay livereel's", () => {
	const off = { enabled: false } as const;
	const own = { kind: 'livereel' };
	const membrane = { kind: 'keyboard', keyboard: 'membrane' };
	const sounds = [filmSounding({ click: off }), filmSounding({ key: off }), filmSounding({ ending: off })].map(
		(film) => film.formats.get('small')!.sound.livereels
	);
	expect(sounds).toEqual([
		{ click: { kind: 'off' }, key: membrane, ending: own },
		{ click: own, key: { kind: 'off' }, ending: own },
		{ click: own, key: membrane, ending: { kind: 'off' } }
	]);
});

test('a sound written as neither a file nor `{ enabled: false }` is refused as the film is defined, by its name', () => {
	expect(() => filmSounding({ click: null } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError("the film's sounds.click is null: a sound is a file, or { enabled: false } to turn it off")
	);
	expect(() => filmSounding({ key: { enabled: true } } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError('the film\'s sounds.key is {"enabled":true}: a sound is a file, or { enabled: false } to turn it off')
	);
	expect(() => filmSounding({ ending: 42 } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError("the film's sounds.ending is 42: a sound is a file, or { enabled: false } to turn it off")
	);
});

/** A film defined with its music written so, as a film whose types nobody checked may write it. */
function filmPlaying(music: unknown) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		music: music as Music
	});
}

const SOUNDS_FORMS =
	'they are { enabled: false } to turn them all off, or an object of enabled, keyboard, click, key, ending';
const BLUR_FORMS = 'it is { enabled: false } to turn it off, or an object of shutter, exposuresAtMost, either or both';
const MUSIC_FORMS = 'it is an object of file, volume';
const SWITCHED = 'it is false to turn it off, or true, or left out';

test("a film's sounds, blur or music written in none of their forms is refused as the film is defined, where it stands", () => {
	expect(() => filmSounding(null as unknown as LivereelSoundsScript)).toThrow(
		new FilmError(`the film's sounds are null: ${SOUNDS_FORMS}`)
	);
	expect(() => filmSounding([] as unknown as LivereelSoundsScript)).toThrow(
		new FilmError(`the film's sounds are []: ${SOUNDS_FORMS}`)
	);
	expect(() => filmSounding({ enable: false } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError("the film's sounds names enable: it names enabled, keyboard, click, key, ending, or fewer")
	);
	expect(() => filmSounding({ enabled: null } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError(`the film's sounds.enabled is null: ${SWITCHED}`)
	);
	expect(() => blurOfFilm(null as unknown as MotionBlurScript)).toThrow(
		new FilmError(`the film's motionBlur is null: ${BLUR_FORMS}`)
	);
	expect(() => blurOfFilm('off' as unknown as MotionBlurScript)).toThrow(
		new FilmError(`the film's motionBlur is "off": ${BLUR_FORMS}`)
	);
	expect(() => blurOfFilm({ enable: false } as unknown as MotionBlurScript)).toThrow(
		new FilmError("the film's motionBlur names enable: it names enabled, shutter, exposuresAtMost, or fewer")
	);
	expect(() => blurOfFilm({ enabled: null } as unknown as MotionBlurScript)).toThrow(
		new FilmError(`the film's motionBlur.enabled is null: ${SWITCHED}`)
	);
	expect(() => blurOfFilm({ shutter: null } as unknown as MotionBlurScript)).toThrow(
		new FilmError(
			"the film's motionBlur.shutter is null: it is a number more than 0, and 1 at most, the camera's whole way from the frame before"
		)
	);
	expect(() => blurOfFilm({ exposuresAtMost: 4n } as unknown as MotionBlurScript)).toThrow(
		new FilmError("the film's motionBlur.exposuresAtMost is 4n: it is a whole count, 2 or more")
	);
	expect(() => filmPlaying(null)).toThrow(new FilmError(`the film's music is null: ${MUSIC_FORMS}`));
	expect(() => filmPlaying('./music.ogg')).toThrow(new FilmError(`the film's music is "./music.ogg": ${MUSIC_FORMS}`));
	expect(() => filmPlaying({ file: './music.ogg', volume: 1, enabled: false })).toThrow(
		new FilmError("the film's music names enabled: it names file, volume, or fewer")
	);
});

/** The blur a film is shot with, its blur written so. */
function blurOfFilm(motionBlur: MotionBlurScript) {
	const film = defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		motionBlur
	});
	return film.formats.get('small')!.motionBlur;
}

test("a blur given one value keeps livereel's other", () => {
	expect(blurOfFilm({ shutter: 0.5 })).toEqual({ ...blurOfFilm({}), shutter: 0.5 });
});

test('a blur turned off is no blur', () => {
	expect(blurOfFilm({ enabled: false })).toBeNull();
});

test('a film is shot on the stage it names, apart where it names none; a stage livereel has not is refused as the film is defined', () => {
	expect([filmWritten({}), filmWritten({ stage: 'inside' })].map((film) => film.formats.get('small')!.stage)).toEqual([
		'apart',
		'inside'
	]);
	expect(() => filmWritten({ stage: 'within' })).toThrow(
		new FilmError(
			`the film's stage is "within": it is "apart", or "inside" the app's own address for an app that signs in or refuses to be framed`
		)
	);
});

test('a theme in no form of one is refused as the film is defined, where it stands: not an object, a name a theme has not, pixels less than none, a share past 1, a size of none, a way words come up it has not, a colour not in hex, a font of no name', () => {
	const names =
		'ground, glow, ink, quietInk, accent, accentInk, font, mono, titleSize, captionSize, titleMargin, captionGroundHeight, windowCorner, windowEdge, windowShadow, windowShadowColour, terminal, terminalInk, codeComment, codeString, codeNumber, codeKeyword, codeCall, codeKey, terminalWidth, terminalHeight, glowX, glowY, titleWeight, captionWeight, noteSize, calloutSize, pinSize, keysSize, codeSize, terminalSize, endingNameSize, endingLineSize, endingCommandSize, cursorFill, cursorEdge, wordsMotion';
	expect(() => filmWritten({ theme: null })).toThrow(
		new FilmError(`the film's theme is handed null for an object of ${names}`)
	);
	expect(() => filmWritten({ theme: { background: '#000' } })).toThrow(
		new FilmError(`the film's theme names background: it names ${names}, or fewer`)
	);
	expect(() => filmWritten({ theme: { windowCorner: -4 } })).toThrow(
		new FilmError("the film's theme's windowCorner is -4: it is a number of pixels, 0 or more")
	);
	expect(() => filmWritten({ theme: { windowShadow: 2 } })).toThrow(
		new FilmError("the film's theme's windowShadow is 2: it is a number from 0 to 1")
	);
	expect(() => filmWritten({ theme: { captionSize: 0 } })).toThrow(
		new FilmError("the film's theme's captionSize is 0: it is a number of pixels, more than 0")
	);
	expect(() => filmWritten({ theme: { wordsMotion: 'bouncy' } })).toThrow(
		new FilmError(`the film's theme's wordsMotion is "bouncy": it is how words come up: "soft", "sharp" or "still"`)
	);
	expect(() => filmWritten({ theme: { ground: 'navy' } })).toThrow(
		new FilmError(`the film's theme's ground is "navy": it is a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa`)
	);
	expect(() => filmWritten({ theme: { font: '' } })).toThrow(
		new FilmError(
			`the film's theme's font is "": it is a font's family, as CSS names one: 'Inter', or 'Inter, sans-serif'`
		)
	);
});

test("a format's split in no form of one is refused as the film is defined, where it stands: a name a split has not, a share past 1, a margin less than none", () => {
	expect(() => filmWritten({ formats: { small: { ...SMALL, split: { gap: 10 } } } })).toThrow(
		new FilmError(
			"the film's small format's split names gap: it names wordsShare, windowMargin, wordsMargin, wordsGap, or fewer"
		)
	);
	expect(() => filmWritten({ formats: { small: { ...SMALL, split: { wordsShare: 2 } } } })).toThrow(
		new FilmError("the film's small format's split's wordsShare is 2: it is a number from 0 to 1")
	);
	expect(() => filmWritten({ formats: { small: { ...SMALL, split: { windowMargin: -1 } } } })).toThrow(
		new FilmError("the film's small format's split's windowMargin is -1: it is a number of pixels, 0 or more")
	);
});

test("a format's split that leaves the words or the window no room on its frame is refused as the film is defined: no share, the whole share, margins wider than the share", () => {
	const roomless = new FilmError(
		"the film's small format's split leaves the words or the window no room on its frame: a share further from 0 and 1, or narrower margins"
	);
	expect(() => filmWritten({ formats: { small: { ...SMALL, split: { wordsShare: 0 } } } })).toThrow(roomless);
	expect(() => filmWritten({ formats: { small: { ...SMALL, split: { wordsShare: 1 } } } })).toThrow(roomless);
	expect(() => filmWritten({ formats: { small: { ...SMALL, split: { wordsMargin: 400 } } } })).toThrow(roomless);
});

test("a format's own places are refused as the film is defined, by the format, where they take a name of livereel's or none, name no place, or stand in themselves through one another", () => {
	const placed = (places: object) => () => filmWritten({ formats: { small: { ...SMALL, places } } });
	expect(placed({ left: 'right' })).toThrow(
		new FilmError(
			"the film's small format's places name left, a place of livereel's: name the format's own places otherwise"
		)
	);
	expect(placed({ '': 'right' })).toThrow(
		new FilmError("the film's small format's places name one by no name: give each a name with something in it")
	);
	expect(placed({ words: { of: 'nowhere' } })).toThrow(
		new FilmError(
			`the film's small format's place "words" names "nowhere": a place is whole, left, right, top or bottom, or one its format names: words`
		)
	);
	expect(placed({ start: 'heading', heading: 'words', words: { of: 'heading' } })).toThrow(
		new FilmError(`the film's small format's place "heading" stands in itself: heading, words, heading`)
	);
});

test("a place a move names that is none of livereel's nor its format's is refused as the steps are made, by the move and the format, before a frame is shot", async () => {
	await expect(stepsGiven([play({ seconds: 1, moves: [title.show('Here', { at: { of: 'lft' } })] })])).rejects.toThrow(
		new FilmError(
			`title.show's at names "lft", no place of the film's small format: a place is whole, left, right, top or bottom, and its format names none of its own`
		)
	);
});

test("a film opens on livereel's look with its theme's values; a ground named without a glow is a ground of one colour, and one named with its glow keeps it", () => {
	const looks = [{ ground: '#ffffff' }, { ground: '#ffffff', glow: '#eeeeee' }].map(
		(theme) => filmWritten({ theme }).formats.get('small')!.look
	);
	expect(looks).toEqual([
		{ ...LIVEREELS_LOOK, ground: '#ffffff', glow: '#ffffff' },
		{ ...LIVEREELS_LOOK, ground: '#ffffff', glow: '#eeeeee' }
	]);
});

test('a blur that cannot be shot is refused as the film is defined: a shutter shut or open past the frame before, too few exposures or a broken count', () => {
	expect(() => blurOfFilm({ shutter: 0 })).toThrow(FilmError);
	expect(() => blurOfFilm({ shutter: 1.5 })).toThrow(FilmError);
	expect(() => blurOfFilm({ shutter: Number.NaN })).toThrow(FilmError);
	expect(() => blurOfFilm({ exposuresAtMost: 1 })).toThrow(FilmError);
	expect(() => blurOfFilm({ exposuresAtMost: 2.5 })).toThrow(FilmError);
});
