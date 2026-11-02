/**
 * Eighteen ways to set a block of a page apart, one after another on the promo's app (`livereel-promo/`): the recipes
 * the skill names (`skills/reel/SKILL.md`, "Recipes: setting a block apart"), an act each, its caption the recipe's
 * name.
 *
 *     pnpm livereel shoot examples/livereel-recipes.ts --out out/recipes --sheet
 *
 * None is a move of its own: each is pieces of the page, outlines, a lens and groups, carried, grown, leant and
 * standing out, with the window's shade behind them. Each act leaves the page as it found it: whole, face-on,
 * unshaded, with nothing standing over it.
 */
import {
	type ActContext,
	type Box,
	type Move,
	type Step,
	type Target,
	camera,
	caption,
	cut,
	defineFilm,
	easeOutBack,
	group,
	hold,
	lens,
	light,
	linear,
	outline,
	piece,
	play,
	screen,
	title,
	window
} from 'livereel';
import { servedApp } from './livereel-promo/server.ts';

// A wide frame, and the app laid out on a screen of the same size
const WIDE = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
// The app's three cards and their row, the number on each, as wide as its figures, the visitors' count with how it
// stands on yesterday as one area, its chart and the last three days of it, its list of top pages, its header and all
// that stands under it
const VISITORS = '[data-testid=visitors]';
const SIGN_UPS = '[data-testid=sign-ups]';
const REVENUE = '[data-testid=revenue]';
const CARDS = '[data-testid=kpis]';
const VISITORS_NUMBER = '[data-testid=visitors-number]';
const SIGN_UPS_NUMBER = '[data-testid=sign-ups-number]';
const REVENUE_NUMBER = '[data-testid=revenue-number]';
const VISITORS_FIGURES = '[data-testid=visitors-today], [data-testid=visitors-change]';
const CHART = '[data-testid=chart]';
const LAST_DAYS = '[data-testid=chart] i:nth-last-child(-n+3)';
const TOP_PAGES = '[data-testid=top-pages]';
const HEADER = 'header';
const CONTENT = 'main';
// The whole screen, and an area no block holds, across the sign-ups card's figures and the chart's bars under them, in
// its pixels
const WHOLE_SCREEN: Box = { left: 0, top: 0, ...WIDE.screen };
const ACROSS_CARD_AND_CHART: Box = { left: 850, top: 215, width: 460, height: 400 };
// Places in shares of the frame: its middle, where a card stands about twice as large; over the chart, where the
// visitors' figures stand about twice as large; the page's window drawn back onto the ground; and the page's window
// aside on the right with a card on the ground across from it
const MIDDLE: Box = { left: 0.23, top: 0.3, width: 0.54, height: 0.36 };
const OVER_THE_CHART: Box = { left: 0.35, top: 0.42, width: 0.54, height: 0.22 };
const DRAWN_BACK: Box = { left: 0.15, top: 0.12, width: 0.7, height: 0.7 };
const PAGE_ASIDE: Box = { left: 0.47, top: 0.22, width: 0.48, height: 0.48 };
const CARD_ASIDE: Box = { left: 0.03, top: 0.28, width: 0.42, height: 0.34 };
// How round the app's cards are drawn, as its stylesheet has them, in the page's pixels; a block drawn square
const CARD_CORNER = 18;
const SQUARE = 0;

/** A layer of a stack: its name, the block or box it is, and how far toward the eye it stands, apart. */
interface Layer {
	readonly as: string;
	readonly target: Target;
	readonly depth: number;
}

/** A layer lifted off the page as a piece, with its corners as round as its block's. */
interface LiftedLayer extends Layer {
	readonly corner: number;
}

