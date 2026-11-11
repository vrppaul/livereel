// What a film hands each function it calls, as a film whose types nobody checked may hand it: refused where it
// stands, down to the item or the name at fault, where it is in no form the function takes; taken where it is
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import {
	act,
	callout,
	camera,
	caption,
	code,
	cursor,
	cut,
	ending,
	group,
	hold,
	keystrokes,
	lens,
	light,
	look,
	outline,
	page,
	piece,
	play,
	screen,
	sound,
	terminal,
	title,
	typing,
	window as pageWindow,
	world
} from '../../src/index.ts';

const POSE = { focusX: 0, focusY: 0, zoom: 1 };
const CARD = { name: 'livereel', line: 'Your agent films your live app', command: 'npx livereel' };
const SELECTOR = 'a selector: a string that names blocks of the page';
const TARGET =
	"a selector: a string that names blocks of the page, or a box of the page's screen: { left, top, width, height }, in its pixels";
const FILE = "a file's path, from the film's file";
const CURVE = 'a curve: a function of progress, as easeInOutSine';
const SHARE = 'a share of the step: { start, end }';
const A_MOVE = 'a move, as camera.onto or light.on makes one';
const STROKE = { at: 0, typed: 'l' };
const SIDE = 'a side of the frame: "left", "right", "top" or "bottom"';
const PLACE =
	'a place: "whole", "left", "right", "top", "bottom" or a name its format gives, or { of, left, top, width, height }, each in shares';
const WORDING = 'words: a string, or a list of strings and runs';
const RUN = 'words: a string, or a run of them set its own way, { text, italic, underline, strike, ink, marker }';
const COLOUR = 'a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa';

