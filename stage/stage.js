// @ts-check
/**
 * The stage's script: it draws the scenes it is handed, a frame at a time, each an exposure of it, and decides nothing.
 *
 * Every number and every word comes from the film, worked out there; nothing here keeps time, so a frame is the same
 * whenever it is shot. A prop's drawer sets the prop's numbers as custom properties of its element, which
 * `stage.css` turns into places, sizes and shades, and writes the prop's words where it has any. The script answers
 * the browser adapter, and the room the surfaces it lays apart, under `window.stage` (`src/adapters/browser/stage.ts`):
 * each element it draws is its own, made and let go by it, the room laying its surfaces in the room's canvas. It is
 * JavaScript the type checker reads, run by the page as it stands: nothing is built. It is a plain script, not a module,
 * since Chrome loads no module from a file; nothing else runs in the stage page but `own-page.js`, which it shares
 * with the tab the film's own pages are read in, and whose names stand in one scope with these.
 */
/** @import { DrawnScene, ObjectList, PropName } from '../src/scene.ts' */
/** @import { DrawnSheet, DrawnSweep } from '../src/props/screen.ts' */
/** @import { ShownLine } from '../src/props/terminal.ts' */
/** @import { DrawnPin } from '../src/props/pins.ts' */
/** @import { DrawnWords, Piece } from '../src/props/words.ts' */
/** @import { CodeLine, CodePiece, DrawnCode } from '../src/props/code.ts' */
/** @import { DrawnContent, DrawnObject } from '../src/props/object.ts' */
/** @import { DrawnLines } from '../src/props/lifted.ts' */
/** @import { DrawnHole, DrawnPicture } from '../src/props/piece.ts' */
/** @import { Box, Segment } from '../src/domain/geometry.ts' */
/** @import { Transform } from '../src/domain/stance.ts' */
/** @import { GroundLayers, Look } from '../src/props/look.ts' */
/** @import { OwnPage } from '../src/direction/page.ts' */
/** @import { Drawing } from '../src/direction/film.ts' */
/** @import { FilmsFontHanded, FilmsPictureDecoded, FilmsPictureHanded, HeldPicture, Layout, Opening, PagePicture, StageApi, SurfaceApart } from '../src/adapters/browser/stage.ts' */

/** @typedef {{ readonly draw: (scene: DrawnScene) => void }} Drawer */
/**
 * The frames an exposure lays the film's own pages in, by their keys: each at the screen's size, and, for one a move
 * draws past its screen, a sheet as tall as it is drawn.
 * @typedef {{ readonly onTheScreen: Map<string, HTMLIFrameElement>, readonly sheets: Map<string, HTMLIFrameElement> }} OwnFrames
 */
/** A value of the look set whole on the stage, in place of one token: any but the ground's layers, and the way words come up, which the moves that bring them read @typedef {Exclude<keyof Look, 'groundLayers' | 'words'>} WholeLookName */
/** An element of the stage's markup: the cursor is drawn in SVG, the rest in HTML @typedef {HTMLElement | SVGElement} Staged */
/**
 * Where objects are laid in an exposure's markup: those on the frame by their list, and those inside the page's window.
 * @typedef {{ readonly [Root in ObjectList | 'window']: Staged }} ObjectRoots
 */
/**
 * Where an exposure lays markup standing in the world: among the objects on the frame, in their list's root, as the
 * flat stage draws it; or apart, each object in a surface of its own the exposure makes, which the room lays in its
 * canvas and stands where the object stands in its one scene.
 * @typedef {{ readonly kind: 'among those on the frame' } | { readonly kind: 'apart', readonly surfaces: SurfacesApart }} LaidInTheWorld
 */
/**
 * A surface an object is laid apart in, as the room is handed it, and the holder in it the object is laid in.
 * @typedef {{ readonly apart: SurfaceApart, readonly holder: Staged }} SurfaceHolding
 */
/**
 * An object as its drawer lays it this frame: the key it is kept by, its list, the object, and its element.
 * @typedef {{
 *   readonly key: string,
 *   readonly list: ObjectList,
 *   readonly object: DrawnObject,
 *   readonly staged: StagedObject
 * }} ObjectStaged
 */

// What parts a line's lead from the rest of it
const APART = ' ';
// The lines of the terminal's log are told apart from each other by this, to know when they changed
const BETWEEN_LINES = '\n';
// The attribute that names the side of the window a note's words stand beyond, and the side of its block a callout
// stands on
const SIDE = 'data-side';
// The attribute a title's words stand on a ground of their own by, over their object's whole box, rather than in their
// place on the ground round them, the one that names how they read there, and the one that names where they stand down
// their box, their middle at its middle or their foot at its foot
const ON_GROUND = 'data-on-ground';
const ALIGN = 'data-align';
const WORDS_DOWN = 'data-words-down';
// The attribute that names how an object, or the page's window, is drawn about its middle, flat or leant, and the one
// that names the side of an object the eye sees, its front or its back
const TRANSFORM = 'data-transform';
const FACE = 'data-face';
// What a custom property's name starts with: a matrix's entries are set as custom properties named as each entry is
const CUSTOM_PROPERTY = '--';
// The custom property the page's picture is set as, the image every piece of the page is drawn from; the one a
// picture a piece holds is set as on its element; and the attribute that names which a piece is drawn from
const PAGE_PICTURE = '--page-picture';
const PIECE_PICTURE = '--piece-picture';
const PICTURE = 'data-picture';
// The custom property a picture of the film's own is set as on its element
const FILMS_PICTURE = '--films-picture';
// The custom property the picture light sweeps away is set as on its element, the colours a film gives the light's
// crest at its two ends, the stylesheet's accent standing at an end it gives none, and the attribute its shape is named
// by, a band or a disc
const SWEPT_PICTURE = '--swept-picture';
const CREST_START = '--crest-start';
const CREST_END = '--crest-end';
const SHAPE = 'data-shape';
// The custom property the picture of the page the screen fades from is set as on its element
const FADED_PICTURE = '--faded-picture';
// A page of the film's own: the class every page the screen shows takes, the attribute the one a frame shows takes,
// and the one the screen takes while it shows one; the attribute a frame laid as a sheet past the screen takes, and the
// one the screen takes while it shows a page laid so
const PAGE = 'page';
const SHOWN = 'data-shown';
const SHOWS_OWN = 'data-shows-own';
const SHEET = 'data-sheet';
const PAST = 'data-past';
// How the page the screen shows is mounted where it is the window's back's, which the stylesheet turns it by
const BACK_UPRIGHT = 'data-back-upright';
// The exposure the stage's markup lays out; and the key of the page of the film's own a screen showing the filmed page
// shows: none
const FIRST_EXPOSURE = 0;
const NO_OWN_PAGE = null;
// The attribute a lens shows nothing by, its middle seeing past the screen, so its glass stands blank
const BLANK = 'data-blank';
// The attribute that names the line a ring or a line is drawn in, whole or dashed
const STROKE = 'data-stroke';
// The custom property a hole's colour is set as, and the classes of a hole, of a line drawn from a point, and of a
// piece's two lines to its source
const HOLE_GROUND = '--hole-ground';
const HOLE = 'hole';
const SEGMENT = 'segment';
const SEGMENTS = 'segments';
// The attribute the part an object's figure stands in is on its way by, which one standing whole has not, so it is
// drawn on no way at all; and the one that names how the figure is cut there, from its sides or round its middle
const ON_ITS_WAY = 'data-on-its-way';
const WAY_CUT = 'data-way-cut';
// The attribute an object trailing a wipe's sheen is drawn with, naming the side the wipe cuts from, and the custom
// property the sheen's colour is set as, where the film gives one; the stylesheet takes the look's accent where not
const SHEEN_FROM = 'data-sheen-from';
const SHEEN_COLOUR = '--sheen-colour';
// The attribute an object is drawn with its effects by, which one standing out in no way has not, and the one the
// window shades the page by, which it has not where the page is unshaded: so neither is drawn with a filter at all
const EFFECTS = 'data-effects';
const SHADED = 'data-shaded';
// The attribute that names how far the window's shade reaches, which an unshaded window has not
const SHADE_REACHING = 'data-shade-reaching';
// The attribute the window bears while the shade's blur leaves a part of the page sharp, which it has not where the
// blur leaves none, so no second picture of the page is drawn; and the one it bears while that part softens toward
// the blur, which it has not where the part is wholly sharp, so the part is drawn with no filter at all
const SHARP_PART = 'data-sharp-part';
const SHARP_PART_SOFTENED = 'data-sharp-softened';
// The colour of an object's ring and glow the film gave it, which one in the look's accent has not; and the side of
// its figure an object melts toward, which one melting none has not, so it is drawn with no mask at all
const EFFECT_COLOUR = '--effect-colour';
const MELT_TOWARD = 'data-melt-toward';
// The attribute what the eye's focus blurs is drawn with, which what it draws sharp has not, so that is drawn with no
// filter at all
const OUT_OF_FOCUS = 'data-out-of-focus';
// The attribute the window, or a piece of the page, is drawn with where it has a body the room draws, which takes the
// place of its edge and shadow
const WITH_A_BODY = 'data-body';
// The custom properties a title's own size, letter spacing and line height are set as, where it has each; the
// stylesheet takes the look's where it has not
const OWN_SIZE = '--title-own-size';
const OWN_LETTER_SPACING = '--title-own-letter-spacing';
const OWN_LINE_HEIGHT = '--title-own-line-height';
// The attribute that names the edge of the frame a caption stands at: its foot, or its top
const CAPTION_EDGE = 'data-at';
// The attribute that names which way a note's words run from where its line meets them, or a pin's label from its mark
const RUNS = 'data-runs';
// The ink words are drawn in, the film's or a piece's own, and a piece's marker: the custom properties the stylesheet
// draws them by; and the class of a marked piece
const INK = '--ink';
const MARKER = '--marker';
const MARKED = 'marked';
// The classes of a word's own box, which rises as it comes up, and of the space before it, which keeps to its line
const WORD = 'word';
const SPACE = 'space';
// The attribute that names the way words come up, on the root of their list
const WAY_OF_WORDS = 'data-words';
// The class of a letter of a word laid out letter by letter, each in an element of its own, and the attribute that
// names the sign it stands as before it settles into itself
const LETTER = 'letter';
const SIGN = 'data-sign';
// The class of a pin, and of one whose label a later pin has quietened
const PIN = 'pin';
const QUIET = 'quiet';
// Markup standing in the world laid among the objects on the frame, as the flat stage draws it, so no object is laid
// apart
/** @type {LaidInTheWorld} */
const AMONG_THOSE_ON_THE_FRAME = { kind: 'among those on the frame' };
/** @type {ReadonlyMap<string, Staged>} */
const NONE_LAID_APART = new Map();
// The template a surface an object is laid in apart is made from; the one the surface of what lies over the page is
// made from; and the window's surface, which it is laid after
const SURFACE_APART = 'template[data-apart]';
const OVER_THE_PAGE = 'template[data-over-the-page]';
const WINDOWS_SURFACE = '[data-surface="window"]';
// The class of a line of code; each piece of it is classed by its kind; and the attribute that names how a pane fits
// a line too long
const CODE_LINE = 'code-line';
const LONG_LINES = 'data-long-lines';
// The token each value of the film's look set whole takes the place of on the stage
/** @type {{ readonly [Name in WholeLookName]: string }} */
const LOOK_TOKENS = {
	ground: '--ground',
	glow: '--ground-glow',
	ink: INK,
	quietInk: '--ink-quiet',
	accent: '--accent',
	accentInk: '--accent-ink',
	font: '--font',
	mono: '--mono-font',
	titleSize: '--title-size',
	captionSize: '--caption-size',
	titleMargin: '--title-margin',
	captionGroundHeight: '--caption-ground-height',
	paneCorner: '--pane-corner',
	paneEdge: '--pane-edge',
	paneShadow: '--pane-shadow-strength',
	paneShadowColour: '--pane-shadow-colour',
	terminal: '--terminal',
	terminalInk: '--terminal-ink',
	codeComment: '--code-comment',
	codeString: '--code-string',
	codeNumber: '--code-number',
	codeKeyword: '--code-keyword',
	codeCall: '--code-call',
	codeKey: '--code-key',
	glowX: '--glow-x',
	glowY: '--glow-y',
	titleWeight: '--title-weight',
	captionWeight: '--caption-weight',
	titleLetterSpacing: '--title-letter-spacing',
	titleLineHeight: '--title-line-height',
	noteSize: '--note-size',
	calloutSize: '--callout-size',
	pinSize: '--pin-text-size',
	keysSize: '--keys-size',
	codeSize: '--code-size',
	terminalSize: '--terminal-size',
	endingNameSize: '--ending-name-size',
	endingLineSize: '--ending-line-size',
	endingCommandSize: '--ending-command-size',
	codeLineHeight: '--code-line-height',
	cursorFill: '--cursor-fill',
	cursorEdge: '--cursor-edge',
	cursorSize: '--cursor-size'
};
const LOOK_NAMES = Object.keys(LOOK_TOKENS).filter(isOfTheLook);
// The token each part of the ground's layers takes the place of: those going, those coming, how far these have come
/** @type {{ readonly [Part in keyof GroundLayers]: string }} */
const LAYERS_SET_AS = { going: '--layers-going', coming: '--layers-coming', come: '--layers-come' };
// The attribute the stage's root bears while the world has grain, which lays the ground through the grain's filter
const GRAINED = 'data-grain';
// The noise the grain's filter makes (`stage.html`): each colour round the middle of its whole, spread by 27 of its 255
// levels, its standard deviation (26.4 to 27.2 by colour, measured 2026-11-11 on Chrome 156, in software and on the
// card)
const GRAIN_NOISE = { middle: 0.5, spreadInLevels: 27, levels: 255 };
// The weights of the filter's last step, its attributes: how much of the noise it adds, and what it adds to all
const GRAIN_WEIGHTS = { noise: 'k3', toAll: 'k4' };

