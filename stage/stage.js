// @ts-check
/**
 * The stage's script: it draws the scene it is handed, a frame at a time, and decides nothing.
 *
 * Every number and every word comes from the film, worked out there; nothing here keeps time, so a frame is the same
 * whenever it is shot. A prop's drawer sets the prop's numbers as custom properties of its element, which
 * `stage.css` turns into places, sizes and shades, and writes the prop's words where it has any. The script answers
 * the browser adapter under `window.stage` (`src/adapters/browser/stage.ts`). It is JavaScript the type checker
 * reads, run by the page as it stands: nothing is built. It is a plain script, not a module, since Chrome loads no
 * module from a file; nothing else runs in the stage page, so its names stand alone there.
 */
/** @import { DrawnScene, PropName } from '../src/scene.ts' */
/** @import { ShownLine } from '../src/props/terminal.ts' */
/** @import { DrawnPin } from '../src/props/pins.ts' */
/** @import { DrawnWords, Piece, Word } from '../src/props/words.ts' */
/** @import { CodeLine, CodePiece, DrawnCode, DrawnCodePane } from '../src/props/code.ts' */
/** @import { DrawnTitleWords } from '../src/props/title.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { Look } from '../src/props/look.ts' */
/** @import { Opening, Room, StageApi } from '../src/adapters/browser/stage.ts' */

/** @typedef {{ readonly draw: (scene: DrawnScene) => void }} Drawer */
/** An element of the stage's markup: the cursor is drawn in SVG, the rest in HTML @typedef {HTMLElement | SVGElement} Staged */

// What parts a line's lead from the rest of it
const APART = ' ';
// The lines of the terminal's log are told apart from each other by this, to know when they changed
const BETWEEN_LINES = '\n';
// The attribute that names the side of the window a note's words stand beyond, and the side of its block a callout
// stands on
const SIDE = 'data-side';
// The attribute a title stands in a place by, rather than over the whole frame on its ground, and the one that names
// how it reads there
const PLACED = 'data-placed';
const ALIGN = 'data-align';
// The custom property a title's own size is set as, where it has one; the stylesheet takes the look's where it has not
const OWN_SIZE = '--title-own-size';
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
// The class of a pin, and of one whose label a later pin has quietened
const PIN = 'pin';
const QUIET = 'quiet';
// The class of a line of code; each piece of it is classed by its kind
const CODE_LINE = 'code-line';
// What each value of the film's look sets on the stage: the token it takes the place of, or, for a value that names a
// way, the attribute the stylesheet reads it by
/** @type {{ readonly [Name in keyof Look]: { readonly token: string } | { readonly attribute: string } }} */
const LOOK_SET_AS = {
	ground: { token: '--ground' },
	glow: { token: '--ground-glow' },
	ink: { token: INK },
	quietInk: { token: '--ink-quiet' },
	accent: { token: '--accent' },
	accentInk: { token: '--accent-ink' },
	font: { token: '--font' },
	mono: { token: '--mono-font' },
	titleSize: { token: '--title-size' },
	captionSize: { token: '--caption-size' },
	titleMargin: { token: '--title-margin' },
	captionGroundHeight: { token: '--caption-ground-height' },
	windowCorner: { token: '--window-corner' },
	windowEdge: { token: '--window-edge' },
	windowShadow: { token: '--window-shadow' },
	windowShadowColour: { token: '--window-shadow-colour' },
	terminal: { token: '--terminal' },
	terminalInk: { token: '--terminal-ink' },
	codeComment: { token: '--code-comment' },
	codeString: { token: '--code-string' },
	codeNumber: { token: '--code-number' },
	codeKeyword: { token: '--code-keyword' },
	codeCall: { token: '--code-call' },
	codeKey: { token: '--code-key' },
	terminalWidth: { token: '--terminal-width' },
	terminalHeight: { token: '--terminal-height' },
	glowX: { token: '--glow-x' },
	glowY: { token: '--glow-y' },
	titleWeight: { token: '--title-weight' },
	captionWeight: { token: '--caption-weight' },
	noteSize: { token: '--note-size' },
	calloutSize: { token: '--callout-size' },
	pinSize: { token: '--pin-text-size' },
	keysSize: { token: '--keys-size' },
	codeSize: { token: '--code-size' },
	terminalSize: { token: '--terminal-size' },
	endingNameSize: { token: '--ending-name-size' },
	endingLineSize: { token: '--ending-line-size' },
	endingCommandSize: { token: '--ending-command-size' },
	cursorFill: { token: '--cursor-fill' },
	cursorEdge: { token: '--cursor-edge' },
	wordsMotion: { attribute: 'data-words-motion' }
};
const LOOK_NAMES = Object.keys(LOOK_SET_AS).filter(isOfTheLook);

class CameraDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const pose = scene.camera.pose;
		const cut = scene.camera.cut;
		numbered(this.root, {
			'--focus-x': pose.focusX,
			'--focus-y': pose.focusY,
			'--zoom': pose.zoom,
			'--tilt': pose.tilt,
			'--turn': pose.turn,
			'--cut-top': cut.top,
			'--cut-right': cut.right,
			'--cut-bottom': cut.bottom,
			'--cut-left': cut.left
		});
	}
}

