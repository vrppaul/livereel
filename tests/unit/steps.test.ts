import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { keystrokes } from '../../src/domain/typing.ts';
import { cssIn, cut, framesIn, hold, ownPagesIn, picturesIn, play, typing } from '../../src/direction/steps.ts';
import { act } from '../../src/moves/act.ts';
import { hide, show } from '../../src/moves/caption.ts';
import { hide as cursorGone } from '../../src/moves/cursor.ts';
import * as lens from '../../src/moves/lens.ts';
import { on } from '../../src/moves/light.ts';
import { to as lookTo } from '../../src/moves/look.ts';
import { act as actAtAMoment, scrollBy, type } from '../../src/moves/page.ts';
import * as piece from '../../src/moves/piece.ts';
import * as picture from '../../src/moves/picture.ts';
import { shows, sweep, type as screenType } from '../../src/moves/screen.ts';
import { play as playSound } from '../../src/moves/sound.ts';
import * as title from '../../src/moves/title.ts';
import { body, lean, shade, to as windowTo } from '../../src/moves/window.ts';
import { to as worldTo } from '../../src/moves/world.ts';

test("the CSS a film's looks write in its steps is found before it is shot, each value by its move, in a play or a cut: fonts, the ground's layers", () => {
	const dots = 'radial-gradient(#fff2 1px, transparent 1px) 0 0 / 24px 24px';
	const steps = [
		cut(lookTo({ font: 'Georgia' })),
		play({ seconds: 1, moves: [lookTo({ mono: 'Menlo', groundLayers: dots })] })
	];
	expect(cssIn(steps)).toEqual([
		{ place: "look.to's font", kind: 'font family', value: 'Georgia' },
		{ place: "look.to's groundLayers", kind: 'ground layers', value: dots },
		{ place: "look.to's mono", kind: 'font family', value: 'Menlo' }
	]);
});

test("the film's own pages its steps show are found before it is shot, each once, in a play or a cut", () => {
	const card = { html: '<p>The card</p>' };
	const terminal = { html: '<pre>A terminal</pre>' };
	const steps = [
		cut(shows(card)),
		play({ seconds: 1, moves: [shows(terminal, { within: { start: 0.5 } })] }),
		cut(shows('filmed')),
		cut(shows(card))
	];
	expect(ownPagesIn(steps).map((page) => page.html)).toEqual([card.html, terminal.html]);
});

test("a page of the film's own is laid to be drawn past its screen where any move of the steps shows it so, a typing into it after too", () => {
	const card = { html: '<p>The card</p>' };
	const terminal = { html: '<pre>A terminal</pre>' };
	const steps = [
		cut(shows(card)),
		cut(shows(terminal)),
		cut(shows(card, { reaches: 'document' })),
		cut(shows(card, { reaches: 'screen' })),
		...typing(screenType(card, keystrokes('ls', { lettersPerSecond: 10 }), { into: '#typed' }))
	];
	expect(ownPagesIn(steps).map((page) => [page.html, page.drawnPast])).toEqual([
		[card.html, true],
		[terminal.html, false]
	]);
});

test("the film's own pictures its steps show are found before it is shot, each file once, in a play or a cut", () => {
	const steps = [
		cut(picture.show('mark.png')),
		play({ seconds: 1, moves: [picture.show('logo.svg', { as: 'logo', within: { start: 0.5 } })] }),
		cut(picture.show('mark.png', { as: 'again' }))
	];
	expect(picturesIn(steps)).toEqual(['mark.png', 'logo.svg']);
});

test('two moves of one object at once in one step are refused as the step is written', () => {
	expect(() =>
		play({
			seconds: 1,
			moves: [title.hide({ within: { end: 0.5 } }), title.show('Next', { within: { start: 0.4 } })]
		})
	).toThrow(new FilmError('two moves on the title object at once in one step'));
});

test('two moves of the page at once are refused, as two of one object are, in a play or a cut', () => {
	const typed = type(keystrokes('words', { seed: 1 }));
	expect(() => play({ seconds: 1, moves: [scrollBy('html', { pixels: 100 }), typed] })).toThrow(
		new FilmError('two moves on the page at once in one step')
	);
	expect(() => cut(cursorGone(), cursorGone())).toThrow(new FilmError('two moves on the cursor at once in one step'));
});

test('an act at a moment of a play is refused while a move of the page runs across it, and shares the step with one that ends or begins there', () => {
	const typedToHalfWay = type(keystrokes('words', { seed: 1 }), { within: { end: 0.5 } });
	const actedAt = (start: number) => actAtAMoment(() => Promise.resolve(), { within: { start } });
	const scrolledFromHalfWay = scrollBy('html', { pixels: 100, within: { start: 0.5 } });
	expect(() => play({ seconds: 1, moves: [typedToHalfWay, actedAt(0.4)] })).toThrow(
		new FilmError('two moves on the page at once in one step')
	);
	expect(play({ seconds: 1, moves: [typedToHalfWay, actedAt(0.5), scrolledFromHalfWay] }).moves.length).toBe(3);
});