/** The camera, drawn on each of its roots: one in each surface the window's view stands in. */
class CameraDrawer {
	/** @param {readonly Staged[]} roots */
	constructor(roots) {
		this.roots = roots;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const pose = scene.camera.pose;
		const cut = scene.camera.cut;
		for (const root of this.roots) {
			numbered(root, {
				'--focus-x': pose.focusX,
				'--focus-y': pose.focusY,
				'--zoom': pose.zoom,
				'--cut-top': cut.top,
				'--cut-right': cut.right,
				'--cut-bottom': cut.bottom,
				'--cut-left': cut.left
			});
		}
	}
}

/**
 * The page's window: where on the frame the camera's picture shows, how round its corners are, how far it stands off
 * the ground, how much of the page shows, how it is drawn about its middle as it leans, by the matrix the engine sees it
 * through, how it shades the page and the part its blur leaves sharp, how soft the eye's focus draws it, and whether
 * it has a body, which the room draws (`stage/body.js`): on each of its roots, one in each surface its view stands in.
 */
class WindowDrawer {
	/** @param {readonly Staged[]} roots */
	constructor(roots) {
		this.roots = roots;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const view = scene.window;
		for (const root of this.roots) {
			numbered(root, {
				'--view-left': view.box.left,
				'--view-top': view.box.top,
				'--view-width': view.box.width,
				'--view-height': view.box.height,
				'--view-corner': view.corner,
				'--lift': view.lift,
				'--page-shown': view.pageShown
			});
			transformed(root, view.transform);
			shadeDrawn(root, view.shade);
			sharpPartDrawn(root, view.sharp);
			focusDrawn(root, view.outOfFocus);
			root.toggleAttribute(WITH_A_BODY, view.body !== null);
		}
	}
}

/**
 * How the window shades the page, drawn on its root: how far the page is dimmed and blurred, as far as it fades being
 * how much of it shows (`WindowDrawer`), and how far the shade reaches; with no filter at all, where it is unshaded.
 * @param {Staged} root @param {DrawnScene['window']['shade']} shade
 */
function shadeDrawn(root, shade) {
	root.toggleAttribute(SHADED, shade !== null);
	named(root, SHADE_REACHING, shade === null ? null : shade.reaching);
	if (shade === null) return;
	numbered(root, { '--shade-dim': shade.dim, '--shade-blur': shade.blur });
}

/**
 * The part of the page the shade's blur leaves sharp, drawn on the window's root: its box in the screen's pixels, how
 * far past it the page softens into the blur, and how far the part itself is blurred, where it softens; none drawn
 * where the blur leaves none.
 * @param {Staged} root @param {DrawnScene['window']['sharp']} sharp
 */
function sharpPartDrawn(root, sharp) {
	root.toggleAttribute(SHARP_PART, sharp !== null);
	root.toggleAttribute(SHARP_PART_SOFTENED, sharp !== null && sharp.blur !== null);
	if (sharp === null) return;
	numbered(root, {
		'--sharp-left': sharp.box.left,
		'--sharp-top': sharp.box.top,
		'--sharp-width': sharp.box.width,
		'--sharp-height': sharp.box.height,
		'--sharp-edge': sharp.edge
	});
	if (sharp.blur !== null) numbered(root, { '--sharp-blur': sharp.blur });
}

/**
 * The screen: how far it has come up, what it shows, the filmed page or one of the film's own laid on it, with what
 * the film typed into it and scrolled as far as the film has run it, or laid so as a sheet past it in a frame of its
 * own, and the
 * picture light sweeps away over it, a band or a disc, and the page it fades from over it; where the eye sees a page on
 * the window's back, how it is mounted, so the stylesheet turns it to stand upright from behind and leaves unseen what
 * lies on the front. Its numbers and names are drawn on each of its roots, one in each surface the window's view
 * stands in; its pages and its sweep stand in the window's surface alone, the page it fades from in the surface of
 * what lies over the page where a frame is drawn as a room.
 */
class ScreenDrawer {
	/**
	 * @param {readonly Staged[]} roots @param {OwnFrames} ownPages
	 * @param {Staged} sweep the part the sweep stands in @param {Staged} fadedPage the part the page it fades from does
	 */
	constructor(roots, ownPages, sweep, fadedPage) {
		this.roots = roots;
		this.ownPages = ownPages;
		this.sweep = sweep;
		this.swept = partOf(sweep, 'swept');
		this.fadedPage = fadedPage;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const shownKey = ownPageShown(scene.screen.shows);
		const sheet = sheetShown(scene.screen.shows);
		for (const root of this.roots) {
			numbered(root, { '--screen-shown': scene.screen.shown });
			root.toggleAttribute(SHOWS_OWN, shownKey !== NO_OWN_PAGE);
			named(root, BACK_UPRIGHT, scene.screen.backUpright);
			sheetLaid(root, sheet);
		}
		const { onTheScreen, sheets } = this.ownPages;
		for (const [key, frame] of onTheScreen) frame.toggleAttribute(SHOWN, key === shownKey && sheet === null);
		for (const [key, frame] of sheets) frame.toggleAttribute(SHOWN, key === shownKey && sheet !== null);
		ownPageDrawn(this.ownPages, scene.screen.shows);
		sweepDrawn(this.sweep, this.swept, scene.screen.sweep);
		fadedPageDrawn(this.fadedPage, scene.screen.fade);
	}
}

/**
 * The page the screen fades from, from the held picture it is, where the camera framed the whole screen as the fade
 * began, as clear as it still shows; none where the screen fades from none.
 * @param {Staged} part @param {DrawnScene['screen']['fade']} fade
 */
function fadedPageDrawn(part, fade) {
	shown(part, fade !== null);
	if (fade === null) {
		part.style.removeProperty(FADED_PICTURE);
		return;
	}
	// CSS takes no address out of a custom property into a url(), so the url() is written whole here
	part.style.setProperty(FADED_PICTURE, `url("${heldPicture(fade.picture).src}")`);
	numbered(part, {
		'--faded-left': fade.box.left,
		'--faded-top': fade.box.top,
		'--faded-width': fade.box.width,
		'--faded-height': fade.box.height,
		'--faded-shown': fade.shown
	});
}

/**
 * How far past the screen the page it shows is laid as a sheet, drawn on a root of the screen's: none, with no numbers
 * at all, where it is drawn on the screen alone.
 * @param {Staged} root @param {DrawnSheet | null} sheet
 */
