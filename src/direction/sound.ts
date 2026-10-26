/**
 * The sounds a film makes: livereel's, which a film may give files in place of or go without, its keys on one of
 * livereel's keyboards; files of the film's; and music under it all.
 *
 * A move notes the sounds it makes as cues, each at a point of its way; the take hears a cue on the frame the move is
 * set at or past that point, eased, so a key is heard on the frame its letter shows. A film keeps its own time, so a
 * sound heard is laid at its frame's moment however long the browser took. A sound made in a cut is heard on the
 * frame after it, so one made in a cut that ends the film comes at its end and is not heard: the track is as long as
 * the film. A path is from the film's file.
 */
import { FilmError } from '../domain/errors.ts';
import { type Keystroke, typingSeconds } from '../domain/typing.ts';
import type { TurnedOff } from './turned-off.ts';

/** livereel's sounds: the cursor pressed in, a key typed, the ending coming up. */
export type LivereelSound = 'click' | 'key' | 'ending';

/** livereel's keyboards, each recorded key by key: what a key typed sounds like where the film gives no file for it. */
const KEYBOARD_SOUNDS = ['membrane', 'mechanical', 'mechanical-bright', 'butterfly', 'laptop', 'clicky'] as const;
export type KeyboardSound = (typeof KEYBOARD_SOUNDS)[number];

/** A sound: one of livereel's, or a file of the film's. */
export type Sound =
	{ readonly kind: 'livereel'; readonly name: LivereelSound } | { readonly kind: 'file'; readonly path: string };

/** A sound a move makes once it is `at` that far along its way, from 0 to 1. */
export interface Cue {
	readonly at: number;
	readonly sound: Sound;
}

/** What a film writes in place of one of livereel's sounds: a file of its own, or none, the sound turned off. */
type SoundInPlace = string | TurnedOff;

/** What a film writes in place of livereel's sounds, those it names; the rest stay livereel's. */
export type SoundsInPlace = Partial<Readonly<Record<LivereelSound, SoundInPlace>>>;

/**
 * livereel's sounds as a film writes them: `{ enabled: false }` for none; or livereel's, with a file of the film's or
 * none in place of those it names, and its keys on one of livereel's keyboards or something in its place, not both.
 */
// The keyboard's form comes last: a name livereel has not is then said not to be a `KeyboardSound`
export type LivereelSoundsScript =
	| TurnedOff
	| ({ readonly enabled?: true; readonly keyboard?: never } & SoundsInPlace)
	| ({ readonly enabled?: true; readonly keyboard?: KeyboardSound; readonly key?: never } & Omit<SoundsInPlace, 'key'>);

/** What stands in place of one of livereel's sounds as a film is shot with it: a file of the film's, or nothing. */
type SourceInPlace = { readonly kind: 'file'; readonly path: string } | { readonly kind: 'off' };

/** One of livereel's sounds as a film is shot with it: livereel's own, or what the film put in its place. */
export type SoundSource = { readonly kind: 'livereel' } | SourceInPlace;

/** livereel's key as a film is shot with it: one of livereel's keyboards, or what the film put in its place. */
export type KeySource = { readonly kind: 'keyboard'; readonly keyboard: KeyboardSound } | SourceInPlace;

/** livereel's key as a film whose types nobody checked may hand it: something in its place, a keyboard's name, or both. */
interface KeyAsHanded {
	readonly key?: SoundInPlace | undefined;
	readonly keyboard?: string | undefined;
}

/** livereel's sounds as a film is shot with them: where each one comes from. */
export interface LivereelSounds {
	readonly click: SoundSource;
	readonly key: KeySource;
	readonly ending: SoundSource;
}

/** A track under the whole film, at `volume` (1 as it is), cut to the film's length and faded out at its end. */
export interface Music {
	readonly file: string;
	readonly volume: number;
}

/** What a film says of its sounds: livereel's, some in files of its own, or none at all; and its music. */
export interface FilmSound {
	readonly livereels: LivereelSounds | null;
	readonly music: Music | null;
}

/** A move's sound, written as the film writes it: the film's file where it gives one, livereel's otherwise. */
export interface SoundScript {
	readonly sound?: string;
}

// Where on its way a move makes a sound it makes as it begins; a typing that takes no time shows every letter there
const AS_IT_BEGINS = 0;
// The keyboard a film's keys are heard on where it names none: the one chosen by ear, recorded in a studio key by key
const LIVEREELS_KEYBOARD: KeyboardSound = 'membrane';
const LIVEREELS_OWN: SoundSource = { kind: 'livereel' };
const NOTHING_IN_PLACE: SourceInPlace = { kind: 'off' };
const KEY_AND_KEYBOARD =
	'the film gives its keys a file or turns them off, and names a keyboard: it does one or the other';

/** livereel's sounds as a film that keeps them writes them: where each one comes from. */
export function livereelSoundsOf(written: Exclude<LivereelSoundsScript, TurnedOff>): LivereelSounds {
	return { click: sourceOf(written.click), key: keyOf(written), ending: sourceOf(written.ending) };
}

/** One of livereel's sounds: what the film writes in its place where it names one, livereel's own otherwise. */
function sourceOf(written: SoundInPlace | undefined): SoundSource {
	return written === undefined ? LIVEREELS_OWN : inPlaceOf(written);
}

/** What a film writes in place of one of livereel's sounds: its file, or nothing. */
function inPlaceOf(written: SoundInPlace): SourceInPlace {
	return typeof written === 'string' ? { kind: 'file', path: written } : NOTHING_IN_PLACE;
}

/**
 * livereel's key: what the film writes in its place, or one of livereel's keyboards, its own where the film names
 * none. It is read as a film may hand it, as a film runs without its types checked: a file or nothing beside a
 * keyboard, or a keyboard livereel has not, is refused.
 */
function keyOf(written: KeyAsHanded): KeySource {
	if (written.key !== undefined && written.keyboard !== undefined) throw new FilmError(KEY_AND_KEYBOARD);
	if (written.key !== undefined) return inPlaceOf(written.key);
	const keyboard = written.keyboard ?? LIVEREELS_KEYBOARD;
	if (!isKeyboardSound(keyboard)) {
		throw new FilmError(`the film's keyboard is ${keyboard}: livereel's are ${KEYBOARD_SOUNDS.join(', ')}`);
	}
	return { kind: 'keyboard', keyboard };
}

function isKeyboardSound(name: string): name is KeyboardSound {
	return KEYBOARD_SOUNDS.some((keyboard) => keyboard === name);
}

/** The sound a move makes: the file the film gives for it, or livereel's. */
export function soundOf(script: SoundScript, livereels: LivereelSound): Sound {
	return script.sound === undefined ? livereelSound(livereels) : fileSound(script.sound);
}

export function livereelSound(name: LivereelSound): Sound {
	return { kind: 'livereel', name };
}

export function fileSound(path: string): Sound {
	return { kind: 'file', path };
}

/** A sound heard as its move begins. */
export function heardAsItBegins(sound: Sound): Cue {
	return { at: AS_IT_BEGINS, sound };
}

/** A key heard for every stroke, at its share of the typing: where a letter comes, or one is rubbed out. */
export function keysHeard(strokes: readonly Keystroke[]): readonly Cue[] {
	const seconds = typingSeconds(strokes);
	return strokes.map((stroke) => ({
		at: seconds === 0 ? AS_IT_BEGINS : stroke.at / seconds,
		sound: livereelSound('key')
	}));
}