/** The page's window: where on the frame the camera's picture shows, and how far it stands off the ground. */
class WindowDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const view = scene.window;
		numbered(this.root, {
			'--view-left': view.box.left,
			'--view-top': view.box.top,
			'--view-width': view.box.width,
			'--view-height': view.box.height,
			'--lift': view.lift
		});
	}
}

class ScreenDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		numbered(this.root, { '--screen-shown': scene.screen.shown });
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

class CaptionDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(root, 'words'), wordElement, wordNumbers);
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
		numbered(this.root, { '--darkened': caption.ground, '--gone': caption.gone });
		this.words.draw(caption.key, caption.words);
	}
}

class CalloutDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(root, 'words'), wordElement, wordNumbers);
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
			'--grounded': callout.ground,
			'--gone': callout.gone
		});
		this.words.draw(callout.key, callout.words);
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
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(root, 'words'), wordElement, wordNumbers);
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
			'--from-left': note.from.left,
			'--from-top': note.from.top,
			'--to-top': note.to.top,
			'--length': note.length,
			'--angle': note.angle,
			'--drawn': note.ground,
			'--gone': note.gone
		});
		this.words.draw(note.key, note.words);
	}
}

class KeysDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		/** @type {KeyedList<string>} */
		this.caps = new KeyedList(root, capElement, noNumbers);
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const keys = scene.keys;
		shown(this.root, keys !== null);
		if (keys === null) {
			this.caps.clear();
			return;
		}
		this.caps.draw(keys.key, keys.caps);
		numbered(this.root, { '--shown': keys.shown, '--clearing': keys.clearing });
	}
}

/** Code: the pane standing, and the one it pushes off past the frame's edge as it slides in. */
class CodeDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.standing = new CodeLayer(partOf(root, 'standing'));
		this.pushedOff = new CodeLayer(partOf(root, 'pushed-off'));
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		this.standing.draw(scene.code);
		this.pushedOff.draw(scene.code?.pushedOff ?? null);
	}
}

/** One pane of code in its place: its lines, each line's progress and light set every frame. */
class CodeLayer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		/** @type {KeyedList<DrawnCode['lines'][number]>} */
		this.lines = new KeyedList(partOf(element, 'lines'), codeLineElement, codeLineNumbers);
	}

	/** @param {DrawnCodePane | null} code */
	draw(code) {
		shown(this.element, code !== null);
		if (code === null) {
			this.lines.clear();
			return;
		}
		this.lines.draw(code.key, code.lines);
		placed(this.element, code.box);
		numbered(this.element, {
			'--columns': code.columns,
			'--grounded': code.ground,
			'--dimmed': code.dimmed
		});
	}
}

/** The title: the one standing, and the one it pushes off past the frame's edge as it slides in. */
class TitleDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.standing = new TitleLayer(partOf(root, 'standing'));
		this.pushedOff = new TitleLayer(partOf(root, 'pushed-off'));
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		this.standing.draw(scene.title);
		this.pushedOff.draw(scene.title?.pushedOff ?? null);
	}
}

/** One title's words, over the whole frame on their ground or in their place. */
class TitleLayer {
	/** @param {Staged} element */
	constructor(element) {
		this.element = element;
		/** @type {KeyedList<DrawnWords['words'][number]>} */
		this.words = new KeyedList(partOf(element, 'words'), wordElement, wordNumbers);
	}

	/** @param {DrawnTitleWords | null} title */
	draw(title) {
		shown(this.element, title !== null);
		if (title === null) {
			this.words.clear();
			return;
		}
		this.element.toggleAttribute(PLACED, title.box !== null);
		if (title.box !== null) placed(this.element, title.box);
		named(this.element, ALIGN, title.align);
		numberedOrNone(this.element, OWN_SIZE, title.size);
		numbered(this.element, { '--grounded': title.ground, '--gone': title.gone });
		this.words.draw(title.key, title.words);
	}
}

/**
 * Elements made from a list under a root, a word's, a line of code's or a key's cap each: laid out anew only when the
 * list's key changes, each element's numbers set every frame.
 * @template Item
 */
class KeyedList {
	/**
	 * @param {Staged} root
	 * @param {(item: Item) => Node} elementOf
	 * @param {(item: Item) => Readonly<Record<string, number>>} numbersOf
	 */
	constructor(root, elementOf, numbersOf) {
		this.root = root;
		this.elementOf = elementOf;
		this.numbersOf = numbersOf;
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
			if (element instanceof HTMLElement) numbered(element, this.numbersOf(item));
		}
	}

	/** Nothing of the list stands in the markup now. */
	clear() {
		this.standing = null;
	}
}

class TerminalDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		this.title = partOf(root, 'title');
		this.log = partOf(root, 'log');
		this.typed = partOf(root, 'typed');
		/** The lines that stand in the log, so it is laid out anew only when they change @type {string | null} */
		this.standing = null;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const terminal = scene.terminal;
		shown(this.root, terminal !== null);
		if (terminal === null) {
			this.standing = null;
			return;
		}
		const lines = terminal.lines.map((line) => [line.kind, line.lead, line.text].join(APART)).join(BETWEEN_LINES);
		if (this.standing !== lines) {
			this.standing = lines;
			this.log.replaceChildren(...terminal.lines.map(lineElement));
		}
		this.title.textContent = terminal.title;
		this.typed.textContent = terminal.typed;
		numbered(this.root, { '--shown': terminal.shown, '--caret': Number(terminal.caret) });
	}
}

class EndingDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
		this.name = partOf(root, 'name');
		this.what = partOf(root, 'what');
		this.command = partOf(root, 'command');
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const ending = scene.ending;
		shown(this.root, ending !== null);
		if (ending === null) return;
		this.name.textContent = ending.card.name;
		this.what.textContent = ending.card.line;
		this.command.textContent = ending.card.command;
		numbered(this.root, {
			'--shown': ending.shown,
			'--shift-left': ending.shift.left,
			'--shift-top': ending.shift.top
		});
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
		for (const name of LOOK_NAMES) {
			const value = String(scene.look[name]);
			const set = LOOK_SET_AS[name];
			if ('token' in set) this.root.style.setProperty(set.token, value);
			else this.root.setAttribute(set.attribute, value);
		}
	}
}

/** A drawer for every prop of the scene: the type checker refuses a prop without one. @type {{ readonly [Name in PropName]: Drawer }} */
const DRAWERS = {
	look: new LookDrawer(document.documentElement),
	camera: new CameraDrawer(propRoot('camera')),
	window: new WindowDrawer(propRoot('window')),
	screen: new ScreenDrawer(propRoot('screen')),
	light: new LightDrawer(propRoot('light')),
	callout: new CalloutDrawer(propRoot('callout')),
	pins: new PinsDrawer(propRoot('pins')),
	cursor: new CursorDrawer(propRoot('cursor')),
	note: new NoteDrawer(propRoot('note')),
	title: new TitleDrawer(propRoot('title')),
	code: new CodeDrawer(propRoot('code')),
	caption: new CaptionDrawer(propRoot('caption')),
	keys: new KeysDrawer(propRoot('keys')),
	terminal: new TerminalDrawer(propRoot('terminal')),
	ending: new EndingDrawer(propRoot('ending'))
};
const PAGE = partOf(document.body, 'page');

/** @param {Room} room */
function setup(room) {
	numbered(document.documentElement, {
		'--frame-width': room.format.frame.width,
		'--frame-height': room.format.frame.height,
		'--screen-width': room.format.screen.width,
		'--screen-height': room.format.screen.height,
		'--eye-distance': room.eyeDistance,
		'--frame-scale': room.frameScale
	});
}

/**
 * Whether a name is one of the look's. Every key of the table is one, but `Object.keys` types each as a bare string:
 * the guard keeps them all and tells the type checker they are the look's names.
 * @param {string} name @returns {name is keyof Look}
 */
function isOfTheLook(name) {
	return Object.hasOwn(LOOK_SET_AS, name);
}

/** The page opened in the screen's frame, the frame sandboxed first where it is to be. @param {Opening} opening */
function open(opening) {
	if (opening.sandbox !== null) PAGE.setAttribute('sandbox', opening.sandbox);
	PAGE.setAttribute('src', opening.address);
}

/** @param {DrawnScene} scene */
function apply(scene) {
	for (const drawer of Object.values(DRAWERS)) drawer.draw(scene);
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
 * An element's custom property set to a number the film gave, or taken off where it gave none, so the stylesheet's
 * own stands.
 * @param {Staged} element @param {string} property @param {number | null} number
 */
function numberedOrNone(element, property, number) {
	if (number === null) element.style.removeProperty(property);
	else element.style.setProperty(property, String(number));
}

/**
 * A word as it comes up: the space before it, where one is, and the word's own box, each piece of it set as its run is.
 * @param {Word} word
 */
function wordElement(word) {
	const element = document.createElement('span');
	if (word.spaceBefore !== null) element.append(classed(pieceElement(word.spaceBefore), SPACE));
	const box = classed(document.createElement('span'), WORD);
	box.append(...word.pieces.map(pieceElement));
	element.append(box);
	return element;
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

/** How far a word has come up. @param {DrawnWords['words'][number]} word */
function wordNumbers(word) {
	return { '--appeared': word.appeared };
}

/** How far a line of code has come up, and how far it is lit. @param {DrawnCode['lines'][number]} line */
function codeLineNumbers(line) {
	return { '--appeared': line.appeared, '--lit': line.lit };
}

/** What an element that moves only with its list is set every frame: nothing. */
function noNumbers() {
	return {};
}

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

/** The root of a prop's elements in the stage's markup. @param {PropName} prop */
function propRoot(prop) {
	return found(document.querySelector(`[data-prop="${prop}"]`), prop);
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
const STAGE = { setup, open, apply };
window.stage = STAGE;
