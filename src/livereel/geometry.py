"""Sizes and boxes, in the page's own CSS pixels.

The frame is what the film is shot at, the screen what the page is laid out
on; a box is where a block of the page stands on that screen, with no camera
applied. Every other measure in a film is read off these.
"""

from collections.abc import Sequence

from pydantic import BaseModel, ConfigDict

from livereel.easing import between


class Size(BaseModel):
    """How wide and how tall."""

    model_config = ConfigDict(frozen=True)

    width: int
    height: int


class Format(BaseModel):
    """What a film is shot at, its frame, and what its page is laid out on, its screen."""

    model_config = ConfigDict(frozen=True)

    frame: Size
    screen: Size


class Point(BaseModel):
    """A point of the screen: how far from its left edge, and how far down from its top."""

    model_config = ConfigDict(frozen=True)

    left: float
    top: float


class Arc(BaseModel):
    """A curve from a start to an end, drawn toward its bend: a quadratic Bézier."""

    model_config = ConfigDict(frozen=True)

    start: Point
    bend: Point
    end: Point

    @classmethod
    def bowed(cls, start: Point, end: Point, bow: float) -> Arc:
        """The arc from start to end that bends to one side by `bow` of its length."""
        middle = Point(left=(start.left + end.left) / 2, top=(start.top + end.top) / 2)
        across, down = end.left - start.left, end.top - start.top
        return cls(start=start, bend=Point(left=middle.left - down * bow, top=middle.top + across * bow), end=end)

    def at(self, progress: float) -> Point:
        rest = 1 - progress
        return Point(
            left=rest**2 * self.start.left + 2 * rest * progress * self.bend.left + progress**2 * self.end.left,
            top=rest**2 * self.start.top + 2 * rest * progress * self.bend.top + progress**2 * self.end.top,
        )


class Box(BaseModel):
    """Where a block of the page stands on the screen: its left and top edges, and how big it is."""

    model_config = ConfigDict(frozen=True)

    left: float
    top: float
    width: float
    height: float

    @property
    def middle_x(self) -> float:
        return self.left + self.width / 2

    @property
    def middle_y(self) -> float:
        return self.top + self.height / 2

    @classmethod
    def around(cls, boxes: Sequence[Box]) -> Box:
        """The smallest box that holds every one of these."""
        left = min(box.left for box in boxes)
        top = min(box.top for box in boxes)
        right = max(box.left + box.width for box in boxes)
        bottom = max(box.top + box.height for box in boxes)
        return cls(left=left, top=top, width=right - left, height=bottom - top)

    def toward(self, other: Box, progress: float) -> Box:
        """This box moved and resized `progress` of the way to the other."""
        return Box(
            left=between(self.left, other.left, progress),
            top=between(self.top, other.top, progress),
            width=between(self.width, other.width, progress),
            height=between(self.height, other.height, progress),
        )