test('every function a film calls refuses what it is handed in no form it takes, where it stands', () => {
	expect(() => camera.onto(null as never)).toThrow(new FilmError(`camera.onto's target is null: it is ${TARGET}`));
	expect(() => camera.onto({ left: 10 } as never)).toThrow(
		new FilmError("camera.onto's target's top is undefined: it is a number")
	);
	expect(() => camera.onto('#block', { air: '80' as never })).toThrow(
		new FilmError('camera.onto\'s air is "80": it is a number of pixels, 0 or more')
	);
	expect(() => camera.onto('#block', { airr: 80 } as never)).toThrow(
		new FilmError(
			'camera.onto names airr: it names every, air, zoomAtMost, through, shape, pace, within, ease, or fewer'
		)
	);
	expect(() => camera.onto('#block', { every: 1.5 })).toThrow(
		new FilmError("camera.onto's every is 1.5: it is a whole count, 1 or more")
	);
	expect(() => camera.onto('#block', 5 as never)).toThrow(
		new FilmError('camera.onto is handed 5 for an object of every, air, zoomAtMost, through, shape, pace, within, ease')
	);
	expect(() => pageWindow.show({ at: 'right' } as never)).toThrow(
		new FilmError(`window.show's from is undefined: it is ${SIDE}`)
	);
	expect(() => pageWindow.to('')).toThrow(new FilmError(`window.to's place is "": it is ${PLACE}`));
	expect(() => camera.to({ zoom: 1 } as never)).toThrow(
		new FilmError("camera.to's pose's focusX is undefined: it is a number")
	);
	expect(() => pageWindow.lean({ tilt: 'up' as never })).toThrow(
		new FilmError('window.lean\'s tilt is "up": it is a number')
	);
	expect(() => pageWindow.lean({ over: 'half' as never })).toThrow(
		new FilmError('window.lean\'s over is "half": it is a number')
	);
	expect(() => light.on(null as never)).toThrow(new FilmError(`light.on's target is null: it is ${TARGET}`));
	expect(() => light.on('#block', { dim: null as never })).toThrow(
		new FilmError("light.on's dim is null: it is a number from 0 to 1")
	);
	expect(() => light.to(5 as never)).toThrow(new FilmError(`light.to's target is 5: it is ${TARGET}`));
	expect(() => light.to('#block', { dim: 0.5 } as never)).toThrow(
		new FilmError('light.to names dim: it names within, ease, or fewer')
	);
	expect(() => light.off({ within: { start: '0' as never } })).toThrow(
		new FilmError('light.off\'s within\'s start is "0": it is a number')
	);
	expect(() => cursor.to(null as never)).toThrow(new FilmError(`cursor.to's target is null: it is ${TARGET}`));
	expect(() => cursor.to('#block', { entering: { x: 1 } as never })).toThrow(
		new FilmError("cursor.to's entering names x: it names left, top, or fewer")
	);
	expect(() => cursor.to('#block', { into: { left: 1.2, top: 0.5 } })).toThrow(
		new FilmError("cursor.to's into's left is 1.2: it is a number from 0 to 1")
	);
	expect(() => cursor.press({ sound: null as never })).toThrow(
		new FilmError(`cursor.press's sound is null: it is ${FILE}`)
	);
	expect(() => cursor.release({ ease: 'linear' as never })).toThrow(
		new FilmError(`cursor.release's ease is "linear": it is ${CURVE}`)
	);
	expect(() => cursor.click('click' as never)).toThrow(
		new FilmError('cursor.click\'s action is "click": it is a function')
	);
	expect(() => cursor.click(() => Promise.resolve(), { sound: '' })).toThrow(
		new FilmError(`cursor.click's sound is "": it is ${FILE}`)
	);
	expect(() => caption.show(42 as never)).toThrow(new FilmError(`caption.show's text is 42: it is ${WORDING}`));
	expect(() => caption.show(['Your', 7] as never)).toThrow(new FilmError(`caption.show's text[1] is 7: it is ${RUN}`));
	expect(() => caption.show([{ text: 'live', ink: 'red' }])).toThrow(
		new FilmError(`caption.show's text[0]'s ink is "red": it is ${COLOUR}`)
	);
	expect(() => caption.show([{ text: 'live', italic: false as never }])).toThrow(
		new FilmError("caption.show's text[0]'s italic is false: it is true, or left out")
	);
	expect(() => caption.show([{ text: 'live', bold: true } as never])).toThrow(
		new FilmError("caption.show's text[0] names bold: it names text, italic, underline, strike, ink, marker, or fewer")
	);
	expect(() => caption.show('Hello', { ease: 2 as never })).toThrow(
		new FilmError(`caption.show's ease is 2: it is ${CURVE}`)
	);
	expect(() => caption.hide({ within: [] as never })).toThrow(
		new FilmError(`caption.hide's within is []: it is ${SHARE}`)
	);
	expect(() => callout.show(null as never, 'Here')).toThrow(
		new FilmError(`callout.show's target is null: it is ${TARGET}`)
	);
	expect(() => callout.show('#block', 'Here', { side: 'top' as never })).toThrow(
		new FilmError('callout.show\'s side is "top": it is a side of the block: "above", "below", "left" or "right"')
	);
	expect(() => title.show({ text: 'Hello' } as never)).toThrow(
		new FilmError(`title.show's text is {"text":"Hello"}: it is ${WORDING}`)
	);
	expect(() => title.show([{ text: 'Hello', marker: '#ffd54' }])).toThrow(
		new FilmError(`title.show's text[0]'s marker is "#ffd54": it is ${COLOUR}`)
	);
	expect(() => title.show('Hello', { at: { of: 7 } as never })).toThrow(
		new FilmError(`title.show's at's of is 7: it is ${PLACE}`)
	);
	expect(() => code.show('x', { at: { width: 0 } })).toThrow(
		new FilmError("code.show's at's width is 0: it is a share more than none")
	);
	expect(() => code.to('left', { scale: 0 })).toThrow(
		new FilmError("code.to's scale is 0: it is a scale, more than 0, 1 as large as its place")
	);
	expect(() => title.to('left', { depth: '200' as never })).toThrow(
		new FilmError('title.to\'s depth is "200": it is a number')
	);
	expect(() => terminal.lean({ roll: '90' as never })).toThrow(
		new FilmError('terminal.lean\'s roll is "90": it is a number')
	);
	expect(() => piece.show(5 as never)).toThrow(new FilmError(`piece.show's target is 5: it is ${TARGET}`));
	expect(() => piece.show('#chart', { from: 'left' } as never)).toThrow(
		new FilmError(
			'piece.show names from: it names every, air, corner, hole, lines, picture, inside, body, rides, letters, enter, edge, within, ease, as, group, zIndex, effects, or fewer'
		)
	);
	expect(() => piece.show('#chart', { letters: 5 as never })).toThrow(
		new FilmError("piece.show's letters is 5: it is a selector: a string that names blocks of the page")
	);
	expect(() => piece.show('#chart', { inside: 'world', body: { walls: '#e6e8ec' } as never })).toThrow(
		new FilmError("piece.show's body's thickness is undefined: it is a number of pixels, 0 or more")
	);
	expect(() => piece.show('#chart', { inside: 'world', body: { thickness: 12, walls: '#e6e8ec80' } })).toThrow(
		new FilmError(`piece.show's body's walls is "#e6e8ec80": it is a colour in hex with no alpha: #rgb or #rrggbb`)
	);
	expect(() => piece.show('#chart', { picture: 'frozen' as never })).toThrow(
		new FilmError(
			`piece.show's picture is "frozen": it is what a piece is drawn from: "following", the page's picture as it changes, or "held", a picture of its source held as it is lifted`
		)
	);
	expect(() => piece.onto(5 as never)).toThrow(new FilmError(`piece.onto's target is 5: it is ${TARGET}`));
	expect(() => piece.onto('#chart', { scale: 2 } as never)).toThrow(
		new FilmError('piece.onto names scale: it names fall, as, within, ease, or fewer')
	);
	expect(() => code.show('x', { at: 'left', group: '' })).toThrow(
		new FilmError(`code.show's group is "": it is a name, a string with something in it`)
	);
	expect(() => group.show({ at: 5 as never })).toThrow(new FilmError(`group.show's at is 5: it is ${PLACE}`));
	expect(() => group.to('whole', { scale: 0 })).toThrow(
		new FilmError("group.to's scale is 0: it is a scale, more than 0, 1 as large as its place")
	);
	expect(() => group.lean({ roll: 'half' as never })).toThrow(
		new FilmError('group.lean\'s roll is "half": it is a number')
	);
	expect(() => group.hide({ toward: 'left' } as never)).toThrow(
		new FilmError('group.hide names toward: it names as, within, ease, or fewer')
	);
	expect(() => piece.show('#chart', { hole: { ground: 'blue' } })).toThrow(
		new FilmError(
			`piece.show's hole's ground is "blue": it is the ground the page draws behind the block, "page", or a colour in hex`
		)
	);
	expect(() => piece.show('#chart', { hole: { reach: -3 } })).toThrow(
		new FilmError("piece.show's hole's reach is -3: it is a number of pixels, 0 or more")
	);
	expect(() => piece.show('#chart', { hole: { pit: { glow: 0.02 } as never } })).toThrow(
		new FilmError("piece.show's hole's pit's depth is undefined: it is a number of pixels, 0 or more")
	);
	expect(() => outline.show('#chart', { line: 'dotted' as never })).toThrow(
		new FilmError(`outline.show's line is "dotted": it is how a line is drawn: "solid" or "dashed"`)
	);
	expect(() => lens.show('#chart', { magnification: 0 })).toThrow(
		new FilmError(
			"lens.show's magnification is 0: it is a magnification, more than 0, 2 showing the page twice as large as the camera"
		)
	);
	expect(() => title.hide({ at: 'left' } as never)).toThrow(
		new FilmError('title.hide names at: it names words, toward, leave, edge, within, ease, as, or fewer')
	);
	expect(() => title.show('ab', { enter: 'spin' as never })).toThrow(
		new FilmError(
			`title.show's enter is "spin": it is how an object comes up in its place or goes from it: "fade", "mask", "wipe", "iris" or "grow"`
		)
	);
	expect(() => caption.show('ab', { words: 'bounce' as never })).toThrow(
		new FilmError(
			`caption.show's words is "bounce": it is how words come up: "rise", "sharp", "fade", "blur", "mask", "letters" or "scramble", or typed, { typed: { seed, keyboard } }, or word by word at a pace, { way, atOnce }`
		)
	);
	expect(() => title.show('ab', { words: { typed: { seed: 'one' as never } } })).toThrow(
		new FilmError(`title.show's words's typed's seed is "one": it is a number`)
	);
	expect(() => title.show('ab', { words: { way: 'letters' as never, atOnce: 2 } })).toThrow(
		new FilmError(
			`title.show's words's way is "letters": it is how words come up word by word: "rise", "sharp", "fade", "blur" or "mask"`
		)
	);
	expect(() => caption.show('ab', { words: { way: 'mask', atOnce: 0 } })).toThrow(
		new FilmError(`caption.show's words's atOnce is 0: it is how many words are on their way at once, more than 0`)
	);
	expect(() => screen.rise({ within: { start: null as never } })).toThrow(
		new FilmError("screen.rise's within's start is null: it is a number")
	);
	expect(() => screen.shows('page' as never)).toThrow(
		new FilmError(
			`screen.shows's page is "page": it is the filmed page, "filmed", or a page of the film's own, { html }`
		)
	);
	expect(() => screen.shows({ html: '' })).toThrow(
		new FilmError(`screen.shows's page's html is "": it is a page in HTML, a string with something in it`)
	);
	expect(() => screen.shows('filmed', { within: { end: 1 } as never })).toThrow(FilmError);
	expect(() => screen.behind('filmed' as never)).toThrow(
		new FilmError(`screen.behind's page is "filmed": it is a page of the film's own, { html }, or none, "none"`)
	);
	expect(() => screen.behind({ html: '<p>Behind</p>' }, { upright: 'up' as never })).toThrow(
		new FilmError(
			`screen.behind's upright is "up": it is how the page stands upright: once the window is turned over round its width, "over", or round its upright, "round"`
		)
	);
	expect(() => screen.scrolls('filmed' as never, { pace: 480 })).toThrow(
		new FilmError(
			`screen.scrolls's page is "filmed": it is a page of the film's own, { html }; the filmed page scrolls by page.scrollBy or page.scrollTo`
		)
	);
	expect(() => screen.scrolls({ html: '<p>Runs</p>' }, { pace: 'fast' as never })).toThrow(
		new FilmError(`screen.scrolls's pace is "fast": it is a number`)
	);
	expect(() => screen.scrolls({ html: '<p>Runs</p>' }, {} as never)).toThrow(FilmError);
	expect(() => screen.scrollTo('filmed' as never, '#input', { top: 0 })).toThrow(
		new FilmError(
			`screen.scrollTo's page is "filmed": it is a page of the film's own, { html }; the filmed page scrolls by page.scrollBy or page.scrollTo`
		)
	);
	expect(() => screen.scrollTo({ html: '<p>Runs</p>' }, 7 as never, { top: 0 })).toThrow(
		new FilmError(`screen.scrollTo's target is 7: it is a selector: a string that names blocks of the page`)
	);
	expect(() =>
		screen.scrollTo({ html: '<p>Runs</p>' }, '#input', { top: 0, ease: (progress: number) => progress } as never)
	).toThrow(new FilmError(`screen.scrollTo names ease: it names top, judged, within, or fewer`));
	expect(() => screen.type('filmed' as never, [STROKE], { into: '#typed' })).toThrow(
		new FilmError(
			`screen.type's page is "filmed": it is a page of the film's own, { html }; the filmed page is typed into by page.type`
		)
	);
	expect(() => screen.type({ html: '<p>Typed</p>' }, 'ls' as never, { into: '#typed' })).toThrow(
		new FilmError('screen.type\'s strokes is "ls": it is keystrokes, as keystrokes() gives them')
	);
	expect(() => screen.type({ html: '<p>Typed</p>' }, [STROKE], {} as never)).toThrow(
		new FilmError(`screen.type's into is undefined: it is a selector: a string that names blocks of the page`)
	);
	expect(() => screen.blinks('filmed' as never, '.caret', { seconds: 1.06 })).toThrow(
		new FilmError(
			`screen.blinks's page is "filmed": it is a page of the film's own, { html }; the filmed page's own motion stays stilled`
		)
	);
	expect(() => screen.blinks({ html: '<p>Blinks</p>' }, '.caret', { seconds: 0 })).toThrow(
		new FilmError(`screen.blinks's seconds is 0: it is some seconds, more than none`)
	);
	expect(() => screen.sweep({ from: 'middle' as never })).toThrow(
		new FilmError(`screen.sweep's from is "middle": it is a side of the frame: "left", "right", "top" or "bottom"`)
	);
	expect(() => screen.sweep({ slant: 90 })).toThrow(
		new FilmError(
			"screen.sweep's slant is 90: it is a slant, degrees turned clockwise from the side it comes from, more than -90 and less than 90"
		)
	);
	expect(() => screen.sweep({ width: 0 })).toThrow(
		new FilmError("screen.sweep's width is 0: it is a number of pixels, more than 0")
	);
	expect(() => screen.sweep({ crest: { start: 'blue' } })).toThrow(
		new FilmError(`screen.sweep's crest's start is "blue": it is a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa`)
	);
	expect(() => terminal.open(null as never)).toThrow(new FilmError("terminal.open's title is null: it is a string"));
	expect(() => terminal.open('claude', { within: 5 as never })).toThrow(
		new FilmError(`terminal.open's within is 5: it is ${SHARE}`)
	);
	expect(() => terminal.type('ls' as never)).toThrow(
		new FilmError('terminal.type\'s strokes is "ls": it is keystrokes, as keystrokes() gives them')
	);
	expect(() => terminal.type([STROKE], { ease: 1 as never })).toThrow(
		new FilmError(`terminal.type's ease is 1: it is ${CURVE}`)
	);
	expect(() => terminal.works([{ kind: 'work' }] as never, 'Thinking')).toThrow(
		new FilmError("terminal.works's lines[0]'s text is undefined: it is a string")
	);
	expect(() => terminal.works([], 7 as never)).toThrow(new FilmError("terminal.works's thinking is 7: it is a string"));
	expect(() => terminal.works([], 'Thinking', { thinkingShare: 'half' as never })).toThrow(
		new FilmError('terminal.works\'s thinkingShare is "half": it is a number')
	);
	expect(() => terminal.leave({ ease: 1 as never })).toThrow(
		new FilmError(`terminal.leave's ease is 1: it is ${CURVE}`)
	);
	expect(() => terminal.leave({ toward: 'up' as never })).toThrow(
		new FilmError(`terminal.leave's toward is "up": it is ${SIDE}`)
	);
	expect(() => terminal.open('claude', { from: 'down' as never })).toThrow(
		new FilmError(`terminal.open's from is "down": it is ${SIDE}`)
	);
	expect(() => ending.show({ name: 'livereel' } as never)).toThrow(
		new FilmError("ending.show's card's line is undefined: it is a string")
	);
	expect(() => ending.show(CARD, { within: 1 as never })).toThrow(
		new FilmError(`ending.show's within is 1: it is ${SHARE}`)
	);
	expect(() => page.scrollBy(null as never, { pixels: 10 })).toThrow(
		new FilmError(`page.scrollBy's selector is null: it is ${SELECTOR}`)
	);
	expect(() => page.scrollBy('#block', {} as never)).toThrow(
		new FilmError("page.scrollBy's pixels is undefined: it is a number, or Infinity for no bound")
	);
	expect(() => page.scrollTo(null as never, { top: 0 })).toThrow(
		new FilmError(`page.scrollTo's selector is null: it is ${SELECTOR}`)
	);
	expect(() => page.scrollTo('#block', { top: '0' as never })).toThrow(
		new FilmError('page.scrollTo\'s top is "0": it is a number')
	);
	expect(() => page.type([STROKE, STROKE, { at: 0.2 }] as never)).toThrow(
		new FilmError("page.type's strokes[2]'s typed is undefined: it is a string")
	);
	expect(() => page.type([STROKE], { within: null as never })).toThrow(
		new FilmError(`page.type's within is null: it is ${SHARE}`)
	);
	expect(() => page.type([STROKE], { keyboard: 'typewriter' as never })).toThrow(
		new FilmError(
			'page.type\'s keyboard is "typewriter": it is one of livereel\'s keyboards: membrane, mechanical, mechanical-bright, butterfly, laptop, clicky'
		)
	);
	expect(() => page.act('click' as never)).toThrow(new FilmError('page.act\'s action is "click": it is a function'));
	expect(() => page.act(() => Promise.resolve(), { within: { end: 1 } as never })).toThrow(
		new FilmError("page.act's within names end: it names start, or fewer")
	);
	expect(() => sound.play('')).toThrow(new FilmError(`sound.play's file is "": it is ${FILE}`));
	expect(() => sound.play('./chime.wav', { within: { end: 1 } as never })).toThrow(
		new FilmError("sound.play's within names end: it names start, or fewer")
	);
	expect(() => play({ seconds: '1' as never })).toThrow(
		new FilmError('play\'s seconds is "1": it is some seconds, more than none')
	);
	expect(() => play({ seconds: 1, moves: [null as never] })).toThrow(
		new FilmError(`play's moves[0] is null: it is ${A_MOVE}`)
	);
	expect(() => hold({} as never)).toThrow(
		new FilmError("hold's seconds is undefined: it is some seconds, more than none")
	);
	expect(() => cut(cursor.hide as never)).toThrow(new FilmError(`cut's moves[0] is a function: it is ${A_MOVE}`));
	expect(() => act('click' as never)).toThrow(new FilmError('act\'s action is "click": it is a function'));
	expect(() => typing(camera.onto('#block') as never)).toThrow(
		new FilmError(
			'typing\'s move is {"part":"camera","timing":{"within":{"start":0,"end":1},"ease":null},"begin":"a function"}: it is a move that types, as terminal.type or page.type makes one'
		)
	);
	expect(() => keystrokes(5 as never, { seed: 1 })).toThrow(new FilmError("keystrokes's text is 5: it is a string"));
	expect(() => keystrokes('ls', {} as never)).toThrow(new FilmError("keystrokes's seed is undefined: it is a number"));
	expect(() => keystrokes('ls', { lettersPerSecond: 0 })).toThrow(
		new FilmError("keystrokes's lettersPerSecond is 0: it is letters a second, more than 0")
	);
	expect(() => keystrokes('ls', { lettersPerSecond: 12, seed: 1 } as never)).toThrow(
		new FilmError('keystrokes names seed: it names lettersPerSecond, or fewer')
	);
	expect(() => camera.to(null as never)).toThrow(
		new FilmError("camera.to's pose is null: it is a pose: { focusX, focusY, zoom }, as steps is handed")
	);
	expect(() => camera.to({ ...POSE, focusX: Number.POSITIVE_INFINITY })).toThrow(
		new FilmError("camera.to's pose's focusX is Infinity: it is a number")
	);
	expect(() => camera.to({ ...POSE, zoom: 0 })).toThrow(
		new FilmError("camera.to's pose's zoom is 0: it is a zoom, the frame's pixels a page's pixel takes, more than 0")
	);
	expect(() => camera.onto('#block', { zoomAtMost: 0 })).toThrow(
		new FilmError(
			"camera.onto's zoomAtMost is 0: it is a zoom, the frame's pixels a page's pixel takes, more than 0, or Infinity for no bound"
		)
	);
	expect(() => camera.onto('#block', { air: -150 })).toThrow(
		new FilmError("camera.onto's air is -150: it is a number of pixels, 0 or more")
	);
});

