// @ts-check
/**
 * The stage's script: it draws the scene it is handed, a frame at a time, and decides nothing.
 *
 * Every number and every word comes from the film, worked out there; nothing here keeps time, so a frame is the same
 * whenever it is shot. A prop's drawer sets the prop's numbers as custom properties of its element, which
 * `stage.css` turns into places, sizes and shades, and writes the prop's words where it has any. The script answers
 * the browser adapter under `window.stage` (`src/adapters/browser/stage.ts`). It is JavaScript the type checker
 * reads, run by the page as it stands: nothing is built.
 */
/** @import { DrawnScene, PropName } from '../src/scene.ts' */
/** @import { Format } from '../src/domain/geometry.ts' */
/** @import { ShownLine } from '../src/props/terminal.ts' */
/** @import { StageApi } from '../src/adapters/browser/stage.ts' */

/** @typedef {{ readonly draw: (scene: DrawnScene) => void }} Drawer */
/** An element of the stage's markup: the cursor is drawn in SVG, the rest in HTML @typedef {HTMLElement | SVGElement} Staged */

// What parts a line's lead from the rest of it
const APART = ' ';
// The lines of the terminal's log are told apart from each other by this, to know when they changed
const BETWEEN_LINES = '\n';

class CameraDrawer {
	/** @param {Staged} root */
	constructor(root) {
		this.root = root;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const pose = scene.camera;
		numbered(this.root, {
			'--focus-x': pose.focusX,
			'--focus-y': pose.focusY,
			'--zoom': pose.zoom,
			'--tilt': pose.tilt,
			'--turn': pose.turn
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
		numbered(this.root, { '--shown': scene.screen.shown });
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
		this.words = partOf(root, 'words');
		/** The text whose words stand in the markup, so they are laid out anew only when the caption changes @type {string | null} */
		this.standing = null;
	}

	/** @param {DrawnScene} scene */
	draw(scene) {
		const caption = scene.caption;
		shown(this.root, caption !== null);
		if (caption === null) {
			this.standing = null;
			return;
		}
		if (this.standing !== caption.text) {
			this.standing = caption.text;
			this.words.replaceChildren(...caption.words.map((word) => wordElement(word.text)));
		}
		numbered(this.root, { '--darkened': caption.ground, '--gone': caption.gone });
		for (const [place, word] of caption.words.entries()) {
			const element = this.words.children.item(place);
			if (element instanceof HTMLElement) numbered(element, { '--appeared': word.appeared });
		}
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
		numbered(this.root, { '--leaving': terminal.leaving, '--caret': Number(terminal.caret) });
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
		numbered(this.root, { '--shown': ending.shown });
	}
}

/** A drawer for every prop of the scene: the type checker refuses a prop without one. @type {{ readonly [Name in PropName]: Drawer }} */
const DRAWERS = {
	camera: new CameraDrawer(propRoot('camera')),
	screen: new ScreenDrawer(propRoot('screen')),
	light: new LightDrawer(propRoot('light')),
	cursor: new CursorDrawer(propRoot('cursor')),
	caption: new CaptionDrawer(propRoot('caption')),
	terminal: new TerminalDrawer(propRoot('terminal')),
	ending: new EndingDrawer(propRoot('ending'))
};
const PAGE = partOf(document.body, 'page');

/** @param {Format} format */
function setup(format) {
	numbered(document.documentElement, {
		'--frame-width': format.frame.width,
		'--frame-height': format.frame.height,
		'--screen-width': format.screen.width,
		'--screen-height': format.screen.height
	});
}

/** @param {string} address */
function open(address) {
	PAGE.setAttribute('src', address);
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

/** A prop shown, or hidden while it is not on the scene. @param {Staged} element @param {boolean} isShown */
function shown(element, isShown) {
	element.toggleAttribute('hidden', !isShown);
}

/** @param {string} text */
function wordElement(text) {
	const element = document.createElement('span');
	element.textContent = text;
	return element;
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