function sheetLaid(root, sheet) {
	root.toggleAttribute(PAST, sheet !== null);
	if (sheet === null) return;
	numbered(root, { '--past-above': sheet.above, '--past-below': sheet.below });
}

/**
 * The page of the film's own the screen shows as the film has it, in the frame that shows it: its frame at the
 * screen's size, or its sheet, where it is laid as one past the screen; what the film typed into its blocks written,
 * then scrolled as far down as the film has run the page, or, a sheet, to where its top stands. Nothing where the
 * screen shows the filmed page.
 * @param {OwnFrames} ownPages @param {DrawnScene['screen']['shows']} shows
 */
function ownPageDrawn(ownPages, shows) {
	switch (shows.kind) {
		case 'filmed':
			return;
		case 'own':
			if (shows.sheet === null) {
				window.ownPage.pageWritten(ownFrame(ownPages.onTheScreen, shows.key), shows.typed, shows.scrolled);
			} else {
				window.ownPage.pageWritten(ownFrame(ownPages.sheets, shows.key), shows.typed, shows.sheet.scrolled);
			}
	}
}

/**
 * A page of the film's own laid in a frame, by its key, among frames of such pages.
 * @param {ReadonlyMap<string, HTMLIFrameElement>} frames @param {string} key
 */
function ownFrame(frames, key) {
	const frame = frames.get(key);
	if (frame === undefined) throw new Error(`the stage laid no frame of the film's own page by the key ${key}`);
	return frame;
}

/**
 * The sheet the screen's page of the film's own is laid as past the screen; none where it is drawn on the screen
 * alone, or the screen shows the filmed page.
 * @param {DrawnScene['screen']['shows']} shows @returns {DrawnSheet | null}
 */
function sheetShown(shows) {
	switch (shows.kind) {
		case 'filmed':
			return null;
		case 'own':
			return shows.sheet;
	}
}

/**
 * The picture light sweeps away, from the held picture it is, cut where the light has still to sweep, and the light over
 * it in its shape, a band or a disc's ring, as wide as the film has it, its crest in its colours; neither where none
 * sweeps the screen. The shape is named on the part they stand in, and its numbers and the crest's colours set there,
 * which they are drawn by.
 * @param {Staged} part @param {Staged} swept @param {DrawnScene['screen']['sweep']} sweep
 */
function sweepDrawn(part, swept, sweep) {
	shown(part, sweep !== null);
	if (sweep === null) {
		swept.style.removeProperty(SWEPT_PICTURE);
		return;
	}
	// CSS takes no address out of a custom property into a url(), so the url() is written whole here
	swept.style.setProperty(SWEPT_PICTURE, `url("${heldPicture(sweep.picture).src}")`);
	named(part, SHAPE, sweep.shape.kind);
	numbered(part, { ...shapeNumbersOf(sweep.shape), '--sweep-width': sweep.width });
	givenOrNone(part, CREST_START, sweep.crest.start);
	givenOrNone(part, CREST_END, sweep.crest.end);
}

/**
 * The numbers a sweep's shape is drawn by: a band's line and how far past it the picture still to sweep reaches; a
 * disc's middle and radius.
 * @param {DrawnSweep['shape']} shape @returns {Record<string, number>}
 */
function shapeNumbersOf(shape) {
	switch (shape.kind) {
		case 'band':
			return {
				'--band-start-left': shape.band.start.left,
				'--band-start-top': shape.band.start.top,
				'--band-end-left': shape.band.end.left,
				'--band-end-top': shape.band.end.top,
				'--ahead-across': shape.ahead.left,
				'--ahead-down': shape.ahead.top
			};
		case 'disc':
			return { '--disc-left': shape.middle.left, '--disc-top': shape.middle.top, '--disc-radius': shape.radius };
	}
}

/**
 * The key of the page of the film's own the screen shows; none where it shows the filmed page.
 * @param {DrawnScene['screen']['shows']} shows @returns {string | null}
 */
function ownPageShown(shows) {
	switch (shows.kind) {
		case 'filmed':
			return NO_OWN_PAGE;
		case 'own':
			return shows.key;
	}
}

class LightDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const light = scene.light;
		shown(this.root, light !== null && light.strength > 0);
		if (light === null) return;
		numbered(this.root, {
			'--left': light.box.left,
			'--top': light.box.top,
			'--width': light.box.width,
			'--height': light.box.height,
			'--dim': light.dim * light.strength
		});
	}
}

class CursorDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const cursor = scene.cursor;
		shown(this.root, cursor !== null);
		if (cursor === null) return;
		numbered(this.root, { '--left': cursor.left, '--top': cursor.top, '--press': cursor.press });
	}
}

class CalloutDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(root, 'words'), wordElement, wordDrawn);
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const callout = scene.callout;
		shown(this.root, callout !== null);
		if (callout === null) {
			this.words.clear();
			return;
		}
		named(this.root, SIDE, callout.side);
		numbered(this.root, {
			'--left': callout.box.left,
			'--top': callout.box.top,
			'--width': callout.box.width,
			'--height': callout.box.height,
			'--grounded': callout.ground
		});
		wordsDrawn(this.words, callout);
	}
}

/** Pins on blocks of the page, numbered along their path: laid out anew only when one is laid, each set every frame. */
class PinsDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		/** The key of the pins that stand in the markup @type {string | null} */
		this.standing = null;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const pins = scene.pins;
		shown(this.root, pins !== null);
		if (pins === null) {
			this.standing = null;
			return;
		}
		if (this.standing !== pins.key) {
			this.standing = pins.key;
			this.root.replaceChildren(...pins.pins.map(pinElement));
		}
		numbered(this.root, { '--gone': pins.gone });
		for (const [place, pin] of pins.pins.entries()) {
			const element = this.root.children.item(place);
			if (!(element instanceof HTMLElement)) continue;
			numbered(element, {
				'--left': pin.box.left,
				'--top': pin.box.top,
				'--width': pin.box.width,
				'--shown': pin.shown
			});
			element.classList.toggle(QUIET, pin.quiet);
			named(element, RUNS, pin.runs);
		}
	}
}

class NoteDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		this.line = partOf(root, 'line');
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(root, 'words'), wordElement, wordDrawn);
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const note = scene.note;
		shown(this.root, note !== null);
		if (note === null) {
			this.words.clear();
			return;
		}
		named(this.root, SIDE, note.side);
		numbered(this.root, {
			'--place-left': note.place.left,
			'--place-width': note.place.width,
			'--to-top': note.to.top,
			'--gone': note.gone
		});
		segmentDrawn(this.line, note, note.ground);
		wordsDrawn(this.words, note);
	}
}

/**
 * A caption over the frame: its words at the edge of the frame it stands at, on the ground that darkens it, on their
 * way as a way of livereel's has them; and over its words a place keys are laid in.
 */
class CaptionDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		/** The part its words stand in, which a way of livereel's is drawn on */
		this.way = partOf(root, 'way');
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(root, 'words'), wordElement, wordDrawn);
		/** Where keys stand over its words, as tall as the words, which the page lays out */
		this.overTheWords = partOf(root, 'over-the-words');
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const caption = scene.caption;
		shown(this.root, caption !== null);
		if (caption === null) {
			this.words.clear();
			return;
		}
		named(this.root, CAPTION_EDGE, caption.at);
		numbered(this.root, { '--darkened': caption.ground });
		wordsDrawn(this.words, caption);
		wayDrawn(this.way, caption.onItsWay);
	}
}

/**
 * Keys over the frame: the caps of a shortcut at the frame's foot, laid after the caption, so over it; or, where the
 * scene has them over a caption's words, in the place over its words the caption's drawer it is handed holds, risen
 * clear of them. Their caps stand on their way as a way of livereel's has them.
 */
class KeysDrawer {
	/** @param {Staged} root @param {CaptionDrawer} caption */
	constructor(root, caption) {
		this.root = root;
		/** Where the keys stand over no caption: where the markup lays them, after it */
		this.home = found(root.parentElement, 'place for the keys');
		this.caption = caption;
		/** The part their caps stand in, which a way of livereel's is drawn on */
		this.way = partOf(root, 'way');
		/** @type {KeyedList<string>} */
		this.caps = new KeyedList(partOf(root, 'caps'), capElement, drawnWithItsList);
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const keys = scene.keys;
		shown(this.root, keys !== null);
		if (keys === null) {
			this.caps.clear();
			return;
		}
		laidLastIn(keys.overTheCaption ? this.caption.overTheWords : this.home, this.root);
		this.caps.draw(keys.key, keys.caps);
		numbered(this.root, { '--shown': keys.shown, '--clearing': keys.clearing });
		wayDrawn(this.way, keys.onItsWay);
	}
}

/**
 * An element laid last in a holder, over what the holder lays before it, where it lies anywhere else.
 * @param {Staged} holder @param {Staged} element
 */
function laidLastIn(holder, element) {
	if (holder.lastElementChild !== element) holder.append(element);
}

/**
 * A list of the scene's drawn in a root of its own, each item by the name of the piece of the page it is of, laid out
 * anew only as those names change: the holes pieces leave on the screen, the lines they draw to their sources.
 * @template {{ readonly name: string }} Item
 */
class SceneListDrawer {
	/**
	 * @param {Staged} root
	 * @param {(scene: DrawnScene) => readonly Item[]} itemsOf
	 * @param {(item: Item) => Node} elementOf
	 * @param {(element: HTMLElement, item: Item) => void} drawnOn
	 */
	constructor(root, itemsOf, elementOf, drawnOn) {
		this.itemsOf = itemsOf;
		/** @type {KeyedList<Item>} */
		this.items = new KeyedList(root, elementOf, drawnOn);
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		drawnByName(this.items, this.itemsOf(scene));
	}
}

/**
 * A list of named items drawn, laid out anew only as their names change.
 * @template {{ readonly name: string }} Item
 * @param {KeyedList<Item>} list @param {readonly Item[]} items
 */
function drawnByName(list, items) {
	list.draw(JSON.stringify(items.map((item) => item.name)), items);
}

