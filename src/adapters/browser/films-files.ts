/**
 * The film's own files, from the disk to the stage: its pictures (`picture.show`) and its fonts (`defineFilm`'s
 * `fonts`), each read from the film's folder by the path the film names it by and handed to the stage in base64, as the
 * page's pictures are (`show` in `stage/stage.js`), which holds it decoded. A picture's size as it decoded is handed
 * back to the take, so a picture stands as wide against as tall as its file does whatever kind of image it is; a font
 * joins the stage's fonts under the family it sets, so the look names it as it names one the machine has. A file that
 * is not there, a picture that decodes to no picture with a size, or a font read as none, is refused as the film's
 * before the first frame. One road for flat and the room alike: the stage holds each where any page it is opened on
 * reads it. A picture's pixels across are handed in the frame's, at the take's sharpness, which only the browser's
 * part of livereel knows, so the room draws a picture standing in the world no denser than its file.
 */
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import type { Page } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import type { FilmFont } from '../../direction/theme.ts';
import type { PictureDecoded } from '../../domain/picture.ts';
import {
	type FilmsFontHanded,
	type FilmsPictureDecoded,
	type FilmsPictureHanded,
	fontsLaid,
	picturesLaid
} from './stage.ts';

/** What a file of the film's is, as a refusal names it. */
type FilesKind = 'picture' | 'font';

// How a file's bytes are handed: in base64; a picture in an SVG file, told by its name's ending in any case, typed as
// one, which the browser draws no SVG without; any other kind of image untyped, the browser telling it by its bytes
const BASE64 = 'base64';
const SVG = '.svg';
const SVG_TYPE = 'image/svg+xml';
const TOLD_BY_ITS_BYTES = '';
// A picture that decodes to no size across or down; and how many of the frame's pixels across an SVG holds, drawn anew
// of its lines at any size
const NO_SIZE = 0;
const DRAWN_ANEW_AT_ANY_SIZE = Infinity;

/**
 * The film's own pictures read from the film's folder, by the paths the film names them by; refused where one is not
 * there.
 */
export async function filmsPicturesRead(
	filmFolder: string,
	paths: readonly string[]
): Promise<readonly FilmsPictureHanded[]> {
	return Promise.all(paths.map((path) => pictureRead(filmFolder, path)));
}

/**
 * The film's own pictures laid on the stage, each by its path and as it decoded at the take's sharpness
 * (`pictureDecodedOf`); refused where one decodes to no picture with a size.
 */
export async function filmsPicturesLaid(
	stage: Page,
	pictures: readonly FilmsPictureHanded[],
	sharpness: number
): Promise<ReadonlyMap<string, PictureDecoded>> {
	const decoded = await stage.evaluate(picturesLaid, pictures);
	return new Map(decoded.map((picture) => [picture.path, pictureDecodedOf(picture, sharpness)]));
}

/**
 * A picture of the film's as the stage decoded it, at a sharpness, so many of the stage's pixels to a frame's: as wide
 * against as tall as it decoded, and holding its pixels across, so many to a frame's pixel; endless for an SVG, which
 * the browser draws anew of its lines at any size. Refused where it decoded to no size, as no file of a picture the
 * browser draws does.
 */
export function pictureDecodedOf(picture: FilmsPictureDecoded, sharpness: number): PictureDecoded {
	if (picture.width === NO_SIZE || picture.height === NO_SIZE) {
		throw new FilmError(
			`the film's picture ${picture.path} decodes to no picture with a size: give a PNG, JPEG, WebP, AVIF or GIF file, or an SVG that names its width and height`
		);
	}
	const sharpAcross = isAnSvg(picture.path) ? DRAWN_ANEW_AT_ANY_SIZE : picture.width / sharpness;
	return { aspect: picture.width / picture.height, sharpAcross };
}

/** The film's own fonts read from the film's folder, each with the family it sets; refused where one is not there. */
export async function filmsFontsRead(
	filmFolder: string,
	fonts: readonly FilmFont[]
): Promise<readonly FilmsFontHanded[]> {
	return Promise.all(fonts.map((font) => fontRead(filmFolder, font)));
}

/** The film's own fonts joining the stage's, each under the family it sets; refused where one is read as no font. */
export async function filmsFontsLaid(stage: Page, fonts: readonly FilmsFontHanded[]): Promise<void> {
	const [unread] = await stage.evaluate(fontsLaid, fonts);
	if (unread !== undefined) {
		throw new FilmError(`the film's font ${unread} is read as no font: give a TrueType, OpenType or WOFF file`);
	}
}

async function pictureRead(filmFolder: string, path: string): Promise<FilmsPictureHanded> {
	const base64 = await fileRead(filmFolder, path, 'picture');
	return { path, base64, type: isAnSvg(path) ? SVG_TYPE : TOLD_BY_ITS_BYTES };
}

/** Whether a picture's file is an SVG, by its name's ending, written in capitals or not: `MARK.SVG` is one. */
function isAnSvg(path: string): boolean {
	return extname(path).toLowerCase() === SVG;
}

async function fontRead(filmFolder: string, font: FilmFont): Promise<FilmsFontHanded> {
	return { family: font.family, path: font.file, base64: await fileRead(filmFolder, font.file, 'font') };
}

/**
 * A file of the film's in base64, by its path from the film's folder; refused as the film's where it cannot be read.
 */
async function fileRead(filmFolder: string, path: string, kind: FilesKind): Promise<string> {
	try {
		return (await readFile(resolve(filmFolder, path))).toString(BASE64);
	} catch (fault) {
		throw new FilmError(`the film's ${kind} ${path} could not be read: ${String(fault)}`);
	}
}
