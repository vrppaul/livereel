"""The cursor: along a slight arc to a block of the page, as a hand moves it, and pressed in and let go."""

from typing import override

from pydantic import PrivateAttr

from livereel.film import Film
from livereel.geometry import Arc, Point
from livereel.moves.move import Move, begun
from livereel.scene import Cursor

# How far the arc bends off the straight line, as a share of its length
BOW = 0.14
# Where on a block the cursor comes to rest: a little into it from the left, at most so far, and just under its middle
REST_ACROSS = 0.55
REST_ACROSS_AT_MOST = 60.0
REST_DOWN = 0.6
# Where a cursor not yet on the screen comes in from, below and to the right of where it goes
ENTERS_FROM_RIGHT = 260.0
ENTERS_FROM_BELOW = 220.0


class CursorTo(Move):
    """The cursor to a block of the page, from where it is, or from `entering` where it is not yet on the screen."""

    target: str
    entering: Point | None = None
    bow: float = BOW
    _arc: Arc | None = PrivateAttr(default=None)

    @override
    async def begin(self, film: Film) -> None:
        box = await film.box(self.target)
        resting = min(box.width * REST_ACROSS, REST_ACROSS_AT_MOST)
        end = Point(left=box.left + resting, top=box.top + box.height * REST_DOWN)
        cursor = film.scene.cursor
        if cursor is not None:
            start = Point(left=cursor.left, top=cursor.top)
        else:
            start = self.entering or Point(left=end.left + ENTERS_FROM_RIGHT, top=end.top + ENTERS_FROM_BELOW)
        self._arc = Arc.bowed(start, end, self.bow)

    @override
    async def at(self, film: Film, progress: float) -> None:
        point = begun(self._arc).at(progress)
        film.scene.cursor = Cursor(left=point.left, top=point.top)


class Press(Move):
    """The cursor pressed in, or with `down` false, let go."""

    down: bool = True

    @override
    async def begin(self, film: Film) -> None:
        begun(film.scene.cursor)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(film.scene.cursor).press = progress if self.down else 1 - progress