/**
 * The objects of a scene, those standing and those pushed off, each an element made from the template of what it shows
 * and kept by its list and name while it shows that. One on the frame is laid in its list's root, one inside the page's
 * window in the window's: in each, in the scene's order, the last over the rest. One of markup standing in the world is
 * laid among those on the frame, as the flat stage draws it, or apart, in a surface of its own, where the room stands
 * each in its one scene by its own matrix.
 */
class ObjectsDrawer {
	/** @param {ObjectRoots} roots @param {LaidInTheWorld} inTheWorld */
	constructor(roots, inTheWorld) {
		this.roots = roots;
		this.inTheWorld = inTheWorld;
		/** The objects in the markup, by their list and name @type {Map<string, StagedObject>} */
		this.standing = new Map();
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const staged = [
			...scene.objects.map((object) => this.stagedFor('objects', object)),
			...scene.leaving.map((object) => this.stagedFor('leaving', object))
		];
		this.standing = new Map(staged.map((each) => [each.key, each.staged]));
		const apart = this.laidApart(staged.filter(isMarkupInTheWorld));
		/** @type {Map<Staged, Staged[]>} */
		const held = new Map([...Object.values(this.roots), ...apart.values()].map((holder) => [holder, []]));
		for (const each of staged) heldBy(held, this.holderOf(each, apart)).push(each.staged.element);
		for (const [holder, elements] of held) {
			if (!holdsInOrder(holder, elements)) holder.replaceChildren(...elements);
		}
		for (const each of staged) each.staged.draw(each.object);
	}

	/**
	 * The element an object is laid in: its list's root where it stands on the frame, or in the world and is laid among
	 * the objects on the frame; the holder of its surface where it is laid apart; and the window's where it stands inside
	 * it.
	 * @param {ObjectStaged} each @param {ReadonlyMap<string, Staged>} apart @returns {Staged}
	 */
	holderOf(each, apart) {
		switch (each.object.standsIn) {
			case 'frame':
				return this.roots[each.list];
			case 'world':
				return apart.get(each.key) ?? this.roots[each.list];
			case 'window':
				return this.roots.window;
		}
	}

	/**
	 * The holders markup standing in the world is laid in apart this frame, by its keys: none where it is laid among the
	 * objects on the frame.
	 * @param {readonly ObjectStaged[]} markup @returns {ReadonlyMap<string, Staged>}
	 */
	laidApart(markup) {
		switch (this.inTheWorld.kind) {
			case 'among those on the frame':
				return NONE_LAID_APART;
			case 'apart':
				return this.inTheWorld.surfaces.laidFor(markup);
		}
	}

	/** The surfaces markup standing in the world was laid in apart as the exposure last drew. @returns {readonly SurfaceApart[]} */
	surfacesApart() {
		switch (this.inTheWorld.kind) {
			case 'among those on the frame':
				return [];
			case 'apart':
				return this.inTheWorld.surfaces.laid;
		}
	}

	/** Nothing laid apart: the surfaces of an exposure a frame has none of let go, as nothing of it is drawn. */
	noneLaidApart() {
		this.laidApart([]);
	}

	/**
	 * An object of a list, and the element it is drawn in: the one standing by its list and name where it shows what it
	 * showed, else one made.
	 * @param {ObjectList} list @param {DrawnObject} object @returns {ObjectStaged}
	 */
	stagedFor(list, object) {
		const key = keyOf(list, object.name);
		const standing = this.standing.get(key);
		const staged = standing?.kind === object.content.kind ? standing : new StagedObject(object.content.kind);
		return { key, list, object, staged };
	}
}

/**
 * Whether an object is markup standing in the world: standing there, and drawn by the stage's markup, as a thing's
 * element draws nothing, the room drawing the thing itself.
 * @param {ObjectStaged} each
 */
function isMarkupInTheWorld(each) {
	return each.object.standsIn === 'world' && each.object.content.kind !== 'thing';
}

/**
 * The surfaces an exposure lays markup standing in the world in apart, one for each object, each made from the stage's
 * template as its object is first laid apart, and let go once a frame lays nothing in it.
 */
class SurfacesApart {
	constructor() {
		/** Each surface, by its object's list and name @type {ReadonlyMap<string, SurfaceHolding>} */
		this.surfaces = new Map();
		/** The surfaces laid in as the exposure last drew, in the order its objects are drawn @type {readonly SurfaceApart[]} */
		this.laid = [];
	}

	/**
	 * The holders objects of markup standing in the world are laid in this frame, by their keys, each surface made the
	 * first time; the rest let go.
	 * @param {readonly ObjectStaged[]} markup @returns {ReadonlyMap<string, Staged>}
	 */
	laidFor(markup) {
		const surfaces = new Map(markup.map((each) => [each.key, this.surfaces.get(each.key) ?? surfaceApartFor(each)]));
		for (const [key, surface] of this.surfaces) {
			if (!surfaces.has(key)) surface.apart.element.remove();
		}
		this.surfaces = surfaces;
		this.laid = [...surfaces.values()].map((surface) => surface.apart);
		return new Map([...surfaces].map(([key, surface]) => [key, surface.holder]));
	}
}

/**
 * A surface an object of markup standing in the world is laid in apart, made from the stage's template: unlaid until
 * the room lays it in its canvas.
 * @param {ObjectStaged} each @returns {SurfaceHolding}
 */
function surfaceApartFor(each) {
	const template = document.querySelector(SURFACE_APART);
	if (!(template instanceof HTMLTemplateElement))
		throw new Error("the stage's markup has no template of a surface apart");
	const element = document.importNode(template.content, true).firstElementChild;
	if (!(element instanceof HTMLElement)) throw new Error("the stage's template of a surface apart holds no element");
	return { apart: { list: each.list, name: each.object.name, element }, holder: partOf(element, 'objects') };
}

/** An object's element on the stage, made from the template of what it shows: its box and angle set every frame. */
class StagedObject {
	/** @param {DrawnContent['kind']} kind */
	constructor(kind) {
		this.kind = kind;
		this.element = madeFrom(kind);
		this.content = CONTENT_DRAWERS[kind](partOf(this.element, 'content'));
		/** The part its figure stands in — its words, its pane, the card's lines — a way of livereel's is drawn on */
		this.way = partOf(this.element, 'way');
	}

	/** @param {DrawnObject} object */
	draw(object) {
		placed(this.element, object.box);
		numbered(this.element, { '--held': object.held });
		transformed(this.element, object.transform);
		this.element.setAttribute(FACE, object.face);
		wayDrawn(this.way, object.onItsWay);
		sheenDrawn(this.element, object.sheen);
		meltDrawn(this.way, object.melt);
		effectsDrawn(this.element, object.effects);
		focusDrawn(this.element, object.outOfFocus);
		this.content.draw(object.content);
	}
}

/**
 * How soft the eye's focus draws the window or an object, drawn on its element: blurred by as many pixels of its own
 * as the engine says; with no filter at all, where the eye draws it sharp.
 * @param {Staged} element @param {number | null} outOfFocus
 */
function focusDrawn(element, outOfFocus) {
	element.toggleAttribute(OUT_OF_FOCUS, outOfFocus !== null);
	if (outOfFocus === null) return;
	numbered(element, { '--out-of-focus': outOfFocus });
}

/**
 * How an object stands out, drawn on its element: ringed, glowing, casting a shadow and blurred as strongly as each
 * is, its ring and glow in the colour the film gave them or the look's accent; with no filter at all, where it stands
 * out in no way.
 * @param {Staged} element @param {DrawnObject['effects']} effects
 */
function effectsDrawn(element, effects) {
	element.toggleAttribute(EFFECTS, effects !== null);
	if (effects === null) return;
	numbered(element, {
		'--effect-ring': effects.ring,
		'--effect-glow': effects.glow,
		'--effect-shadow': effects.shadow,
		'--effect-blur': effects.blur
	});
	givenOrNone(element, EFFECT_COLOUR, effects.colour);
}

/**
 * An object's figure melted into nothing toward a side of it, from as far in as the melt goes, drawn on the part it
 * stands in and named by its side, so the shadow and glow its object casts follow what is left; with no mask at all,
 * where it melts none.
 * @param {Staged} way @param {DrawnObject['melt']} melt
 */
function meltDrawn(way, melt) {
	named(way, MELT_TOWARD, melt === null ? null : melt.toward);
	if (melt !== null) numbered(way, { '--melt': melt.share });
}

/**
 * An object's figure as far as its way in or out has come, drawn on the part it stands in: on its way, shifted, grown,
 * as clear and as cut as the way has it; on none, where it stands whole or comes in its own way.
 * @param {Staged} way @param {DrawnObject['onItsWay']} onItsWay
 */
function wayDrawn(way, onItsWay) {
	way.toggleAttribute(ON_ITS_WAY, onItsWay !== null);
	if (onItsWay === null) {
		cutDrawn(way, null);
		return;
	}
	numbered(way, {
		'--way-across': onItsWay.shift.across,
		'--way-down': onItsWay.shift.down,
		'--way-scale': onItsWay.scale,
		'--way-clear': onItsWay.clear,
		'--way-shadow': onItsWay.shadow
	});
	cutDrawn(way, onItsWay.cut);
}

/**
 * The sheen a wipe trails behind its edge, drawn on an object's element, apart from what it shows, so it casts none of
 * its shadow: over the part of the box its figure stands in, named by the side the wipe cuts from, in the colour the
 * film gave or the look's accent; none, where the object trails none.
 * @param {Staged} element @param {DrawnObject['sheen']} sheen
 */
function sheenDrawn(element, sheen) {
	named(element, SHEEN_FROM, sheen === null ? null : sheen.from);
	if (sheen === null) return;
	numbered(element, {
		'--sheen-left': sheen.over.left,
		'--sheen-top': sheen.over.top,
		'--sheen-width': sheen.over.width,
		'--sheen-height': sheen.over.height,
		'--sheen-faded': sheen.faded,
		'--sheen-edge': sheen.edge
	});
	givenOrNone(element, SHEEN_COLOUR, sheen.colour);
}

/**
 * A figure on its way cut as its way has it, the cut named by its kind with its numbers; uncut, where it is not.
 * @param {Staged} way @param {NonNullable<DrawnObject['onItsWay']>['cut']} cut
 */
