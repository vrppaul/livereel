/**
 * How a camera frames the page in its view: a point or a box of the screen in the view's own pixels, as far from the
 * view's middle as the camera's zoom takes it from its focus, before the view's stance carries it anywhere. Apart from
 * the camera's module, as where the view stands (`src/domain/placement.ts`) reads the page in it so, and the camera
 * reads where the view stands to keep what it frames framed there.
 */
import type { Camera, Pose } from './camera.ts';
import { type Box, HALVES, type Point, type Size, boxBetween, frameScaleOf } from './geometry.ts';

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