test('what a refusal says a film handed is said as it was, whatever JSON cannot write: a BigInt, a class, a value that holds itself', () => {
	const holdsItself: { self?: object } = {};
	holdsItself.self = holdsItself;
	expect(() => camera.onto('#block', { air: { amount: 10n } as never })).toThrow(
		new FilmError('camera.onto\'s air is {"amount":"10n"}: it is a number of pixels, 0 or more')
	);
	expect(() => camera.onto('#block', { air: new Map() as never })).toThrow(
		new FilmError("camera.onto's air is an object of the class Map: it is a number of pixels, 0 or more")
	);
	expect(() => camera.onto('#block', { air: holdsItself as never })).toThrow(
		new FilmError("camera.onto's air is an object that holds itself: it is a number of pixels, 0 or more")
	);
});

test("a move that sets the values a film names refuses one naming none, and each value in no kind it takes: an object's effects, the window's shade, the film's look and the world's", () => {
	expect(() => title.effects({})).toThrow(
		new FilmError('title.effects names none of ring, glow, shadow, blur, colour, melt, fade, scale, depth')
	);
	expect(() => piece.effects({ fade: 1.5 })).toThrow(
		new FilmError("piece.effects's fade is 1.5: it is a number from 0 to 1")
	);
	expect(() => piece.effects({ melt: { toward: 'middle', share: 0.5 } })).toThrow(
		new FilmError(
			'piece.effects\'s melt\'s toward is "middle": it is a side of the frame: "left", "right", "top" or "bottom"'
		)
	);
	expect(() => piece.effects({ colour: 'blue' })).toThrow(
		new FilmError('piece.effects\'s colour is "blue": it is a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa')
	);
	expect(() => pageWindow.shade({})).toThrow(
		new FilmError('window.shade names none of dim, fade, blur, sharpSoftens, sharp, reaching, blurSeen')
	);
	expect(() => pageWindow.shade({ reaching: 'body' as 'window' })).toThrow(
		new FilmError('window.shade\'s reaching is "body": it is how far the shade reaches: "page" or "window"')
	);
	expect(() => pageWindow.shade({ blurSeen: 'on the window' as 'on the frame' })).toThrow(
		new FilmError(
			'window.shade\'s blurSeen is "on the window": it is where the shade\'s blur is as wide as written: "on the page" or "on the frame"'
		)
	);
	expect(() => look.to({})).toThrow(/^look\.to names none of ground, /);
	expect(() => world.to({})).toThrow(
		new FilmError('world.to names none of lights, softBoxes, bloom, bloomRadius, grain')
	);
	expect(() => piece.effects({ shadow: 1.5 })).toThrow(
		new FilmError("piece.effects's shadow is 1.5: it is a number from 0 to 1")
	);
	expect(() => lens.effects({ blur: -1 })).toThrow(
		new FilmError("lens.effects's blur is -1: it is a number of pixels, 0 or more")
	);
	expect(() => pageWindow.shade({ dim: 2 })).toThrow(
		new FilmError("window.shade's dim is 2: it is a number from 0 to 1")
	);
	expect(() => pageWindow.shade({ sharpSoftens: 1.5 })).toThrow(
		new FilmError("window.shade's sharpSoftens is 1.5: it is a number from 0 to 1")
	);
});

test('an object comes up standing out by the effects its show names, refused where they name a value of no effect, or the kind takes no effects', () => {
	expect(() => piece.show('#card', { effects: { depth: 10 } as never })).toThrow(
		new FilmError("piece.show's effects names depth: it names ring, glow, shadow, blur, colour, melt, fade, or fewer")
	);
	expect(() => title.show('Soft', { effects: { blur: -1 } })).toThrow(
		new FilmError("title.show's effects's blur is -1: it is a number of pixels, 0 or more")
	);
	expect(() => ending.show(CARD, { effects: { blur: 4 } } as never)).toThrow(
		new FilmError('ending.show names effects: it names from, enter, edge, as, within, ease, or fewer')
	);
});

test('what the types allow is taken, an endless number among it where it means no bound', () => {
	expect([
		page.scrollBy('#block', { pixels: Number.POSITIVE_INFINITY }).part,
		camera.onto('#block', { zoomAtMost: Number.POSITIVE_INFINITY }).part
	]).toEqual(['page', 'camera']);
});