function cutDrawn(way, cut) {
	if (cut === null) {
		way.removeAttribute(WAY_CUT);
		return;
	}
	way.setAttribute(WAY_CUT, cut.kind);
	switch (cut.kind) {
		case 'inset':
			numbered(way, {
				'--way-cut-top': cut.top,
				'--way-cut-right': cut.right,
				'--way-cut-bottom': cut.bottom,
				'--way-cut-left': cut.left
			});
			return;
		case 'circle':
			numbered(way, { '--way-cut-radius': cut.radius });
			return;
	}
}

/** A title's words in their object: on a ground of their own over its whole box, or in their place. */
class TitleWordsDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(element, 'words'), wordElement, wordDrawn);
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const title = ofKind(content, 'title');
		this.element.toggleAttribute(ON_GROUND, title.onGround);
		named(this.element, ALIGN, title.align);
		named(this.element, WORDS_DOWN, title.down);
		givenOrNone(this.element, OWN_SIZE, title.size);
		givenOrNone(this.element, OWN_LETTER_SPACING, title.letterSpacing);
		givenOrNone(this.element, OWN_LINE_HEIGHT, title.lineHeight);
		numbered(this.element, { '--grounded': title.ground });
		wordsDrawn(this.words, title);
	}
}

/** A pane of code in its object: its lines, each line's progress and light set every frame. */
class CodeDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		/** @type {KeyedList<DrawnCode['lines'][number]>} */
		this.lines = new KeyedList(partOf(element, 'lines'), codeLineElement, codeLineDrawn);
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const code = ofKind(content, 'code');
		this.lines.draw(code.key, code.lines);
		numbered(this.element, {
			'--columns': code.columns,
			'--grounded': code.ground,
			'--dimmed': code.dimmed,
			'--scrolled': code.scrolled
		});
		this.element.setAttribute(LONG_LINES, code.longLines);
	}
}

/**
 * A piece of the page in its object: the part of the page's picture over its source, or the picture of its source it
 * holds, as large as its box holds it, its corners as round as the film names, and the holes other pieces leave there,
 * in its figure; marked where it has a body, which the room draws with the shadow it casts (`stage/piece-body.js`).
 */
class PieceDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		/** @type {KeyedList<DrawnHole>} */
		this.holes = new KeyedList(partOf(element, 'way'), holeElement, holeDrawn);
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const piece = ofKind(content, 'piece');
		figureDrawn(this.element, piece);
		sourceDrawn(this.element, piece.source, piece.fit);
		pictureDrawn(this.element, piece.picture);
		this.element.toggleAttribute(WITH_A_BODY, piece.body !== null);
		numbered(this.element, {
			'--corner-top-left': piece.corners.topLeft,
			'--corner-top-right': piece.corners.topRight,
			'--corner-bottom-right': piece.corners.bottomRight,
			'--corner-bottom-left': piece.corners.bottomLeft
		});
		drawnByName(this.holes, piece.holes);
	}
}

/**
 * A lens in its object: the part of the page's picture under its middle, filling it, and the holes pieces leave there;
 * blank where its middle sees past the screen.
 */
class LensDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		/** @type {KeyedList<DrawnHole>} */
		this.holes = new KeyedList(partOf(element, 'way'), holeElement, holeDrawn);
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const lens = ofKind(content, 'lens');
		figureDrawn(this.element, lens);
		this.element.toggleAttribute(BLANK, lens.source === null);
		if (lens.source !== null) sourceDrawn(this.element, lens.source, lens.fit);
		drawnByName(this.holes, lens.holes);
	}
}

/** An outline in its object: its ring, in its line, fading up whole as it comes. */
class OutlineDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const outline = ofKind(content, 'outline');
		named(this.element, STROKE, outline.line);
		numbered(this.element, { '--shown': outline.shown });
	}
}

/**
 * A picture of the film's own in its object: the picture the stage holds by its file, in the part of its box the
 * engine works out, set whole on its element as the page's is on the root, fading up whole as it comes.
 */
class PictureDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const picture = ofKind(content, 'picture');
		figureDrawn(this.element, picture);
		this.element.style.setProperty(FILMS_PICTURE, `url("${filmsPicture(picture.file).src}")`);
	}
}

/**
 * A thing in its object: nothing the markup draws, as the room draws it from the film's own three.js
 * (`stage/room.js`); its element stands for its box alone.
 */
class ThingDrawer {
	/** @param {DrawnContent} content */
	draw(content) {
		ofKind(content, 'thing');
	}
}

/**
 * What draws an object's content in its element.
 * @typedef {{ readonly draw: (content: DrawnContent) => void }} ContentDrawer
 */

/**
 * The drawer of each kind of content, for the content element of an object made from that kind's template: the type
 * checker refuses a kind without one.
 * @type {{ readonly [Kind in DrawnContent['kind']]: (element: Staged) => ContentDrawer }}
 */
const CONTENT_DRAWERS = {
	title: (element) => new TitleWordsDrawer(element),
	code: (element) => new CodeDrawer(element),
	terminal: (element) => new TerminalDrawer(element),
	ending: (element) => new EndingDrawer(element),
	piece: (element) => new PieceDrawer(element),
	outline: (element) => new OutlineDrawer(element),
	lens: (element) => new LensDrawer(element),
	picture: (element) => new PictureDrawer(element),
	thing: () => new ThingDrawer()
};

/**
 * Elements made from a list under a root, a word's, a line of code's or a key's cap each: laid out anew only when the
 * list's key changes, each element drawn as its item has it every frame.
 * @template Item
 */
class KeyedList {
	/**
	 * @param {Staged} root
	 * @param {(item: Item) => Node} elementOf
	 * @param {(element: HTMLElement, item: Item) => void} drawnOn
	 */
	constructor(root, elementOf, drawnOn) {
		this.root = root;
		this.elementOf = elementOf;
		this.drawnOn = drawnOn;
		/** The key of the list that stands in the markup @type {string | null} */
		this.standing = null;
	}

	/** @param {string} key @param {readonly Item[]} items */
	draw(key, items) {
		if (this.standing !== key) {
			this.standing = key;
			this.root.replaceChildren(...items.map((item) => this.elementOf(item)));
		}
		for (const [place, item] of items.entries()) {
			const element = this.root.children.item(place);
			if (element instanceof HTMLElement) this.drawnOn(element, item);
		}
	}

	/** Nothing of the list stands in the markup now. */
	clear() {
		this.standing = null;
	}
}

/** The agent's terminal in its object: its title, its log, laid out anew only as its lines change, the line typed. */
class TerminalDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		this.title = partOf(element, 'title');
		this.log = partOf(element, 'log');
		this.typed = partOf(element, 'typed');
		/** The lines that stand in the log @type {string | null} */
		this.standing = null;
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const terminal = ofKind(content, 'terminal');
		const lines = terminal.lines.map((line) => [line.kind, line.lead, line.text].join(APART)).join(BETWEEN_LINES);
		if (this.standing !== lines) {
			this.standing = lines;
			this.log.replaceChildren(...terminal.lines.map(lineElement));
		}
		this.title.textContent = terminal.title;
		this.typed.textContent = terminal.typed;
		numbered(this.element, { '--shown': terminal.shown, '--caret': Number(terminal.caret) });
	}
}

/** The ending card in its object: its name, what it is, and the command that starts it. */
class EndingDrawer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		this.name = partOf(element, 'name');
		this.what = partOf(element, 'what');
		this.command = partOf(element, 'command');
	}

	/** @param {DrawnContent} content */
	draw(content) {
		const ending = ofKind(content, 'ending');
		this.name.textContent = ending.card.name;
		this.what.textContent = ending.card.line;
		this.command.textContent = ending.card.command;
		numbered(this.element, { '--grounded': ending.grounded, '--shown': ending.shown });
	}
}

/** The film's look, set on the stage's root, where every rule of the stylesheet reads it. */
class LookDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		for (const name of LOOK_NAMES) this.root.style.setProperty(LOOK_TOKENS[name], String(scene.look[name]));
		const layers = scene.look.groundLayers;
		this.root.style.setProperty(LAYERS_SET_AS.going, layers.going);
		this.root.style.setProperty(LAYERS_SET_AS.coming, layers.coming);
		numbered(this.root, { [LAYERS_SET_AS.come]: layers.come });
	}
}

/**
 * The world's look as the stage draws it: its grain, a filter the stylesheet lays the ground through while the stage's
 * root is marked grained, set as strong as the world's grain spreads a colour. Its light and glow the room draws.
 */
class WorldDrawer {
	/** @param {Staged} root the stage's root @param {Staged} grain the filter's step that adds its noise to the ground */
	constructor(root, grain) {
		this.root = root;
		this.grain = grain;
	}

	/**
	 * The noise added as far as the grain spreads a colour, in shares of the noise's own spread, less its middle as far,
	 * so the ground stays as light on the whole. CSS sets nothing of an SVG filter's arithmetic: its weights are its
	 * attributes alone.
	 * @param {DrawnScene} scene
	 */
	draw(scene) {
		const spread = scene.world.grain;
		this.root.toggleAttribute(GRAINED, spread !== null);
		if (spread === null) return;
		const noiseAdded = (spread * GRAIN_NOISE.levels) / GRAIN_NOISE.spreadInLevels;
		this.grain.setAttribute(GRAIN_WEIGHTS.noise, String(noiseAdded));
		this.grain.setAttribute(GRAIN_WEIGHTS.toAll, String(-noiseAdded * GRAIN_NOISE.middle));
	}
}

