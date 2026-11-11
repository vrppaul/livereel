// A film in its formats: each by its name, and the steps told which one they are shot in; its music's volume, its
// keys, and its blur
import { expect, test } from 'vitest';
import { wholePose } from '../../src/domain/camera.ts';
import { FilmError } from '../../src/domain/errors.ts';
import { linear } from '../../src/domain/curves.ts';
import type { MotionBlurScript } from '../../src/direction/blur.ts';
import { defineFilm } from '../../src/direction/film.ts';
import { play } from '../../src/direction/steps.ts';
import { act } from '../../src/moves/act.ts';
import * as camera from '../../src/moves/camera.ts';
import * as title from '../../src/moves/title.ts';
import { to as windowTo } from '../../src/moves/window.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import type { KeyboardSound, LivereelSoundsScript, Music } from '../../src/direction/sound.ts';
import { SMALL } from './fakes.ts';

const TALL = { frame: { width: 400, height: 600 }, screen: { width: 400, height: 600 } };

test('the steps are handed the name of the format the film is shot in', () => {
	const named: string[] = [];
	const film = defineFilm({
		formats: { small: SMALL, tall: TALL },
		address: 'about:blank',
		ready: () => Promise.resolve(),
		steps: (_whole, formatName) => {
			named.push(formatName);
			return [];
		}
	});
	film.formats.get('tall')!.steps(wholePose(TALL));
	expect(named).toEqual(['tall']);
});

/** A film written so, as a film whose types nobody checked may write it, the rest of it as a film needs. */
function filmWritten(written: object) {
	return defineFilm({
		formats: { small: SMALL },
		address: 'about:blank',
		ready: () => Promise.resolve(),
		steps: () => [],
		...written
	} as never);
}

/** The steps a film gives, as livereel reads them before its page is served. */
function stepsGiven(steps: unknown) {
	return filmWritten({ steps: () => steps })
		.formats.get('small')!
		.steps(wholePose(SMALL));
}