// The groups the acts stand their pieces in, and the piece of the whole screen under the layers lifted off it
const SLICES = 'slices';
const STACK = 'stack';
const FAN = 'fan';
const RING = 'ring';
const UNDER = 'page';
// How far apart the bands of the sliced page and the layers of the stack stand toward the eye, in pixels of a 1080
// frame
const BAND_APART = 70;
const LAYER_APART = 170;
// The bands step up toward the eye from the page's foot to its top, which the page lies back from, so none hides
// another
const BANDS: readonly LiftedLayer[] = [
	{ as: 'header', target: HEADER, depth: 4 * BAND_APART, corner: SQUARE },
	{ as: 'cards', target: CARDS, depth: 3 * BAND_APART, corner: SQUARE },
	{ as: 'chart', target: CHART, depth: 2 * BAND_APART, corner: CARD_CORNER },
	{ as: 'top-pages', target: TOP_PAGES, depth: BAND_APART, corner: CARD_CORNER }
];
const STACK_LAYERS: readonly LiftedLayer[] = [
	{ as: 'header', target: HEADER, depth: LAYER_APART, corner: SQUARE },
	{ as: 'content', target: CONTENT, depth: 2 * LAYER_APART, corner: SQUARE }
];
// Each layer of the stack, and the page under them, ringed by a dashed line as far toward the eye as the layer stands
const RINGED_LAYERS: readonly Layer[] = [
	{ as: 'page-line', target: WHOLE_SCREEN, depth: 0 },
	{ as: 'header-line', target: HEADER, depth: LAYER_APART },
	{ as: 'content-line', target: CONTENT, depth: 2 * LAYER_APART }
];
// The layers' labels, flat on the frame left of each as the stack stands raised, read off a still of it, in shares of
// the frame; how large their letters are, in pixels of a 1080 frame
const LAYER_LABELS = [
	{ as: 'content-label', text: 'Content', at: { left: 0.18, top: 0.23, width: 0.1, height: 0.06 } },
	{ as: 'header-label', text: 'Header', at: { left: 0.13, top: 0.4, width: 0.1, height: 0.06 } },
	{ as: 'page-label', text: 'Page', at: { left: 0.17, top: 0.54, width: 0.1, height: 0.06 } }
];
const LABEL_SIZE = 44;
// The three cards fanned into the depth, the near one first: where each stands, in shares of the frame, how far toward
// the eye, in pixels of a 1080 frame, and how far blurred
const FAN_CARDS = [
	{ as: 'near', target: VISITORS, at: { left: 0.13, top: 0.5, width: 0.3, height: 0.2 }, depth: 300, blur: 0 },
	{ as: 'middle', target: SIGN_UPS, at: { left: 0.37, top: 0.37, width: 0.3, height: 0.2 }, depth: 0, blur: 2 },
	{ as: 'far', target: REVENUE, at: { left: 0.61, top: 0.24, width: 0.3, height: 0.2 }, depth: -300, blur: 4 }
];
// The three cards on a ring round the frame's middle, a third of a turn apart: how far each stands from its middle, in
// pixels of a 1080 frame, as a depth is given, and the frame's width in those; the place a card stands in on it, in
// shares of the frame, its middle at the frame's; a degree in radians
const RING_REACH = 360;
const DEPTH_FRAME_HEIGHT = 1080;
const FRAME_WIDTH_IN_DEPTH_PIXELS = (DEPTH_FRAME_HEIGHT * WIDE.frame.width) / WIDE.frame.height;
const ON_THE_RING = { width: 0.25, height: 0.17 };
const RING_MIDDLE: Box = { left: (1 - ON_THE_RING.width) / 2, top: (1 - ON_THE_RING.height) / 2, ...ON_THE_RING };
const RADIANS_IN_A_DEGREE = Math.PI / 180;
const THIRD_OF_A_TURN = 120;
const RING_CARDS = [
	{ as: 'first', target: VISITORS, degrees: 0 },
	{ as: 'second', target: SIGN_UPS, degrees: THIRD_OF_A_TURN },
	{ as: 'third', target: REVENUE, degrees: -THIRD_OF_A_TURN }
];
// The three cards rising one after another, each over its own share of the step
const WAVE_CARDS = [
	{ as: 'first', target: VISITORS, within: { start: 0, end: 0.6 } },
	{ as: 'second', target: SIGN_UPS, within: { start: 0.2, end: 0.8 } },
	{ as: 'third', target: REVENUE, within: { start: 0.4, end: 1 } }
];