/**
 * An exposure of the frame: its root, a drawer for every prop it draws, for its objects, and for the holes and lines
 * pieces of the page leave and draw, and the page it shows, live or as a picture, and the pages of the film's own laid
 * in its screen, by their keys. Every prop but the look and the world is drawn in each exposure, as the camera stood at
 * its moment: the type checker refuses a prop without a drawer. The look is the stage's root's, one for every exposure
 * of a frame; the objects' drawer draws those pushed off too, as both lists lay what stands inside the page's window in
 * its one root; the world's grain is drawn on the stage's root, one for every exposure, as the look is; its light lights
 * the room's things and the window's body alone, which the room draws
 * (`stage/things.js`, `stage/body.js`), and its glow the room draws over a frame (`stage/room.js`), as it blurs the
 * world by how the eye sees (`stage/lens.js`) and sees it from where the eye stands, laying what stands in the world in
 * the order the scene hands, and drawing what lies over the page in the window into a texture where anything does.
 * @typedef {{
 *   readonly root: Staged,
 *   readonly drawers: { readonly [Name in Exclude<keyof DrawnScene, 'look' | 'world' | 'leaving' | 'laidInTheWorld' | 'overThePage' | 'eye'>]: Drawer }
 *     & { readonly objects: ObjectsDrawer },
 *   readonly page: Staged,
 *   readonly picture: Staged,
 *   readonly ownPages: OwnFrames
 * }} Exposure
 */

const LOOK = new LookDrawer(document.documentElement);
const WORLD = new WorldDrawer(
	document.documentElement,
	partOf(found(document.querySelector('[data-prop="world"]'), 'world'), 'grain')
);
const FIRST_ROOT = found(document.querySelector('[data-exposure]'), 'exposure');
// The first exposure's root as the markup lays it out, before anything is drawn: every further exposure copies it
const UNDRAWN_ROOT = FIRST_ROOT.cloneNode(true);
/** The exposures the stage draws a frame as, made as it is laid out, the first of them its markup's own. @type {Exposure[]} */
const EXPOSURES = [];
/**
 * The pictures of parts of the screen pieces are drawn from, decoded, by their numbers: those they hold, and those
 * sharper than the page's. Each is kept as an image, not its address alone: a `url()` the stylesheet draws loads after
 * a frame may be captured without it, and the image kept decoded at the same address is drawn by the very next capture.
 * @type {Map<number, HTMLImageElement>}
 */
const HELD_PICTURES = new Map();
/**
 * The film's own pictures, decoded, by the paths the film names them by: kept as images, as the pictures of parts of
 * the screen are, so every frame drawn after they are laid shows them whole.
 * @type {Map<string, HTMLImageElement>}
 */
const FILMS_PICTURES = new Map();
// The size of a picture that decodes to none, which the film is refused for (`films-files.ts`)
const NO_SIZE = 0;
// A font of the film's own stands for every weight the look sets it at: a variable font's file moves with the weight,
// a static one's stays as drawn, never thickened or thinned by the browser
const EVERY_WEIGHT = '1 1000';
// The custom property an exposure's share is set as: how much of it shows over the exposures laid before it. Laid over
// so many before it, it shows the whole of its own light in as many parts as there are with it, so each weighs the
// same
const SHARE = '--share';
const WHOLE = 1;
const ITSELF = 1;

/**
 * The stage laid out, drawing as many exposures of a frame at once as the layout asks, as it is drawn: the first on
 * the markup's own root, a copy of it made for each further one it lacks. An exposure made keeps how it lays markup
 * standing in the world: a stage laid out anew, as the live page's is for each act, is drawn as it was.
 * @param {Layout} layout
 */
function setup(layout) {
	numbered(document.documentElement, {
		'--frame-width': layout.format.frame.width,
		'--frame-height': layout.format.frame.height,
		'--screen-width': layout.format.screen.width,
		'--screen-height': layout.format.screen.height,
		'--frame-scale': layout.frameScale
	});
	while (EXPOSURES.length < layout.exposures) {
		const root = EXPOSURES.length === FIRST_EXPOSURE ? FIRST_ROOT : addedCopy(UNDRAWN_ROOT);
		EXPOSURES.push(exposureOf(root, layout.drawing));
	}
}

/**
 * An exposure of the frame by its root, laid out as it is drawn: laying markup standing in the world as that has it,
 * and, drawn as a room, what lies over the page in the window in a surface apart.
 * @param {Staged} root @param {Drawing} drawing @returns {Exposure}
 */
function exposureOf(root, drawing) {
	if (drawing === 'room') overThePageLaidApart(root);
	/** @type {OwnFrames} */
	const ownPages = { onTheScreen: new Map(), sheets: new Map() };
	const caption = new CaptionDrawer(propRoot(root, 'caption'));
	return {
		root,
		drawers: {
			camera: new CameraDrawer(propRoots(root, 'camera')),
			window: new WindowDrawer(propRoots(root, 'window')),
			screen: new ScreenDrawer(propRoots(root, 'screen'), ownPages, partOf(root, 'sweep'), partOf(root, 'faded-page')),
			light: new LightDrawer(propRoot(root, 'light')),
			callout: new CalloutDrawer(propRoot(root, 'callout')),
			pins: new PinsDrawer(propRoot(root, 'pins')),
			cursor: new CursorDrawer(propRoot(root, 'cursor')),
			note: new NoteDrawer(propRoot(root, 'note')),
			caption,
			keys: new KeysDrawer(propRoot(root, 'keys'), caption),
			objects: new ObjectsDrawer(
				{ objects: sceneRoot(root, 'objects'), leaving: sceneRoot(root, 'leaving'), window: sceneRoot(root, 'window') },
				inTheWorldDrawn(drawing)
			),
			holes: new SceneListDrawer(sceneRoot(root, 'holes'), (scene) => scene.holes, holeElement, holeDrawn),
			lines: new SceneListDrawer(sceneRoot(root, 'lines'), (scene) => scene.lines, linesElement, linesDrawn)
		},
		page: partOf(root, 'page'),
		picture: partOf(root, 'picture'),
		ownPages
	};
}

/**
 * What lies over the page in an exposure's window — the page the screen fades from, the callout, the pins, the objects
 * standing in the window — laid in a surface of its own after the window's, made from the stage's template, where the
 * room lays it over the screen and the page's picture: as the screen fades whole, what lies over it does not, and the
 * room lays the picture under the screen's own markup alone.
 * @param {Staged} root
 */
function overThePageLaidApart(root) {
	const template = document.querySelector(OVER_THE_PAGE);
	if (!(template instanceof HTMLTemplateElement))
		throw new Error("the stage's markup has no template of what lies over the page");
	const surface = document.importNode(template.content, true).firstElementChild;
	if (!(surface instanceof HTMLElement))
		throw new Error("the stage's template of what lies over the page holds no element");
	found(root.querySelector(WINDOWS_SURFACE), "window's surface").after(surface);
	partOf(surface, 'camera').append(partOf(root, 'faded-page'), propRoot(root, 'callout'), propRoot(root, 'pins'));
	partOf(surface, 'view').append(sceneRoot(root, 'window'));
}

/**
 * Where an exposure lays markup standing in the world, as it is drawn: flat, among the objects on the frame, in the
 * order they are drawn; as a room, apart, as the room stands each in its one scene.
 * @param {Drawing} drawing @returns {LaidInTheWorld}
 */
function inTheWorldDrawn(drawing) {
	switch (drawing) {
		case 'flat':
			return AMONG_THOSE_ON_THE_FRAME;
		case 'room':
			return { kind: 'apart', surfaces: new SurfacesApart() };
	}
}

/**
 * An exposure by its place among the stage's: the stage is laid out before it opens, shows or draws anything.
 * @param {number} place
 */
function exposureAt(place) {
	const exposure = EXPOSURES[place];
	if (exposure === undefined) throw new Error(`the stage has no exposure ${place + 1}: it draws ${EXPOSURES.length}`);
	return exposure;
}

/** A copy of an element laid after everything else on the stage: its root. @param {Node} original */
function addedCopy(original) {
	const copy = original.cloneNode(true);
	if (!(copy instanceof HTMLElement)) throw new Error("the stage's exposure is no element");
	document.body.append(copy);
	return copy;
}

/**
 * Whether a name is one of the look's set whole. Every key of the table is one, but `Object.keys` types each as a bare
 * string: the guard keeps them all and tells the type checker they are the look's names.
 * @param {string} name @returns {name is WholeLookName}
 */
function isOfTheLook(name) {
	return Object.hasOwn(LOOK_TOKENS, name);
}

/**
 * The surfaces an exposure, by its place among the stage's, laid markup standing in the world in apart as it last drew:
 * none where it is drawn flat.
 * @param {number} exposure
 */
function laidApart(exposure) {
	return exposureAt(exposure).drawers.objects.surfacesApart();
}

/**
 * The page opened in the first exposure's screen's frame, the frame sandboxed first where it is to be: a stage with
 * the page live draws one exposure at a time, as no copy of it can show the page again.
 * @param {Opening} opening
 */
function open(opening) {
	const page = exposureAt(FIRST_EXPOSURE).page;
	if (opening.sandbox !== null) page.setAttribute('sandbox', opening.sandbox);
	page.setAttribute('src', opening.address);
}

/**
 * A picture of the page shown in the frame's place in every exposure, once it is decoded, so the next frame drawn
 * shows it whole; and set on the stage's root as the picture every piece of the page is drawn from. It is shown at an
 * address of the stage's own, short however large the picture: Chrome drops a custom property's value longer than
 * 2,097,152 characters, which a dense page's picture, taken as sharp as livereel's closest camera needs it, passes as a
 * data URL (measured 2026-11-03).
 * The address of the picture it takes the place of is let go once nothing shows it.
 * @param {PagePicture} picture @returns {Promise<void>}
 */
async function show(picture) {
	const shownBefore = exposureAt(FIRST_EXPOSURE).picture.getAttribute('src');
	const address = addressOf(picture);
	await Promise.all(EXPOSURES.map((exposure) => shownIn(exposure, address)));
	// CSS takes no address out of a custom property into a url(), so the url() is written whole here
	document.documentElement.style.setProperty(PAGE_PICTURE, `url("${address}")`);
	if (shownBefore !== null) URL.revokeObjectURL(shownBefore);
}

/**
 * A picture of a part of the screen held by its number until it is let go, once it is decoded, so the next frame drawn
 * shows every piece drawn from it whole; at an address of the stage's own, as the page's picture is.
 * @param {HeldPicture} picture @returns {Promise<void>}
 */
async function hold(picture) {
	const held = new Image();
	held.src = addressOf(picture);
	await held.decode();
	HELD_PICTURES.set(picture.number, held);
}

