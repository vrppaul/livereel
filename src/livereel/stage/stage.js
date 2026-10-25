/*
 * The stage draws the scene it is handed, a frame at a time, and decides nothing: every number and every word comes
 * from the film (scene.py), worked out there. It moves nothing of itself, so a frame is the same whenever it is shot.
 */

// How far the cursor shrinks pressed all the way in, and where its tip is in its own drawing
const PRESS_SHRINK = 0.18;
const CURSOR_TIP = 3;
// How far a caption's word rises as it comes, and how blurred it starts; how far it sinks and blurs as it goes
const WORD_RISE = 22;
const WORD_BLUR = 10;
const WORD_SINK = 10;
const WORD_BLUR_LEAVING = 6;
// How much the terminal shrinks as it leaves, and how far the ending rises as it comes
const TERMINAL_SHRINKS = 0.06;
const ENDING_RISE = 24;

const part = (selector) => document.querySelector(selector);
const parts = {
	root: document.documentElement,
	screen: part("#screen"),
	page: part("#page"),
	light: part("#light"),
	cursor: part("#cursor"),
	caption: part("#caption"),
	captionGround: part("#caption-ground"),
	terminal: part("#terminal"),
	terminalTitle: part("#terminal .title"),
	terminalLog: part("#terminal .log"),
	terminalTyped: part("#terminal .line .typed"),
	terminalCaret: part("#terminal .line .caret"),
	ending: part("#ending"),
	endingName: part("#ending .name"),
	endingWhat: part("#ending .what"),
	endingCommand: part("#ending .command .typed"),
};
let frame = { width: 0, height: 0 };
let captionDrawn = null;

function show(element, shown) {
	element.style.display = shown ? "" : "none";
}

function placeScreen(pose, screenShown) {
	parts.screen.style.opacity = String(screenShown);
	parts.screen.style.transform =
		`translate(${frame.width / 2}px, ${frame.height / 2}px) rotateX(${pose.tilt}deg) rotateY(${pose.turn}deg) ` +
		`scale(${pose.zoom}) translate(${-pose.focus_x}px, ${-pose.focus_y}px)`;
}

function light(lit) {
	show(parts.light, lit !== null && lit.strength > 0);
	if (lit === null) return;
	const { left, top, width, height } = lit.box;
	Object.assign(parts.light.style, {
		left: `${left - lit.pad}px`,
		top: `${top - lit.pad}px`,
		width: `${width + 2 * lit.pad}px`,
		height: `${height + 2 * lit.pad}px`,
	});
	parts.light.style.setProperty("--dim", String(lit.dim * lit.strength));
}

function pointer(cursor) {
	show(parts.cursor, cursor !== null);
	if (cursor === null) return;
	const tip = `translate(${cursor.left - CURSOR_TIP}px, ${cursor.top - CURSOR_TIP}px)`;
	parts.cursor.style.transform = `${tip} scale(${1 - PRESS_SHRINK * cursor.press})`;
}

function wordOf(word) {
	const span = document.createElement("span");
	span.textContent = word.text;
	return span;
}

function caption(said) {
	show(parts.caption, said !== null);
	show(parts.captionGround, said !== null);
	if (said === null) {
		captionDrawn = null;
		return;
	}
	if (captionDrawn !== said.text) {
		captionDrawn = said.text;
		parts.caption.replaceChildren(...said.words.map(wordOf));
	}
	parts.captionGround.style.opacity = String(said.ground);
	said.words.forEach((word, place) => {
		const span = parts.caption.children[place];
		span.style.opacity = String(word.appeared * (1 - said.gone));
		span.style.transform = `translateY(${(1 - word.appeared) * WORD_RISE - said.gone * WORD_SINK}px)`;
		span.style.filter = `blur(${(1 - word.appeared) * WORD_BLUR + said.gone * WORD_BLUR_LEAVING}px)`;
	});
}

function terminalLine(line) {
	const row = document.createElement("div");
	row.className = line.kind;
	if (line.lead) {
		const lead = document.createElement("b");
		lead.textContent = line.lead;
		row.append(lead, " ");
	}
	row.append(line.text);
	return row;
}

function terminal(shown) {
	show(parts.terminal, shown !== null);
	if (shown === null) return;
	parts.terminal.style.opacity = String(1 - shown.leaving);
	parts.terminal.style.transform = `scale(${1 - TERMINAL_SHRINKS * shown.leaving})`;
	parts.terminalTitle.textContent = shown.title;
	parts.terminalLog.replaceChildren(...shown.shown.map(terminalLine));
	parts.terminalTyped.textContent = shown.typed;
	parts.terminalCaret.style.visibility = shown.caret ? "visible" : "hidden";
}

function ending(shown) {
	show(parts.ending, shown !== null);
	if (shown === null) return;
	parts.ending.style.opacity = String(shown.shown);
	parts.endingName.textContent = shown.name;
	parts.endingWhat.textContent = shown.line;
	parts.endingCommand.textContent = shown.command;
	for (const child of parts.ending.children) {
		child.style.transform = `translateY(${(1 - shown.shown) * ENDING_RISE}px)`;
	}
}

window.stage = {
	setup(sizes) {
		const given = JSON.parse(sizes);
		frame = given.frame;
		parts.root.style.setProperty("--frame-width", `${given.frame.width}px`);
		parts.root.style.setProperty("--frame-height", `${given.frame.height}px`);
		parts.root.style.setProperty("--screen-width", `${given.screen.width}px`);
		parts.root.style.setProperty("--screen-height", `${given.screen.height}px`);
	},
	open(address) {
		parts.page.src = address;
	},
	apply(scene) {
		placeScreen(scene.pose, scene.screen_shown);
		light(scene.light);
		pointer(scene.cursor);
		caption(scene.caption);
		terminal(scene.terminal);
		ending(scene.ending);
	},
};