function cardsShown(context: ActContext): Promise<void> {
	return context.page.locator(CARDS).waitFor();
}

/** A group, and in it the whole screen and the layers lifted off it, each leaving its place empty. */
function layersShown(stack: string, layers: readonly LiftedLayer[]): readonly Step[] {
	return [
		cut(group.show({ as: stack })),
		cut(
			piece.show(WHOLE_SCREEN, { as: UNDER, group: stack }),
			...layers.map((layer) => piece.show(layer.target, { as: layer.as, group: stack, corner: layer.corner, hole: {} }))
		)
	];
}

/** Each layer, a piece or an outline as `effects` of its kind moves it, as far toward the eye as it stands, apart. */
function layersApart(layers: readonly Layer[], effects: typeof piece.effects): readonly Move[] {
	return layers.map((layer) => effects({ as: layer.as, depth: layer.depth }));
}

/** Each layer, a piece or an outline, back down on the page under it. */
function layersTogether(layers: readonly Layer[], effects: typeof piece.effects): readonly Move[] {
	return layers.map((layer) => effects({ as: layer.as, depth: 0 }));
}

/** The stack laid back, rolled and shrunk as a drawing shows one, the screen gone under it, its layers apart. */
function stackRaised(): readonly Move[] {
	return [
		screen.lower(),
		group.lean({ as: STACK, tilt: 55, roll: -45 }),
		group.to('whole', { as: STACK, scale: 0.45 }),
		...layersApart(STACK_LAYERS, piece.effects)
	];
}

/** The stack back face-on and whole, its layers down, the screen up under it. */
function stackLowered(): readonly Move[] {
	return [
		screen.rise(),
		group.lean({ as: STACK, tilt: 0, roll: 0 }),
		group.to('whole', { as: STACK, scale: 1 }),
		...layersTogether(STACK_LAYERS, piece.effects)
	];
}

/** A card of the fan carried to its place and depth, leant back and swung, and blurred as far as it stands back. */
function cardFanned(card: (typeof FAN_CARDS)[number]): readonly Move[] {
	return [
		piece.to(card.at, { as: card.as, depth: card.depth }),
		piece.lean({ as: card.as, tilt: 22, turn: 18 }),
		piece.effects({ as: card.as, blur: card.blur })
	];
}

/** A card of the fan back over its block, sharp. */
function cardUnfanned(card: (typeof FAN_CARDS)[number]): readonly Move[] {
	return [piece.back({ as: card.as }), piece.effects({ as: card.as, blur: 0 })];
}

/** Where a card so many degrees round the ring stands, in shares of the frame. */
function ringPlace(degrees: number): Box {
	return {
		...RING_MIDDLE,
		left: RING_MIDDLE.left + (RING_REACH * Math.sin(degrees * RADIANS_IN_A_DEGREE)) / FRAME_WIDTH_IN_DEPTH_PIXELS
	};
}

/** How far toward the eye a card so many degrees round the ring stands. */
function ringDepth(degrees: number): number {
	return RING_REACH * Math.cos(degrees * RADIANS_IN_A_DEGREE);
}

/** A card of the ring carried to its place on it, facing out from its middle. */
function cardOnTheRing(card: (typeof RING_CARDS)[number]): readonly Move[] {
	return [
		piece.to(ringPlace(card.degrees), { as: card.as, depth: ringDepth(card.degrees) }),
		piece.lean({ as: card.as, turn: card.degrees })
	];
}