test('a film in no form of one is refused as it is defined, where it stands: its names, its formats and where their captions stand, its functions', () => {
	expect(() => defineFilm(null as never)).toThrow(
		new FilmError(
			'the film is null: it is an object of formats, address, serve, stage, ready, set, steps, sounds, music, motionBlur, theme, fonts, world, framesPerSecond, eye, colourScheme, blurred, page, drawing, things'
		)
	);
	expect(() => filmWritten({ motionblur: {} })).toThrow(
		new FilmError(
			'the film names motionblur: it names formats, address, serve, stage, ready, set, steps, sounds, music, motionBlur, theme, fonts, world, framesPerSecond, eye, colourScheme, blurred, page, drawing, things, or fewer'
		)
	);
	expect(() => filmWritten({ colourScheme: 'night' })).toThrow(
		new FilmError('the film\'s colourScheme is "night": it is "light" or "dark"')
	);
	expect(() => filmWritten({ page: 'moving' })).toThrow(
		new FilmError(
			'the film\'s page is "moving": it is "static", changed by the film, or "dynamic" for a page that changes of itself, as an animation or live data does'
		)
	);
	expect(() => filmWritten({ framesPerSecond: 29.97 })).toThrow(
		new FilmError("the film's framesPerSecond is 29.97: it is a whole count, 1 or more")
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
});

test('where a film says its page is, in no form of a place, is refused as it is defined: no address, a serve command that is no string, a page a command serves at an address no HTTP reaches', () => {
	expect(() => filmWritten({ address: undefined })).toThrow(
		new FilmError("the film's address is undefined: it is an address: a page's URL, a string")
	);
	expect(() => filmWritten({ address: 'http://127.0.0.1:5173/', serve: ['npx', 'vite'] })).toThrow(
		new FilmError(
			'the film\'s serve is ["npx","vite"]: it is a command, as a shell runs it: a string with something in it'
		)
	);
	expect(() => filmWritten({ address: 'file:///film/page.html', serve: 'npx vite' })).toThrow(
		new FilmError(
			'the film\'s address is "file:///film/page.html": a page its serve command serves is at an http or https address'
		)
	);
});

test('steps a film gives in no form of a list of steps are refused as they are read in a format: a click or a typing not spread, a step written by hand in no form of one, anything else', () => {
	expect(() => stepsGiven([[act(() => Promise.resolve())]])).toThrow(
		new FilmError(
			"the film's steps[0] is a list: spread the steps cursor.click and typing give among the others, as ...cursor.click(action)"
		)
	);
	expect(() => stepsGiven([{ kind: 'play', seconds: 1 }])).toThrow(
		new FilmError("the film's steps[0]'s moves is undefined: it is a list of moves")
	);
	expect(() =>
		stepsGiven([{ kind: 'play', seconds: 1, moves: [camera.onto('#a'), camera.onto('#b')], ease: linear }])
	).toThrow(new FilmError('two moves on the camera at once in one step'));
	expect(() => stepsGiven([null])).toThrow(
		new FilmError("the film's steps[0] is null: it is a step, as play, hold, cut or act makes one")
	);
	expect(() => stepsGiven(Promise.resolve([]))).toThrow(
		new FilmError("the film's steps are a promise: they are a list of steps")
	);
	expect(() => stepsGiven('steps')).toThrow(new FilmError('the film\'s steps are "steps": they are a list of steps'));
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
		address: 'about:blank',
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
		address: 'about:blank',
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
		address: 'about:blank',
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
		address: 'about:blank',
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

test('a film is shot on the stage it names, apart where it names none; a stage livereel has not, or inside the app for a static page, is refused as the film is defined', () => {
	const films = [filmWritten({}), filmWritten({ stage: 'inside', page: 'dynamic' })];
	expect(films.map((film) => film.formats.get('small')!.stage)).toEqual(['apart', 'inside']);
	expect(() => filmWritten({ stage: 'within' })).toThrow(
		new FilmError(
			`the film's stage is "within": it is "apart", or "inside" the app's own address for a dynamic page that signs in or refuses to be framed`
		)
	);
	expect(() => filmWritten({ stage: 'inside' })).toThrow(
		new FilmError(
			'the film\'s stage is "inside", which frames a dynamic page live: a static page is filmed in a tab of its own, signed in as it signs in and refused no frame, so leave the stage out, or give page: "dynamic"'
		)
	);
});

test('a film is drawn as it names, flat where it names none; a drawing livereel has not, or the room for a dynamic page, is refused as the film is defined', () => {
	const films = [filmWritten({}), filmWritten({ drawing: 'room' })];
	expect(films.map((film) => film.formats.get('small')!.drawing)).toEqual(['flat', 'room']);
	expect(() => filmWritten({ drawing: 'cube' })).toThrow(
		new FilmError(
			'the film\'s drawing is "cube": it is "flat", drawn by the browser as it draws a page, or "room", the window drawn in WebGL as a plane where the eye sees it'
		)
	);
	expect(() => filmWritten({ drawing: 'room', page: 'dynamic' })).toThrow(
		new FilmError(
			'the film\'s drawing is "room", which draws the page from its picture: a dynamic page stands live in a frame of its own site, which WebGL is given blank, so leave the page out for a static one, or the drawing for a flat one'
		)
	);
});

test("a film's things module is its path, none where it names none; refused in a film not drawn as a room, and where it names no JavaScript", () => {
	const films = [filmWritten({}), filmWritten({ drawing: 'room', things: './things.js' })];
	expect(films.map((film) => film.formats.get('small')!.things)).toEqual([null, './things.js']);
	expect(() => filmWritten({ things: './things.js' })).toThrow(
		new FilmError(
			'the film names its things, which stand in the world the room draws in WebGL: name drawing: "room", or leave the things out of a flat film'
		)
	);
	expect(() => filmWritten({ drawing: 'room', things: './things.ts' })).toThrow(
		new FilmError(
			"the film's things is \"./things.ts\": it is a JavaScript module's path, from the film's file, ending in .js"
		)
	);
});

test("a film's own fonts are its files, each by the family it sets, none where it names none; fonts in no form of families and paths are refused as the film is defined", () => {
	const films = [filmWritten({}), filmWritten({ fonts: { 'Inter Tight': './InterTight.ttf', Mono: 'mono.woff2' } })];
	expect(films.map((film) => film.formats.get('small')!.fonts)).toEqual([
		[],
		[
			{ family: 'Inter Tight', file: './InterTight.ttf' },
			{ family: 'Mono', file: 'mono.woff2' }
		]
	]);
	expect(() => filmWritten({ fonts: './InterTight.ttf' })).toThrow(
		new FilmError(
			"the film's fonts is \"./InterTight.ttf\": it is the film's font files by the family each sets: { 'Inter Tight': './InterTight.ttf' }"
		)
	);
	expect(() => filmWritten({ fonts: { 'Inter Tight': '' } })).toThrow(
		new FilmError("the film's fonts's Inter Tight is \"\": it is a file's path, from the film's file")
	);
});

test("a film's eye sees 24° across the frame's shorter side where it names no angle, else the angle it names, standing so far from the frame at rest; an angle of view in no form of one is refused as the film is defined", () => {
	const films = [filmWritten({}), filmWritten({ eye: { angleOfView: 90 } })];
	// Half the frame's 1080 over the tangent of half the angle: 540 / tan 12°, and 540 / tan 45°
	expect(films.map((film) => film.formats.get('small')!.focalLength)).toEqual([
		expect.closeTo(2540.5, 2),
		expect.closeTo(540)
	]);
	expect(() => filmWritten({ eye: { angleOfView: 0 } })).toThrow(
		new FilmError(
			"the film's eye's angleOfView is 0: it is degrees the eye sees across the frame's shorter side, more than 0 and less than 180"
		)
	);
	expect(() => filmWritten({ eye: { angleOfView: 180 } })).toThrow(
		new FilmError(
			"the film's eye's angleOfView is 180: it is degrees the eye sees across the frame's shorter side, more than 0 and less than 180"
		)
	);
	expect(() => filmWritten({ eye: { fov: 24 } })).toThrow(
		new FilmError("the film's eye names fov: it names angleOfView, or fewer")
	);
});

test("a depth that brings something as near as the film's eye at rest or nearer is refused as the steps are read, before anything is shot, by the eye's focal length: an object's, the window's", () => {
	const nearing = (depth: number) => [play({ seconds: 1, moves: [title.to('left', { depth })] })];
	expect(() => stepsGiven(nearing(2600))).toThrow(
		new FilmError(
			"title.to's depth is 2600: it brings it as near as the eye at rest or nearer, 2540.5 from the frame, where it is never seen; bring it less near"
		)
	);
	expect(() => stepsGiven([play({ seconds: 1, moves: [title.effects({ depth: 2541 })] })])).toThrow(
		new FilmError(
			"title.effects's depth is 2541: it brings it as near as the eye at rest or nearer, 2540.5 from the frame, where it is never seen; bring it less near"
		)
	);
	expect(() => stepsGiven([play({ seconds: 1, moves: [windowTo('right', { depth: 2541 })] })])).toThrow(
		new FilmError(
			"window.to's depth is 2541: it brings it as near as the eye at rest or nearer, 2540.5 from the frame, where it is never seen; bring it less near"
		)
	);
	const wide = filmWritten({ eye: { angleOfView: 90 }, steps: () => nearing(600) });
	expect(() => wide.formats.get('small')!.steps(wholePose(SMALL))).toThrow(
		new FilmError(
			"title.to's depth is 600: it brings it as near as the eye at rest or nearer, 540.0 from the frame, where it is never seen; bring it less near"
		)
	);
	expect(stepsGiven(nearing(2500))).toHaveLength(1);
});

test("a film's set is shot 3 times as sharp as its page where it names no sharpness; a set in no form of one, or one for a dynamic page, is refused as the film is defined", () => {
	const scenario = () => Promise.resolve();
	const films = [
		filmWritten({ set: { scenario, targets: ['#refresh'] } }),
		filmWritten({ set: { scenario, targets: [], sharpness: 2 } })
	];
	expect(films.map((film) => film.formats.get('small')!.set!.sharpness)).toEqual([3, 2]);
	expect(() => filmWritten({ set: { targets: [] } })).toThrow(
		new FilmError("the film's set's scenario is undefined: it is a function")
	);
	expect(() => filmWritten({ set: { scenario, targets: '#refresh' } })).toThrow(
		new FilmError('the film\'s set\'s targets is "#refresh": it is a list of selectors')
	);
	expect(() => filmWritten({ set: { scenario, targets: [], sharpness: 0 } })).toThrow(
		new FilmError(
			"the film's set's sharpness is 0: it is how many of a picture's pixels a page's pixel takes, more than 0"
		)
	);
	expect(() => filmWritten({ set: { scenario, targets: [] }, page: 'dynamic' })).toThrow(
		new FilmError(
			'the film names a set, whose pictures change only as its acts show another state: leave page: "dynamic" out, or film the live page, without the set'
		)
	);
});

test("a theme in no form of one is refused as the film is defined, where it stands: not an object, a name a theme has not, a value of the world's look or of the window's body by its name, pixels less than none, a share past 1, a size of none, a way words come up it has not, a colour not in hex, a font of no name", () => {
	const names =
		'ground, glow, groundLayers, ink, quietInk, accent, accentInk, font, mono, titleSize, captionSize, titleMargin, captionGroundHeight, paneCorner, paneEdge, paneShadow, paneShadowColour, terminal, terminalInk, codeComment, codeString, codeNumber, codeKeyword, codeCall, codeKey, glowX, glowY, titleWeight, captionWeight, titleLetterSpacing, titleLineHeight, noteSize, calloutSize, pinSize, keysSize, codeSize, terminalSize, endingNameSize, endingLineSize, endingCommandSize, codeLineHeight, cursorFill, cursorEdge, words';
	expect(() => filmWritten({ theme: null })).toThrow(
		new FilmError(`the film's theme is handed null for an object of ${names}`)
	);
	expect(() => filmWritten({ theme: { background: '#000' } })).toThrow(
		new FilmError(`the film's theme names background: it names ${names}, or fewer`)
	);
	expect(() => filmWritten({ theme: { lights: [] } })).toThrow(
		new FilmError(`the film's theme names lights: it names ${names}, or fewer`)
	);
	expect(() => filmWritten({ theme: { windowThickness: 24 } })).toThrow(
		new FilmError(`the film's theme names windowThickness: it names ${names}, or fewer`)
	);
	expect(() => filmWritten({ theme: { paneCorner: -4 } })).toThrow(
		new FilmError("the film's theme's paneCorner is -4: it is a number of pixels, 0 or more")
	);
	expect(() => filmWritten({ theme: { paneShadow: 2 } })).toThrow(
		new FilmError("the film's theme's paneShadow is 2: it is a number from 0 to 1")
	);
	expect(() => filmWritten({ theme: { captionSize: 0 } })).toThrow(
		new FilmError("the film's theme's captionSize is 0: it is a number of pixels, more than 0")
	);
	expect(() => filmWritten({ theme: { words: 'bouncy' } })).toThrow(
		new FilmError(
			`the film's theme's words is "bouncy": it is how words come up: "rise", "sharp", "fade", "blur", "mask", "letters" or "scramble"`
		)
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

test("a film opens on livereel's world, with no light, no glow and no grain, where it names none, and on the values of the world it names, the rest livereel's: grain held as the levels it moves a colour either way, none turned off", () => {
	const overhead = {
		colour: '#fff',
		strength: 1,
		at: { across: 0, down: -800, out: 600 },
		aim: { across: 0, down: 0, out: 0 },
		angle: 30,
		softness: 1
	};
	const [unnamed, named, unGrained] = [
		filmWritten({}),
		filmWritten({ world: { lights: [overhead], bloom: 0.45, grain: { levels: 1.5 } } }),
		filmWritten({ world: { grain: { enabled: false } } })
	];
	expect([unnamed, named, unGrained].map((film) => film.formats.get('small')!.world)).toEqual([
		{ lights: [], softBoxes: [], bloom: 0, bloomRadius: 0.4, grain: 0 },
		{ lights: [overhead], softBoxes: [], bloom: 0.45, bloomRadius: 0.4, grain: 1.5 },
		{ lights: [], softBoxes: [], bloom: 0, bloomRadius: 0.4, grain: 0 }
	]);
});

test("a world in no form of one is refused as the film is defined, where it stands: not an object, a name the world has not, a value of the film's look by its name, a light whose cone opens a half-turn, that aims where it stands or whose colour has an alpha three reads none of, a soft box spanning a half-turn or turned up past straight up, a glow of a strength below none, grain as a bare number, of no levels or turned off with levels", () => {
	const names = 'lights, softBoxes, bloom, bloomRadius, grain';
	const light = {
		colour: '#fff',
		strength: 1,
		at: { across: 0, down: -800, out: 600 },
		aim: { across: 0, down: 0, out: 0 },
		angle: 30,
		softness: 1
	};
	const softBox = { colour: '#fff', brightness: 4, round: -15, up: 24, width: 10, height: 40, lean: 24 };
	expect(() => filmWritten({ world: null })).toThrow(
		new FilmError(`the film's world is handed null for an object of ${names}`)
	);
	expect(() => filmWritten({ world: { vignette: 0.2 } })).toThrow(
		new FilmError(`the film's world names vignette: it names ${names}, or fewer`)
	);
	expect(() => filmWritten({ world: { grain: 0.2 } })).toThrow(
		new FilmError(
			"the film's world's grain is 0.2: it is { enabled: false } for none, or grain of so many levels: { levels }"
		)
	);
	expect(() => filmWritten({ world: { grain: { levels: 0 } } })).toThrow(
		new FilmError(
			"the film's world's grain's levels is 0: it is how many levels of 255 grain moves a colour either way, a number more than 0"
		)
	);
	expect(() => filmWritten({ world: { grain: { enabled: false, levels: 1 } } })).toThrow(
		new FilmError("the film's world's grain names enabled: it names levels, or fewer")
	);
	expect(() => filmWritten({ world: { ground: '#000' } })).toThrow(
		new FilmError(`the film's world names ground: it names ${names}, or fewer`)
	);
	expect(() => filmWritten({ world: { bloom: -0.5 } })).toThrow(
		new FilmError(
			"the film's world's bloom is -0.5: it is how strongly light past white glows, a number, 0 or more, as three's bloom takes it"
		)
	);
	expect(() => filmWritten({ world: { lights: [{ ...light, angle: 90 }] } })).toThrow(
		new FilmError(
			"the film's world's lights[0]'s angle is 90: it is how far its cone opens from its middle, in degrees, more than 0 and less than 90"
		)
	);
	expect(() => filmWritten({ world: { lights: [light, { ...light, aim: light.at }] } })).toThrow(
		new FilmError("the film's world's lights[1] aims at the spot it stands at: it aims away from where it stands")
	);
	expect(() => filmWritten({ world: { lights: [{ ...light, colour: '#ff000080' }] } })).toThrow(
		new FilmError(
			`the film's world's lights[0]'s colour is "#ff000080": it is a colour in hex with no alpha: #rgb or #rrggbb`
		)
	);
	expect(() => filmWritten({ world: { softBoxes: [{ ...softBox, width: 180 }] } })).toThrow(
		new FilmError(
			"the film's world's softBoxes[0]'s width is 180: it is how far it spans seen from the room's middle, in degrees, more than 0 and less than 180"
		)
	);
	expect(() => filmWritten({ world: { softBoxes: [{ ...softBox, up: 100 }] } })).toThrow(
		new FilmError(
			"the film's world's softBoxes[0]'s up is 100: it is how far up from level it stands, in degrees, from -90 to 90"
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

test("a place a move names that is none of livereel's nor its format's is refused as the steps are made, by the move and the format, before a frame is shot", () => {
	expect(() => stepsGiven([play({ seconds: 1, moves: [title.show('Here', { at: { of: 'lft' } })] })])).toThrow(
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
