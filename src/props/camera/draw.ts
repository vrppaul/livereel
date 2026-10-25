/** The camera on the stage: the screen moved, tilted and turned so the point looked at stands at the frame's middle. */
import type { Pose } from '#domain/camera';
import type { Drawer } from '#stage/drawer';
import './camera.css';

export class CameraDrawer implements Drawer<Pose> {
	readonly root: HTMLElement;

	constructor(root: HTMLElement) {
		this.root = root;
	}

	draw(pose: Pose): void {
		this.root.style.transform =
			`translate(calc(var(--frame-width) / 2), calc(var(--frame-height) / 2)) ` +
			`rotateX(${pose.tilt}deg) rotateY(${pose.turn}deg) scale(${pose.zoom}) ` +
			`translate(${-pose.focusX}px, ${-pose.focusY}px)`;
	}
}