/** A card grows about its middle, past its size and back, over the page dimmed a little. */
function actGrowsInPlace(): readonly Step[] {
	return [
		cut(piece.show(SIGN_UPS, { corner: CARD_CORNER })),
		play({
			seconds: 0.9,
			moves: [
				caption.show('Grows in place'),
				piece.effects({ scale: 1.7, shadow: 1, ease: easeOutBack }),
				window.shade({ dim: 0.3 })
			]
		}),
		hold({ seconds: 1.2 }),
		play({ seconds: 0.8, moves: [piece.effects({ scale: 1, shadow: 0 }), window.shade({ dim: 0 })] }),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** A round glass opens over a number and goes from number to number, the page under it twice as large. */
function actALensAlongThePage(): readonly Step[] {
	return [
		play({
			seconds: 0.55,
			moves: [caption.show('A lens along the page'), lens.show(VISITORS_NUMBER, { enter: 'grow' })]
		}),
		hold({ seconds: 0.85 }),
		play({ seconds: 1.4, moves: [lens.to(SIGN_UPS_NUMBER)] }),
		hold({ seconds: 0.85 }),
		play({ seconds: 1.4, moves: [lens.to(REVENUE_NUMBER)] }),
		hold({ seconds: 0.85 }),
		play({ seconds: 0.5, moves: [lens.hide({ leave: 'grow' })] }),
		hold({ seconds: 0.3 })
	];
}

/**
 * A card ringed in the accent and lit, then its copy carried to the middle twice as large while the page darkens
 * further, the card itself still lit where it stands.
 */
function actRingedLitToTheMiddle(): readonly Step[] {
	return [
		cut(piece.show(REVENUE, { corner: CARD_CORNER })),
		play({
			seconds: 0.85,
			moves: [caption.show('Ringed, lit, to the middle'), piece.effects({ ring: 1 }), light.on(REVENUE, { dim: 0.5 })]
		}),
		play({ seconds: 1, moves: [piece.to(MIDDLE), piece.effects({ shadow: 1 }), window.shade({ dim: 0.5 })] }),
		hold({ seconds: 1.2 }),
		play({ seconds: 0.85, moves: [piece.back(), piece.effects({ shadow: 0 }), window.shade({ dim: 0 })] }),
		play({ seconds: 0.5, moves: [piece.effects({ ring: 0 }), light.off()] }),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** A card lifted toward the eye, a shadow growing under it, the page as it stands. */
function actLiftedWithAShadow(): readonly Step[] {
	return [
		cut(piece.show(VISITORS, { corner: CARD_CORNER })),
		play({
			seconds: 0.95,
			moves: [caption.show('Lifted with a shadow'), piece.effects({ shadow: 1, depth: 300 })]
		}),
		hold({ seconds: 1.2 }),
		play({ seconds: 0.9, moves: [piece.effects({ shadow: 0, depth: 0 })] }),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** A card lifted toward the eye, sharp, while the page behind it goes out of focus. */
function actSharpOverABlurredPage(): readonly Step[] {
	return [
		cut(piece.show(SIGN_UPS, { corner: CARD_CORNER })),
		play({
			seconds: 1,
			moves: [caption.show('Sharp over a blurred page'), piece.effects({ depth: 500 }), window.shade({ blur: 8 })]
		}),
		hold({ seconds: 1.2 }),
		play({ seconds: 0.9, moves: [piece.effects({ depth: 0 }), window.shade({ blur: 0 })] }),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** A card glowing in the accent and growing a little, while the page darkens round it. */
function actGlowingOverADimmedPage(): readonly Step[] {
	return [
		cut(piece.show(REVENUE, { corner: CARD_CORNER })),
		play({
			seconds: 0.9,
			moves: [
				caption.show('Glowing over a dimmed page'),
				piece.effects({ glow: 1, scale: 1.12 }),
				window.shade({ dim: 0.7 })
			]
		}),
		hold({ seconds: 1.2 }),
		play({ seconds: 0.8, moves: [piece.effects({ glow: 0, scale: 1 }), window.shade({ dim: 0 })] }),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** A card lifted, a dashed place left behind, then out onto the ground as the page's window draws aside. */
function actOutBesideThePage(): readonly Step[] {
	return [
		cut(piece.show(VISITORS, { corner: CARD_CORNER, hole: { line: 'dashed' } })),
		play({ seconds: 1, moves: [caption.show('Out beside the page'), piece.effects({ shadow: 1, depth: 120 })] }),
		play({ seconds: 1.6, moves: [window.to(PAGE_ASIDE), piece.to(CARD_ASIDE, { depth: 0 })] }),
		hold({ seconds: 1.2 }),
		play({
			seconds: 1.3,
			moves: [
				window.to('whole', { within: { end: 0.5 } }),
				piece.back({ within: { start: 0.5 } }),
				piece.effects({ shadow: 0 })
			]
		}),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** The page laid back and swung, its bands stepping up toward the eye, the page under them blurred, then put back. */
function actThePageSlicedInDepth(): readonly Step[] {
	return [
		...layersShown(SLICES, BANDS),
		play({
			seconds: 2,
			moves: [
				caption.show('The page sliced in depth'),
				screen.lower(),
				group.lean({ as: SLICES, tilt: 40, turn: 10 }),
				group.to('whole', { as: SLICES, scale: 0.7 }),
				piece.effects({ as: UNDER, blur: 4 }),
				...layersApart(BANDS, piece.effects)
			]
		}),
		play({ seconds: 2.4, moves: [group.lean({ as: SLICES, turn: -10 })], ease: linear }),
		play({
			seconds: 1.4,
			moves: [
				screen.rise(),
				group.lean({ as: SLICES, tilt: 0, turn: 0 }),
				group.to('whole', { as: SLICES, scale: 1 }),
				piece.effects({ as: UNDER, blur: 0 }),
				...layersTogether(BANDS, piece.effects)
			]
		}),
		cut(group.hide({ as: SLICES })),
		hold({ seconds: 0.3 })
	];
}

/** The page in layers apart, as a drawing shows how it is made, each ringed by a dashed line, then labelled. */
function actLayersLabelled(): readonly Step[] {
	return [
		...layersShown(STACK, STACK_LAYERS),
		cut(...RINGED_LAYERS.map((layer) => outline.show(layer.target, { as: layer.as, line: 'dashed', group: STACK }))),
		play({
			seconds: 2.2,
			moves: [caption.show('Layers, labelled'), ...stackRaised(), ...layersApart(RINGED_LAYERS, outline.effects)]
		}),
		play({
			seconds: 0.6,
			moves: LAYER_LABELS.map((label) => title.show(label.text, { at: label.at, size: LABEL_SIZE, as: label.as }))
		}),
		hold({ seconds: 1.6 }),
		play({ seconds: 0.4, moves: LAYER_LABELS.map((label) => title.hide({ as: label.as })) }),
		play({
			seconds: 1.4,
			moves: [...stackLowered(), ...layersTogether(RINGED_LAYERS, outline.effects)]
		}),
		cut(group.hide({ as: STACK })),
		hold({ seconds: 0.3 })
	];
}

/** Three cards fanned into the depth, the far ones blurred, drifting as the page fades into the ground. */
function actAFanInDepth(): readonly Step[] {
	return [
		cut(group.show({ as: FAN })),
		cut(...FAN_CARDS.map((card) => piece.show(card.target, { as: card.as, group: FAN, corner: CARD_CORNER }))),
		play({
			seconds: 2,
			moves: [caption.show('A fan in depth'), window.shade({ fade: 0.9 }), ...FAN_CARDS.flatMap(cardFanned)]
		}),
		play({ seconds: 2.4, moves: [group.lean({ as: FAN, turn: -12 })], ease: linear }),
		play({
			seconds: 1.4,
			moves: [window.shade({ fade: 0 }), group.lean({ as: FAN, turn: 0 }), ...FAN_CARDS.flatMap(cardUnfanned)]
		}),
		cut(group.hide({ as: FAN })),
		hold({ seconds: 0.3 })
	];
}

/** An area no block holds, ringed by a dashed line, grows where it stands, edged and lifted. */
function actAnyAreaLargerInPlace(): readonly Step[] {
	return [
		play({
			seconds: 0.7,
			moves: [caption.show('Any area, larger in place'), outline.show(ACROSS_CARD_AND_CHART, { line: 'dashed' })]
		}),
		cut(piece.show(ACROSS_CARD_AND_CHART)),
		play({
			seconds: 0.85,
			moves: [piece.effects({ scale: 1.5, shadow: 1, ring: 1 }), window.shade({ dim: 0.3 })]
		}),
		hold({ seconds: 1.2 }),
		play({
			seconds: 0.85,
			moves: [piece.effects({ scale: 1, shadow: 0, ring: 0 }), window.shade({ dim: 0 })]
		}),
		cut(piece.hide(), outline.hide()),
		hold({ seconds: 0.3 })
	];
}

/** Figures ringed where they stand, and their copy carried out beside them, larger, tied to them by two lines. */
function actAnInsetTiedToItsPlace(): readonly Step[] {
	return [
		play({
			seconds: 0.55,
			moves: [caption.show('An inset tied to its place'), outline.show(VISITORS_FIGURES, { every: 2 })]
		}),
		cut(piece.show(VISITORS_FIGURES, { every: 2, lines: 'solid' })),
		play({
			seconds: 1.25,
			moves: [piece.to(OVER_THE_CHART), piece.effects({ shadow: 1 }), window.shade({ dim: 0.3 })]
		}),
		hold({ seconds: 1.5 }),
		play({ seconds: 1, moves: [piece.back(), piece.effects({ shadow: 0 }), window.shade({ dim: 0 })] }),
		cut(piece.hide(), outline.hide()),
		hold({ seconds: 0.3 })
	];
}

/** Three cards ringed together, then each rising after the one before it, and settling so. */
function actBlocksInAWave(): readonly Step[] {
	return [
		play({ seconds: 0.4, moves: [caption.show('Blocks in a wave'), outline.show(CARDS, { line: 'dashed' })] }),
		cut(...WAVE_CARDS.map((card) => piece.show(card.target, { as: card.as, corner: CARD_CORNER }))),
		play({
			seconds: 1.4,
			moves: [
				window.shade({ dim: 0.4 }),
				...WAVE_CARDS.map((card) => piece.effects({ as: card.as, scale: 1.1, shadow: 1, within: card.within }))
			]
		}),
		hold({ seconds: 1.2 }),
		play({
			seconds: 1.4,
			moves: [
				window.shade({ dim: 0 }),
				...WAVE_CARDS.map((card) => piece.effects({ as: card.as, scale: 1, shadow: 0, within: card.within }))
			]
		}),
		cut(...WAVE_CARDS.map((card) => piece.hide({ as: card.as })), outline.hide()),
		hold({ seconds: 0.3 })
	];
}

/** The chart's last days pushed larger where they stand, then again into the middle, the page darker each time. */
function actLargerInPushes(): readonly Step[] {
	return [
		cut(piece.show(LAST_DAYS, { every: 3 })),
		play({ seconds: 0.6, moves: [caption.show('Larger in pushes')] }),
		play({ seconds: 0.28, moves: [piece.effects({ scale: 1.3, shadow: 1 }), window.shade({ dim: 0.3 })] }),
		hold({ seconds: 1.1 }),
		play({ seconds: 0.5, moves: [piece.to(MIDDLE, { scale: 1 }), window.shade({ dim: 0.6 })] }),
		hold({ seconds: 1.4 }),
		play({ seconds: 0.85, moves: [piece.back(), piece.effects({ shadow: 0 }), window.shade({ dim: 0 })] }),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** A card spins round once on its way to the middle, twice as large, overshooting it, and turns back as it returns. */
function actAWholeTurnForward(): readonly Step[] {
	return [
		cut(piece.show(SIGN_UPS, { corner: CARD_CORNER, hole: {} })),
		play({
			seconds: 1.5,
			moves: [
				caption.show('A whole turn, forward'),
				piece.to(MIDDLE, { ease: easeOutBack }),
				piece.lean({ turn: 360 }),
				window.shade({ dim: 0.6 })
			]
		}),
		hold({ seconds: 1.2 }),
		play({
			seconds: 1.6,
			moves: [
				piece.lean({ turn: 0, within: { end: 0.5 } }),
				piece.back({ within: { start: 0.5 } }),
				window.shade({ dim: 0 })
			]
		}),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** The page draws back and swings away while a card of it stands face-on in the middle, then the page comes back. */
function actThePageTurnsAway(): readonly Step[] {
	return [
		cut(piece.show(VISITORS, { corner: CARD_CORNER, hole: {} })),
		play({
			seconds: 1.4,
			moves: [caption.show('The page turns away'), window.to(DRAWN_BACK), window.lean({ turn: -38 }), piece.to(MIDDLE)]
		}),
		hold({ seconds: 1.2 }),
		play({
			seconds: 1.3,
			moves: [
				window.to('whole', { within: { end: 0.5 } }),
				window.lean({ turn: 0, within: { end: 0.5 } }),
				piece.back({ within: { start: 0.5 } })
			]
		}),
		cut(piece.hide()),
		hold({ seconds: 0.3 })
	];
}

/** The page in layers apart, the stack turning a quarter round as on a turntable, then put back. */
function actTheStackTurns(): readonly Step[] {
	return [
		...layersShown(STACK, STACK_LAYERS),
		play({ seconds: 1.9, moves: [caption.show('The stack turns'), ...stackRaised()] }),
		play({ seconds: 3.2, moves: [group.lean({ as: STACK, roll: -135 })] }),
		play({ seconds: 1.45, moves: stackLowered() }),
		cut(group.hide({ as: STACK })),
		hold({ seconds: 0.3 })
	];
}

/** Three cards on a ring before the faded page, spun round a whole turn, each passing face-on, then put back. */
function actACarousel(): readonly Step[] {
	return [
		cut(group.show({ as: RING })),
		cut(...RING_CARDS.map((card) => piece.show(card.target, { as: card.as, group: RING, corner: CARD_CORNER }))),
		play({
			seconds: 1.4,
			moves: [
				caption.show('A carousel'),
				window.shade({ fade: 0.9 }),
				group.to('whole', { as: RING, depth: RING_REACH }),
				...RING_CARDS.flatMap(cardOnTheRing)
			]
		}),
		play({ seconds: 3.1, moves: [group.lean({ as: RING, turn: 360 })] }),
		play({
			seconds: 1.3,
			moves: [
				window.shade({ fade: 0 }),
				group.to('whole', { as: RING, depth: 0 }),
				...RING_CARDS.map((card) => piece.back({ as: card.as }))
			]
		}),
		cut(group.hide({ as: RING }))
	];
}

/** The camera frames the whole screen, so the page stays whole in whatever window stands, and the page holds a beat. */
function actOpening(): readonly Step[] {
	return [cut(camera.onto(WHOLE_SCREEN, { air: 0 })), hold({ seconds: 0.5 })];
}

/** The last recipe's name goes, the page whole. */
function actEnding(): readonly Step[] {
	return [play({ seconds: 0.6, moves: [caption.hide()] }), hold({ seconds: 0.4 })];
}

function steps(): readonly Step[] {
	return [
		...actOpening(),
		...actGrowsInPlace(),
		...actALensAlongThePage(),
		...actRingedLitToTheMiddle(),
		...actLiftedWithAShadow(),
		...actSharpOverABlurredPage(),
		...actGlowingOverADimmedPage(),
		...actOutBesideThePage(),
		...actThePageSlicedInDepth(),
		...actLayersLabelled(),
		...actAFanInDepth(),
		...actAnyAreaLargerInPlace(),
		...actAnInsetTiedToItsPlace(),
		...actBlocksInAWave(),
		...actLargerInPushes(),
		...actAWholeTurnForward(),
		...actThePageTurnsAway(),
		...actTheStackTurns(),
		...actACarousel(),
		...actEnding()
	];
}

export default defineFilm({ formats: { wide: WIDE }, serve: servedApp, ready: cardsShown, steps });
