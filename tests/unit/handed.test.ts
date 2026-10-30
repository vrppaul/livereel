// What a film hands each function it calls, as a film whose types nobody checked may hand it: refused where it
// stands, down to the item or the name at fault, where it is in no form the function takes; taken where it is
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import {
	act,
	atAddress,
	callout,
	camera,
	caption,
	code,
	cursor,
	cut,
	ending,
	hold,
	keystrokes,
	light,
	page,
	play,
	screen,
	sound,
	terminal,
	title,
	typing,
	window as pageWindow
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
		new FilmError('camera.onto\'s air is "80": it is a number')
	);
	expect(() => camera.onto('#block', { airr: 80 } as never)).toThrow(
		new FilmError('camera.onto names airr: it names every, air, zoomAtMost, within, ease, or fewer')
	);
	expect(() => camera.onto('#block', { every: 1.5 })).toThrow(
		new FilmError("camera.onto's every is 1.5: it is a whole count, 1 or more")
	);
	expect(() => camera.onto('#block', 5 as never)).toThrow(
		new FilmError('camera.onto is handed 5 for an object of every, air, zoomAtMost, within, ease')
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
	expect(() => light.on(null as never)).toThrow(new FilmError(`light.on's target is null: it is ${TARGET}`));
	expect(() => light.on('#block', { dim: null as never })).toThrow(
		new FilmError("light.on's dim is null: it is a number")
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
	expect(() => title.hide({ at: 'left' } as never)).toThrow(
		new FilmError('title.hide names at: it names toward, within, ease, or fewer')
	);
	expect(() => screen.rise({ within: { start: null as never } })).toThrow(
		new FilmError("screen.rise's within's start is null: it is a number")
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
	expect(() => camera.to(null as never)).toThrow(
		new FilmError("camera.to's pose is null: it is a pose: { focusX, focusY, zoom }, as steps is handed")
	);
	expect(() => atAddress('')).toThrow(new FilmError('atAddress\'s address is "": it is an address, a string'));
	expect(() => camera.to({ ...POSE, focusX: Number.POSITIVE_INFINITY })).toThrow(
		new FilmError("camera.to's pose's focusX is Infinity: it is a number")
	);
});

test('what a refusal says a film handed is said as it was, whatever JSON cannot write: a BigInt, a class, a value that holds itself', () => {
	const holdsItself: { self?: object } = {};
	holdsItself.self = holdsItself;
	expect(() => camera.onto('#block', { air: { amount: 10n } as never })).toThrow(
		new FilmError('camera.onto\'s air is {"amount":"10n"}: it is a number')
	);
	expect(() => camera.onto('#block', { air: new Map() as never })).toThrow(
		new FilmError("camera.onto's air is an object of the class Map: it is a number")
	);
	expect(() => camera.onto('#block', { air: holdsItself as never })).toThrow(
		new FilmError("camera.onto's air is an object that holds itself: it is a number")
	);
});

test('what the types allow is taken, an endless number among it where it means no bound', () => {
	expect([
		page.scrollBy('#block', { pixels: Number.POSITIVE_INFINITY }).part,
		camera.onto('#block', { zoomAtMost: Number.POSITIVE_INFINITY }).part
	]).toEqual(['page', 'camera']);
});
