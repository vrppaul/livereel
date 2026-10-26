/**
 * The sounds a film makes: livereel's, which a film may give files in place of or go without, files of the film's,
 * and music under it all.
 *
 * A move notes the sounds it makes as cues, each at a point of its way; the take hears a cue on the frame the move is
 * set at or past that point, eased, so a key is heard on the frame its letter shows. A film keeps its own time, so a
 * sound heard is laid at its frame's moment however long the browser took. A sound made in a cut is heard on the
 * frame after it, so one made in a cut that ends the film comes at its end and is not heard: the track is as long as
 * the film. A path is from the film's file.
 */
import { type Keystroke, typingSeconds } from '../domain/typing.ts';

/** livereel's sounds: the cursor pressed in, a key typed, the ending coming up. */
export type LivereelSound = 'click' | 'key' | 'ending';

/** A sound: one of livereel's, or a file of the film's. */
export type Sound =
	{ readonly kind: 'livereel'; readonly name: LivereelSound } | { readonly kind: 'file'; readonly path: string };

/** A sound a move makes once it is `at` that far along its way, from 0 to 1. */
export interface Cue {
	readonly at: number;
	readonly sound: Sound;
}

/** Files a film gives in place of livereel's sounds, those it gives; the rest stay livereel's. */
export type SoundFiles = Partial<Readonly<Record<LivereelSound, string>>>;

/** livereel's sounds as a film writes them: `{ enabled: false }` for none, or files in place of those it gives. */
export type LivereelSoundsScript = { readonly enabled: false } | ({ readonly enabled?: true } & SoundFiles);

/** A track under the whole film, at `volume` (1 as it is), cut to the film's length and faded out at its end. */
export interface Music {
	readonly file: string;
	readonly volume: number;
}

/** What a film says of its sounds: livereel's, some in files of its own or none at all, and its music. */
export interface FilmSound {
	readonly livereels: SoundFiles | null;
	readonly music: Music | null;
}

/** A move's sound, written as the film writes it: the film's file where it gives one, livereel's otherwise. */
export interface SoundScript {
	readonly sound?: string;
}

// Where on its way a move makes a sound it makes as it begins; a typing that takes no time shows every letter there
const AS_IT_BEGINS = 0;

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