/** A picture of a part of the screen held let go, by its number, and its address with it. @param {number} number */
function letGo(number) {
	URL.revokeObjectURL(heldPicture(number).src);
	HELD_PICTURES.delete(number);
}

/**
 * The film's own pictures held by their paths, each at an address of the stage's own as the page's pictures are, once
 * it is decoded: the size each decoded at, none where it decodes to no picture.
 * @param {readonly FilmsPictureHanded[]} pictures @returns {Promise<readonly FilmsPictureDecoded[]>}
 */
function layPictures(pictures) {
	return Promise.all(pictures.map((picture) => laidPicture(picture)));
}

/** A picture of the film's own held by its path, and the size it decoded at. @param {FilmsPictureHanded} picture */
async function laidPicture(picture) {
	const image = new Image();
	image.src = addressOf(picture);
	FILMS_PICTURES.set(picture.path, image);
	return { path: picture.path, ...(await decodedSize(image)) };
}

/** The size an image decodes at: none across and down where it decodes to no picture. @param {HTMLImageElement} image */
async function decodedSize(image) {
	try {
		await image.decode();
		return { width: image.naturalWidth, height: image.naturalHeight };
	} catch {
		return { width: NO_SIZE, height: NO_SIZE };
	}
}

/**
 * The film's own fonts joining the stage's, each under the family it sets, once its file is read, so every word set
 * after in that family is set in it: the paths of those the browser reads as no font.
 * @param {readonly FilmsFontHanded[]} fonts @returns {Promise<readonly string[]>}
 */
async function layFonts(fonts) {
	const joined = await Promise.all(fonts.map((font) => fontJoined(font)));
	return fonts.filter((_font, place) => !joined[place]).map((font) => font.path);
}

/**
 * A font of the film's joining the stage's under its family, where the browser reads its file as one: whether it does.
 * @param {FilmsFontHanded} font @returns {Promise<boolean>}
 */
async function fontJoined(font) {
	const face = new FontFace(font.family, Uint8Array.fromBase64(font.base64), { weight: EVERY_WEIGHT });
	try {
		await face.load();
	} catch {
		return false;
	}
	document.fonts.add(face);
	return true;
}

/** A picture of the film's own the stage holds, by its path. @param {string} path */
function filmsPicture(path) {
	const held = FILMS_PICTURES.get(path);
	if (held === undefined) throw new Error(`the stage holds no picture of the film's ${path}`);
	return held;
}

/** A picture handed to the stage at an address of the stage's own, which holds its bytes. @param {PagePicture} picture */
function addressOf(picture) {
	return URL.createObjectURL(new Blob([Uint8Array.fromBase64(picture.base64)], { type: picture.type }));
}

/**
 * A picture of the page, by its address, shown in an exposure's frame's place, once decoded.
 * @param {Exposure} exposure @param {string} address
 */
async function shownIn(exposure, address) {
	if (!(exposure.picture instanceof HTMLImageElement)) throw new Error("the stage's picture of the page is no image");
	exposure.picture.src = address;
	await exposure.picture.decode();
	exposure.picture.removeAttribute('hidden');
	exposure.page.setAttribute('hidden', '');
}

/**
 * The pages of the film's own laid in the screen of every exposure, over the filmed page's place, each a document of
 * its own at the screen's size, laid out but unseen until a frame shows it, so its fonts load; and again, as a sheet
 * the stylesheet lays as tall as it is drawn past the screen, each a move draws so: once each has loaded and its fonts
 * are ready. Moves read none of them, but the copy of each in a tab of its own (`pages.html`).
 * @param {readonly OwnPage[]} pages
 */
async function layOwnPages(pages) {
	await Promise.all(EXPOSURES.flatMap((exposure) => pages.map((page) => laidIn(exposure, page))));
	await Promise.all(
		EXPOSURES.flatMap((exposure) => pages.filter((page) => page.drawnPast).map((page) => sheetLaidIn(exposure, page)))
	);
}

/**
 * A page of the film's own laid in an exposure's screen at the screen's size, once it has loaded and its fonts are
 * ready.
 * @param {Exposure} exposure @param {OwnPage} page
 */
async function laidIn(exposure, page) {
	const frame = await window.ownPage.frameLaid(page, (laid) => exposure.picture.after(classed(laid, PAGE)));
	exposure.ownPages.onTheScreen.set(page.key, frame);
}

/**
 * A page of the film's own laid in an exposure's screen as a sheet past it, once it has loaded and its fonts are ready.
 * @param {Exposure} exposure @param {OwnPage} page
 */
async function sheetLaidIn(exposure, page) {
	const frame = await window.ownPage.frameLaid(page, (laid) => exposure.picture.after(classed(laid, PAGE)));
	frame.toggleAttribute(SHEET, true);
	exposure.ownPages.sheets.set(page.key, frame);
}

/**
 * One frame, drawn whole from each of its exposures' scenes, in the look of its first: each exposure laid over those
 * before it at its share, so each weighs the same; an exposure the frame has none of hidden, and what it laid apart let
 * go. A frame of no exposure, or of more than the stage has, is refused, rather than drawn without some of them.
 * @param {readonly DrawnScene[]} scenes
 */
function apply(scenes) {
	const [first] = scenes;
	if (first === undefined || scenes.length > EXPOSURES.length) {
		throw new Error(
			`the stage draws a frame as its own exposure and at most ${EXPOSURES.length}: not ${scenes.length}`
		);
	}
	LOOK.draw(first);
	WORLD.draw(first);
	for (const [place, exposure] of EXPOSURES.entries()) {
		const scene = scenes[place];
		shown(exposure.root, scene !== undefined);
		if (scene === undefined) {
			exposure.drawers.objects.noneLaidApart();
			continue;
		}
		numbered(exposure.root, { [SHARE]: WHOLE / (place + ITSELF) });
		for (const drawer of Object.values(exposure.drawers)) drawer.draw(scene);
	}
}

/**
 * An element's custom properties set to numbers: the stylesheet gives each its unit.
 * @param {Staged} element
 * @param {Readonly<Record<string, number>>} numbers
 */
function numbered(element, numbers) {
	for (const [name, value] of Object.entries(numbers)) element.style.setProperty(name, String(value));
}

/**
 * An element drawn about its middle as the engine works it out, by the kind of its transform: flat, by the six entries
 * of its matrix a 2D `matrix()` takes, or leant, by all sixteen of a `matrix3d()`. An object is drawn so itself; the
 * window's root holds the numbers its view and its shadow are drawn by.
 * @param {Staged} element @param {Transform} transform
 */
function transformed(element, transform) {
	element.setAttribute(TRANSFORM, transform.kind);
	numbered(
		element,
		Object.fromEntries(Object.entries(transform.matrix).map(([entry, value]) => [CUSTOM_PROPERTY + entry, value]))
	);
}

/**
 * An element standing in a place: its box on the frame, in the frame's pixels.
 * @param {Staged} element @param {Box} box
 */
function placed(element, box) {
	numbered(element, { '--left': box.left, '--top': box.top, '--width': box.width, '--height': box.height });
}

/** A prop shown, or hidden while it is not on the scene. @param {Staged} element @param {boolean} isShown */
function shown(element, isShown) {
	element.toggleAttribute('hidden', !isShown);
}

/**
 * An element's attribute set to a name the film gave, or taken off where it gave none.
 * @param {Staged} element @param {string} attribute @param {string | null} name
 */
function named(element, attribute, name) {
	if (name === null) element.removeAttribute(attribute);
	else element.setAttribute(attribute, name);
}

/**
 * An element's custom property set to a value the film gave, a number or a colour, or taken off where it gave none, so
 * the stylesheet's own stands.
 * @param {Staged} element @param {string} property @param {number | string | null} value
 */
function givenOrNone(element, property, value) {
	if (value === null) element.style.removeProperty(property);
	else element.style.setProperty(property, String(value));
}

/**
 * A word as it comes up: the space before it, where one is, and the word's own box, each piece of it set as its run is;
 * a word laid out letter by letter with every letter the engine names in an element of its own.
 * @param {DrawnWords['words'][number]} word
 */
function wordElement(word) {
	switch (word.kind) {
		case 'word by word':
			return wordOf(word, pieceElement);
		case 'lettered':
			return lettersNumbered(wordOf(word, letteredPieceElement));
	}
}

/**
 * A word laid out, each piece by `pieceOf`: the space before it, where one is, and the word's own box.
 * @param {DrawnWords['words'][number]} word @param {(piece: Piece) => HTMLElement} pieceOf
 */
function wordOf(word, pieceOf) {
	const element = document.createElement('span');
	if (word.spaceBefore !== null) element.append(classed(pieceOf(word.spaceBefore), SPACE));
	const box = classed(document.createElement('span'), WORD);
	box.append(...word.pieces.map(pieceOf));
	element.append(box);
	return element;
}

/** A piece of a word laid out letter by letter, set as its run is, each of its letters in an element of its own. @param {Piece} piece */
function letteredPieceElement(piece) {
	const element = pieceElement(piece);
	element.replaceChildren(...piece.letters.map(letterElement));
	return element;
}

/** A letter of a word laid out letter by letter. @param {string} letter */
function letterElement(letter) {
	const element = classed(document.createElement('span'), LETTER);
	element.textContent = letter;
	return element;
}

/**
 * A word laid out letter by letter, its letters numbered in the order they come, which is the order they read in: the
 * space before the word first. @param {HTMLElement} word
 */
function lettersNumbered(word) {
	for (const [place, letter] of word.querySelectorAll(`.${LETTER}`).entries()) {
		if (letter instanceof HTMLElement) numbered(letter, { '--letter': place });
	}
	return word;
}

/** An element with a class of the stage's styles. @param {HTMLElement} element @param {string} name */
function classed(element, name) {
	element.classList.add(name);
	return element;
}

/** A piece of a word: its styles its classes, its ink and its marker the colours the stylesheet draws them in. @param {Piece} piece */
function pieceElement(piece) {
	const element = document.createElement('span');
	element.textContent = piece.text;
	element.classList.add(...piece.styles);
	if (piece.ink !== null) element.style.setProperty(INK, piece.ink);
	if (piece.marker !== null) {
		element.classList.add(MARKED);
		element.style.setProperty(MARKER, piece.marker);
	}
	return element;
}