test("an act on the page at the moment a move that holds the page's picture begins is refused, in a play or a cut, as the act is done first and the picture would hold the page it leaves: a sweep of the screen, a piece holding its picture; an act a moment after is taken", () => {
	const actedAt = (start: number) => actAtAMoment(() => Promise.resolve(), { within: { start } });
	const refusal = new FilmError(
		"an act on the page at the moment a move that holds the page's picture begins, as screen.sweep or piece.show({ picture: 'held' }), is done first, and the picture would hold the page as the act leaves it: put the act a moment after, within: { start }"
	);
	expect(() => play({ seconds: 1, moves: [sweep(), actedAt(0)] })).toThrow(refusal);
	expect(() => play({ seconds: 1, moves: [sweep({ within: { start: 0.5 } }), actedAt(0.5)] })).toThrow(refusal);
	expect(() => cut(piece.show('#card', { picture: 'held' }), actedAt(0))).toThrow(refusal);
	expect(play({ seconds: 1, moves: [sweep(), actedAt(0.02)] }).moves.length).toBe(2);
	expect(cut(piece.show('#card'), actedAt(0)).moves.length).toBe(2);
});

test("two moves of the look, or of the world's look, at once are refused only on a value both set, named by it: a ground named alone sets its glow", () => {
	const drifting = lookTo({ glowX: 0.9, glow: '#222222' });
	const glowing = worldTo({ bloom: 0.45 });
	expect(() => play({ seconds: 1, moves: [drifting, lookTo({ ground: '#ffffff' })] })).toThrow(
		new FilmError("two moves on the look's glow at once in one step")
	);
	expect(() => play({ seconds: 1, moves: [glowing, worldTo({ bloom: 0.2, softBoxes: [] })] })).toThrow(
		new FilmError("two moves on the world's bloom at once in one step")
	);
	expect(play({ seconds: 1, moves: [drifting, lookTo({ ink: '#000000' })] }).moves.length).toBe(2);
	expect(play({ seconds: 1, moves: [glowing, worldTo({ lights: [] })] }).moves.length).toBe(2);
});

test("the window travels and leans at once, two moves setting values of it apart; two travels at once are refused, by the window's box", () => {
	expect(play({ seconds: 1, moves: [windowTo('right'), lean({ tilt: 6 })] }).moves.length).toBe(2);
	expect(() => play({ seconds: 1, moves: [windowTo('right'), windowTo('left')] })).toThrow(
		new FilmError("two moves on the window's box at once in one step")
	);
});

test('the window shades the page and changes its body while it travels and leans, a move setting the values it names; two shades or two bodies at once are refused on a value both set', () => {
	const moves = [
		windowTo('right'),
		lean({ tilt: 6 }),
		shade({ dim: 0.6 }),
		shade({ blur: 8 }),
		body({ thickness: 24 }),
		body({ metal: '#8a2eff' })
	];
	expect(play({ seconds: 1, moves }).moves.length).toBe(6);
	expect(() => play({ seconds: 1, moves: [shade({ dim: 0.6, fade: 0.2 }), shade({ fade: 0.5 })] })).toThrow(
		new FilmError("two moves on the window's fade at once in one step")
	);
	expect(() => play({ seconds: 1, moves: [body({ thickness: 24, rim: 8 }), body({ rim: 4 })] })).toThrow(
		new FilmError("two moves on the window's rim at once in one step")
	);
});

test('an object stands out while it is carried and leant, a move setting the values it names, and a carry sets only the scale and depth it names; two at once are refused on a value both set', () => {
	expect(
		play({ seconds: 1, moves: [title.to('left'), title.effects({ shadow: 1, depth: 100 }), title.lean({ turn: 10 })] })
			.moves.length
	).toBe(3);
	expect(play({ seconds: 1, moves: [lens.to('#block'), lens.effects({ depth: 100 })] }).moves.length).toBe(2);
	expect(() => play({ seconds: 1, moves: [title.to('left', { depth: 50 }), title.effects({ depth: 100 })] })).toThrow(
		new FilmError("two moves on the title object's depth at once in one step")
	);
	expect(() => play({ seconds: 1, moves: [title.effects({ glow: 1 }), title.effects({ glow: 0, blur: 4 })] })).toThrow(
		new FilmError("two moves on the title object's glow at once in one step")
	);
});

test('moves of one prop one after the other share a step, moves of two props share it at once, and sounds any way', () => {
	const after = play({ seconds: 1, moves: [hide({ within: { end: 0.3 } }), show('Next', { within: { start: 0.4 } })] });
	const together = play({ seconds: 1, moves: [show('Words'), on('#block')] });
	const sounds = play({ seconds: 1, moves: [playSound('./one.wav'), playSound('./two.wav'), show('Words')] });
	expect([after.moves.length, together.moves.length, sounds.moves.length]).toEqual([2, 2, 3]);
});

test("a film's length is its plays' frames at its rate: a cut and an act take none", () => {
	const steps = [hold({ seconds: 1 }), cut(cursorGone()), act(() => Promise.resolve()), hold({ seconds: 0.35 })];
	expect([framesIn(steps, 30), framesIn(steps, 60)]).toEqual([41, 81]);
});

test('a step of no time, or of no length a clock can count, is refused', () => {
	expect(() => hold({ seconds: 0 })).toThrow(FilmError);
	expect(() => hold({ seconds: Number.POSITIVE_INFINITY })).toThrow(FilmError);
	expect(() => hold({ seconds: Number.NaN })).toThrow(FilmError);
});
