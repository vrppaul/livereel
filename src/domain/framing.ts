/**
 * How a camera frames the page in its view: a point or a box of the screen in the view's own pixels, as far from the
 * view's middle as the camera's zoom takes it from its focus, before the view's stance carries it anywhere. Apart from
 * the camera's module, as where the view stands (`src/domain/placement.ts`) reads the page in it so, and the camera
 * reads where the view stands to keep what it frames framed there.
 *
 * And how a page lies on the screen where it lies elsewhere than over the whole screen: a page the screen fades from,
 * laid over the page coming where one pose framed it as another frames the page coming, and the part of a page the
 * film's scrolls have carried up the screen. A camera frames such a page as it frames the screen, by a pose of its
 * own, so what stands on it is framed by the arithmetic above.
 */
import type { Camera, Pose } from './camera.ts';
import { type Box, HALVES, type Point, type Size, UNMOVED, boxBetween, frameScaleOf } from './geometry.ts';

/**
 * How a page lies on the screen: where its top left corner stands, in the screen's pixels, and how many of those a
 * pixel of the page takes.
 */
export interface Lying {
	readonly corner: Point;
	readonly scale: number;
}

/** A page lying over the whole screen, as the screen shows it. */
export const OVER_THE_SCREEN: Lying = { corner: UNMOVED, scale: 1 };

/** The frame's own pixels a page's pixel takes in a pose, on a frame of this size. */
export function frameZoomOf(pose: Pose, frame: Size): number {
	return pose.zoom * frameScaleOf(frame);
}

/**
 * Where a point of the screen stands in a camera's view as the camera frames the page, before the view's stance carries
 * it: in the view's pixels from its top left corner, as far from the view's middle as the camera's zoom takes it from
 * its focus.
 */
export function pointInTheView(camera: Camera, frame: Size, point: Point): Point {
	const pose = camera.pose;
	const frameZoom = frameZoomOf(pose, frame);
	const view = camera.view.box;
	return {
		left: view.width / HALVES + frameZoom * (point.left - pose.focusX),
		top: view.height / HALVES + frameZoom * (point.top - pose.focusY)
	};
}

/**
 * Where a box of the screen stands in a camera's view as the camera frames the page, before the view's stance carries
 * it: in the view's pixels from its top left corner.
 */
export function boxInTheView(camera: Camera, frame: Size, box: Box): Box {
	return boxBetween(
		pointInTheView(camera, frame, { left: box.left, top: box.top }),
		pointInTheView(camera, frame, { left: box.left + box.width, top: box.top + box.height })
	);
}

/**
 * How the page one pose frames lies on the screen another pose frames, both in one view: the point the first looks at
 * where the second looks, larger by as many times as the first comes closer. The stage draws the screen by a pose
 * (`.camera` in `stage/stage.css`), so a page laid there so stands on the frame as the first pose would draw it.
 */
export function lyingFramedBy(framing: Pose, framedNow: Pose): Lying {
	const closer = framing.zoom / framedNow.zoom;
	return {
		corner: { left: framedNow.focusX - framing.focusX * closer, top: framedNow.focusY - framing.focusY * closer },
		scale: closer
	};
}

/** Where a point of a page stands on the screen, in its pixels, the page lying there so. */
export function pointWhereItLies(lying: Lying, point: Point): Point {
	return { left: lying.corner.left + point.left * lying.scale, top: lying.corner.top + point.top * lying.scale };
}

/**
 * How a page lies on the screen where it lies on another page as `inner` says and that page on the screen as `outer`
 * says: as the part of a page a ride's scrolls carry up lies on its page, which a fade laid elsewhere.
 */
export function lyingWithin(outer: Lying, inner: Lying): Lying {
	return { corner: pointWhereItLies(outer, inner.corner), scale: outer.scale * inner.scale };
}

/** Where a box of a page stands on the screen, in its pixels, the page lying there so. */
export function whereItLies(lying: Lying, box: Box): Box {
	return { ...pointWhereItLies(lying, box), width: box.width * lying.scale, height: box.height * lying.scale };
}

/**
 * The pose that frames a page lying on the screen so as a pose frames the screen: `lyingFramedBy` undone, so a box of
 * the page stands in the view where the box of the screen it lies over stands.
 */
export function framingWhereItLies(pose: Pose, lying: Lying): Pose {
	return {
		focusX: (pose.focusX - lying.corner.left) / lying.scale,
		focusY: (pose.focusY - lying.corner.top) / lying.scale,
		zoom: pose.zoom * lying.scale
	};
}

/**
 * The box of the screen a box of a camera's view shows as the camera frames the page, before the view's stance carries
 * it: `boxInTheView` undone, in the screen's pixels.
 */
export function boxOfTheScreenIn(camera: Camera, frame: Size, box: Box): Box {
	const pose = camera.pose;
	const frameZoom = frameZoomOf(pose, frame);
	const view = camera.view.box;
	return {
		left: pose.focusX + (box.left - view.width / HALVES) / frameZoom,
		top: pose.focusY + (box.top - view.height / HALVES) / frameZoom,
		width: box.width / frameZoom,
		height: box.height / frameZoom
	};
}