/** A pin: its number, and its label beside it. @param {DrawnPin} pin */
function pinElement(pin) {
	const element = classed(document.createElement('div'), PIN);
	const number = document.createElement('b');
	number.textContent = String(pin.number);
	const label = document.createElement('span');
	label.textContent = pin.label;
	element.append(number, label);
	return element;
}

/**
 * Words drawn in their list, the way they come up named on the list's root, as the stylesheet draws each way.
 * @param {KeyedList<DrawnWords['words'][number]>} list @param {DrawnWords} words
 */
function wordsDrawn(list, words) {
	named(list.root, WAY_OF_WORDS, words.way);
	list.draw(words.key, words.words);
}

/**
 * How far a word has come up and how far it has gone; of a word laid out letter by letter, how many of its letters
 * stand, whether the caret follows them, and the sign each letter stands as, where it does.
 * @param {HTMLElement} element @param {DrawnWords['words'][number]} word
 */
function wordDrawn(element, word) {
	switch (word.kind) {
		case 'word by word':
			numbered(element, { '--appeared': word.appeared, '--gone': word.gone });
			return;
		case 'lettered':
			numbered(element, {
				'--appeared': word.appeared,
				'--gone': word.gone,
				'--typed': word.letters,
				'--caret': Number(word.caret)
			});
			signsDrawn(element, word.signs);
			return;
	}
}

/**
 * Each letter of a word standing as its sign, by the letter's place in the word, or as itself where it has none.
 * @param {HTMLElement} word @param {readonly (string | null)[]} signs
 */
function signsDrawn(word, signs) {
	for (const [place, letter] of word.querySelectorAll(`.${LETTER}`).entries()) {
		const sign = signs[place] ?? null;
		if (sign === null) letter.removeAttribute(SIGN);
		else letter.setAttribute(SIGN, sign);
	}
}

/** How far a line of code has come up, and how far it is lit. @param {HTMLElement} element @param {DrawnCode['lines'][number]} line */
function codeLineDrawn(element, line) {
	numbered(element, { '--appeared': line.appeared, '--lit': line.lit });
}

/** What an element that moves only with its list is drawn as every frame: nothing. */
function drawnWithItsList() {}

/** A line of code, its pieces in order, each of a kind in an element classed by it. @param {CodeLine} line */
function codeLineElement(line) {
	const row = classed(document.createElement('div'), CODE_LINE);
	row.append(...line.pieces.map(codePieceNode));
	return row;
}

/** A piece of code: plain text, or an element its kind names the class of. @param {CodePiece} piece */
function codePieceNode(piece) {
	if (piece.kind === null) return piece.text;
	const element = classed(document.createElement('span'), piece.kind);
	element.textContent = piece.text;
	return element;
}

/** A key's cap, its name on it. @param {string} name */
function capElement(name) {
	const cap = document.createElement('kbd');
	cap.textContent = name;
	return cap;
}

/** A line of the log, its kind its class, what leads it set apart. @param {ShownLine} line */
function lineElement(line) {
	const row = document.createElement('div');
	row.className = line.kind;
	if (line.lead !== '') {
		const lead = document.createElement('b');
		lead.textContent = line.lead;
		row.append(lead, APART);
	}
	row.append(line.text);
	return row;
}

/** The root of a prop's elements in an exposure's markup. @param {Element} exposure @param {PropName} prop */
function propRoot(exposure, prop) {
	return found(exposure.querySelector(`[data-prop="${prop}"]`), prop);
}

/**
 * Every root of a prop's elements in an exposure's markup: one, or one in each surface it stands in, as the window, the
 * camera and the screen stand in the window's surface and in that of what lies over the page.
 * @param {Element} exposure @param {PropName} prop
 */
function propRoots(exposure, prop) {
	return [...exposure.querySelectorAll(`[data-prop="${prop}"]`)].map((root) => found(root, prop));
}

/**
 * Where a list of the scene's is laid in an exposure's markup: its objects standing on the frame, those pushed off and
 * those standing in the page's window; the holes pieces of the page leave, and the lines they draw to their sources.
 * @param {Element} exposure @param {keyof ObjectRoots | 'holes' | 'lines'} list
 */
function sceneRoot(exposure, list) {
	return found(exposure.querySelector(`[data-scene="${list}"]`), list);
}

/**
 * A line from a point, as far drawn out from it as a share of its length.
 * @param {Staged} element @param {Segment} segment @param {number} drawn
 */
function segmentDrawn(element, segment, drawn) {
	numbered(element, {
		'--from-left': segment.from.left,
		'--from-top': segment.from.top,
		'--length': segment.length,
		'--angle': segment.angle,
		'--drawn': drawn
	});
}

/**
 * The part of an object's box that shows the page, a piece's or a lens's, and how far it has come up.
 * @param {Staged} element @param {{ readonly figure: Box, readonly shown: number }} drawn
 */
function figureDrawn(element, drawn) {
	numbered(element, {
		'--figure-left': drawn.figure.left,
		'--figure-top': drawn.figure.top,
		'--figure-width': drawn.figure.width,
		'--figure-height': drawn.figure.height,
		'--shown': drawn.shown
	});
}

/**
 * The part of the page's picture over a source that part shows, a screen's pixel taking so many of the frame's.
 * @param {Staged} element @param {Box} source @param {number} fit
 */
function sourceDrawn(element, source, fit) {
	numbered(element, {
		'--source-left': source.left,
		'--source-top': source.top,
		'--source-width': source.width,
		'--source-height': source.height,
		'--fit': fit
	});
}

/**
 * The picture a piece is drawn from, named by its kind: the page's, as the stage shows it, or one of its source alone
 * the stage holds, set whole on its element as the page's is on the root, as CSS takes no address out of a custom
 * property.
 * @param {Staged} element @param {DrawnPicture} picture
 */
function pictureDrawn(element, picture) {
	named(element, PICTURE, picture.kind);
	switch (picture.kind) {
		case 'page':
			element.style.removeProperty(PIECE_PICTURE);
			return;
		case 'own':
			element.style.setProperty(PIECE_PICTURE, `url("${heldPicture(picture.number).src}")`);
	}
}

/** A picture of a part of the screen the stage holds, by its number. @param {number} number */
function heldPicture(number) {
	const held = HELD_PICTURES.get(number);
	if (held === undefined) throw new Error(`the stage holds no picture numbered ${number}`);
	return held;
}

function holeElement() {
	return classed(document.createElement('div'), HOLE);
}

/**
 * A hole: the box it fills, on the screen or in what a piece or a lens shows of it, its colour, the line round its
 * edge, if any, how round its corners are, and how far it has come.
 * @param {HTMLElement} element @param {DrawnHole} hole
 */
function holeDrawn(element, hole) {
	placed(element, hole.box);
	numbered(element, { '--corner': hole.corner, '--shown': hole.shown });
	element.style.setProperty(HOLE_GROUND, hole.ground);
	named(element, STROKE, hole.line);
}

/** A piece's two lines to its source. */
function linesElement() {
	const element = classed(document.createElement('div'), SEGMENTS);
	element.append(classed(document.createElement('div'), SEGMENT), classed(document.createElement('div'), SEGMENT));
	return element;
}

/**
 * A piece's two lines to its source, in their line, drawn out as far as the piece has come.
 * @param {HTMLElement} element @param {DrawnLines} lines
 */
function linesDrawn(element, lines) {
	named(element, STROKE, lines.line);
	for (const [place, segment] of lines.segments.entries()) {
		const line = element.children.item(place);
		if (line instanceof HTMLElement) segmentDrawn(line, segment, lines.drawn);
	}
}

/** The key an object's element is kept by: its list and its name. @param {ObjectList} list @param {string} name */
function keyOf(list, name) {
	return `${list} ${name}`;
}

/**
 * What a holder of objects holds this frame: a root of the stage's, or the holder of a surface it lays apart this
 * frame. An object laid in any other is the stage's fault.
 * @param {ReadonlyMap<Staged, Staged[]>} held @param {Staged} holder
 */
function heldBy(held, holder) {
	const elements = held.get(holder);
	if (elements === undefined) throw new Error('the stage lays an object in a holder it has not made this frame');
	return elements;
}

/** Whether an element holds these elements and no other, in this order. @param {Staged} root @param {readonly Staged[]} elements */
function holdsInOrder(root, elements) {
	return (
		root.children.length === elements.length &&
		elements.every((element, place) => root.children.item(place) === element)
	);
}

/** An object's element, made from the template of what it shows. @param {DrawnContent['kind']} kind */
function madeFrom(kind) {
	const template = document.querySelector(`template[data-kind="${kind}"]`);
	if (!(template instanceof HTMLTemplateElement)) throw new Error(`the stage's markup has no template of ${kind}`);
	return found(document.importNode(template.content, true).firstElementChild, kind);
}

/**
 * Content of a kind as its drawer is handed it: an object's element is made anew where what it shows changes kind
 * (`ObjectsDrawer`), so content of another kind is the stage's fault.
 * @template {DrawnContent['kind']} Kind
 * @param {DrawnContent} content @param {Kind} kind @returns {Extract<DrawnContent, { kind: Kind }>}
 */
function ofKind(content, kind) {
	if (!isOfKind(content, kind)) throw new Error(`an object of ${kind} is handed ${content.kind}`);
	return content;
}

/**
 * @template {DrawnContent['kind']} Kind
 * @param {DrawnContent} content @param {Kind} kind @returns {content is Extract<DrawnContent, { kind: Kind }>}
 */
function isOfKind(content, kind) {
	return content.kind === kind;
}

/** An element under a root, by the part it plays. @param {Element} root @param {string} part */
function partOf(root, part) {
	return found(root.querySelector(`[data-part="${part}"]`), part);
}

/** @param {Element | null} element @param {string} name */
function found(element, name) {
	if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
		throw new Error(`the stage's markup has no ${name}`);
	}
	return element;
}

/** @type {StageApi} */
const STAGE = { setup, laidApart, open, show, hold, letGo, layOwnPages, layPictures, layFonts, apply };
window.stage = STAGE;
