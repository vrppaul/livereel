/**
 * The film's own pictures (`picture.show`), from the disk to the stage: each file read from the film's folder by the
 * path the film names it by, handed to the stage in base64 as the page's pictures are (`show` in `stage/stage.js`),
 * which holds it decoded, and the size it decoded at handed back to the take, so a picture stands as wide against as
 * tall as its file does whatever kind of image it is. A file that is not there, or that decodes to no picture with a
 * size, is refused as the film's before the first frame. One road for flat and the room alike: the stage holds the
 * picture at an address of its own, which any page it is opened on reads.
 */
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import type { Page } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import type { Size } from '../../domain/geometry.ts';
import { type FilmsPictureDecoded, type FilmsPictureHanded, picturesLaid } from './stage.ts';

// How a picture's bytes are handed: in base64; an SVG file typed as one, which the browser draws no SVG without; any
// other kind of image untyped, the browser telling it by its bytes
const BASE64 = 'base64';
const SVG = '.svg';
const SVG_TYPE = 'image/svg+xml';
const TOLD_BY_ITS_BYTES = '';
// A picture that decodes to no size across or down
const NO_SIZE = 0;

/** The film's own pictures read from the film's folder, by the paths the film names them by; refused where one is not there. */
export async function filmsPicturesRead(
	filmFolder: string,
	paths: readonly string[]
): Promise<readonly FilmsPictureHanded[]> {
	return Promise.all(paths.map((path) => pictureRead(filmFolder, path)));
}

/**
 * The film's own pictures laid on the stage, each by its path and the size it decoded at; refused where one decodes to
 * no picture with a size.
 */
export async function filmsPicturesLaid(
	stage: Page,
	pictures: readonly FilmsPictureHanded[]
): Promise<ReadonlyMap<string, Size>> {
	const decoded = await stage.evaluate(picturesLaid, pictures);
	return new Map(decoded.map((picture) => [picture.path, sizeOf(picture)]));
}

async function pictureRead(filmFolder: string, path: string): Promise<FilmsPictureHanded> {
	try {
		const bytes = await readFile(resolve(filmFolder, path));
		return { path, base64: bytes.toString(BASE64), type: extname(path) === SVG ? SVG_TYPE : TOLD_BY_ITS_BYTES };
	} catch (fault) {
		throw new FilmError(`the film's picture ${path} could not be read: ${String(fault)}`);
	}
}

/** The size a picture decoded at; refused where it decoded to none, as no file of a picture the browser draws does. */
function sizeOf(picture: FilmsPictureDecoded): Size {
	if (picture.width === NO_SIZE || picture.height === NO_SIZE) {
		throw new FilmError(
			`the film's picture ${picture.path} decodes to no picture with a size: give a PNG, JPEG, WebP, AVIF or GIF file, or an SVG that names its width and height`
		);
	}
	return { width: picture.width, height: picture.height };
}
