/**
 * The page a film shot on its set is filmed on (`src/adapters/browser/set.ts`): one state of the set at a time, its
 * picture filling the page, which answers under `window.filmSet` (`SetApi`). A state is shown once its picture is
 * decoded, so the picture of the page taken after it shows it whole.
 */
/** @import { SetApi, StateLaid } from '../src/adapters/browser/set.ts' */

// The picture shown
const PICTURE = pictureOf(document.querySelector('[data-part="state"]'));
/** The address of each state's picture, by the state's name, as the set was laid @type {Map<string, string>} */
const PICTURES = new Map();

/** @param {readonly StateLaid[]} states */
async function lay(states) {
	for (const state of states) PICTURES.set(state.name, state.picture);
	const [first] = states;
	if (first === undefined) throw new Error('a set is laid with a state at least');
	await show(first.name);
}

/** @param {string} name */
async function show(name) {
	const picture = PICTURES.get(name);
	if (picture === undefined) throw new Error(`the set was laid with no state ${name}`);
	PICTURE.src = picture;
	await PICTURE.decode();
}

/** @param {Element | null} element */
function pictureOf(element) {
	if (!(element instanceof HTMLImageElement)) throw new Error("the set's page has no picture of a state");
	return element;
}

/** @type {SetApi} */
const SET = { lay, show };
window.filmSet = SET;
