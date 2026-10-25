"""The camera: to a pose, or onto a block of the page, at the angle it stands at or another."""

from typing import override

from pydantic import PrivateAttr

from livereel.film import Film
from livereel.framing import covering, onto
from livereel.moves.move import Move, begun
from livereel.scene import Pose

# How much of the page shows round a block the camera frames, and how close it may come
AIR = 80.0
ZOOM_AT_MOST = 2.2


class Camera(Move):
    """The camera to a pose, or onto the blocks `onto` matches (the first `every` of them) with `air` round them.

    `tilt` and `turn` set an angle of its own; a face-on camera never shows the screen's edge.
    """

    to: Pose | None = None
    onto: str | None = None
    every: int = 1
    air: float = AIR
    zoom_at_most: float = ZOOM_AT_MOST
    tilt: float | None = None
    turn: float | None = None
    _start: Pose | None = PrivateAttr(default=None)
    _end: Pose | None = PrivateAttr(default=None)

    @override
    async def begin(self, film: Film) -> None:
        self._start = film.scene.pose
        end = self.to or self._start
        if self.onto is not None:
            box = await film.box(self.onto, self.every)
            end = onto(box, around=end, frame=film.film_format.frame, air=self.air, zoom_at_most=self.zoom_at_most)
        end = end.angled(end.tilt if self.tilt is None else self.tilt, end.turn if self.turn is None else self.turn)
        if end.face_on:
            end = covering(end, film.film_format)
        self._end = end

    @override
    async def at(self, film: Film, progress: float) -> None:
        film.scene.pose = begun(self._start).toward(begun(self._end), progress)
