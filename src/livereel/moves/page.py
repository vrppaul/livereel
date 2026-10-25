"""What is done to the page itself between frames: its own scroll, and keys a person types into it."""

from collections.abc import Sequence
from typing import override

from pydantic import BaseModel, ConfigDict, PrivateAttr

from livereel.easing import Ease, between, linear
from livereel.film import Film
from livereel.keys import Keystroke, typed_by, typing_seconds
from livereel.moves.move import Move, begun

SCROLL_TO = "(block, top) => { block.scrollTop = top; }"
SCROLL_OF = "block => block.scrollTop"
# Finds the block that scrolls a target and keeps it for the frames to come; says where its scroll starts,
# and where it ends with the target's top `top` pixels below the block's own
FIND_SCROLLER = """(target, top) => {
    let scroller = target.parentElement;
    while (scroller) {
        const overflow = getComputedStyle(scroller).overflowY;
        if (scroller.scrollHeight > scroller.clientHeight && (overflow === 'auto' || overflow === 'scroll')) break;
        scroller = scroller.parentElement;
    }
    scroller = scroller || document.scrollingElement;
    window.livereelScroller = scroller;
    const below = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    const furthest = scroller.scrollHeight - scroller.clientHeight;
    return {start: scroller.scrollTop, end: Math.max(0, Math.min(scroller.scrollTop + below - top, furthest))};
}"""
SCROLL_THE_SCROLLER = "top => { window.livereelScroller.scrollTop = top; }"
BACKSPACE = "Backspace"


class ScrollCourse(BaseModel):
    """Where a scroll starts and where it ends, as the page reads them."""

    model_config = ConfigDict(frozen=True)

    start: float
    end: float


class ScrollBy(Move):
    """A block of the page that scrolls, moved `pixels` down its scroll (up, below none)."""

    target: str
    pixels: float
    _start: float | None = PrivateAttr(default=None)

    @override
    async def begin(self, film: Film) -> None:
        self._start = await film.app.locator(self.target).first.evaluate(SCROLL_OF)

    @override
    async def at(self, film: Film, progress: float) -> None:
        top = begun(self._start) + self.pixels * progress
        await film.app.locator(self.target).first.evaluate(SCROLL_TO, top)


class ScrollTo(Move):
    """The page scrolled until a block of it stands `top` pixels below the top of what scrolls it."""

    target: str
    top: float
    _start: float | None = PrivateAttr(default=None)
    _end: float | None = PrivateAttr(default=None)

    @override
    async def begin(self, film: Film) -> None:
        found = await film.app.locator(self.target).first.evaluate(FIND_SCROLLER, self.top)
        course = ScrollCourse.model_validate(found)
        self._start, self._end = course.start, course.end

    @override
    async def at(self, film: Film, progress: float) -> None:
        await film.app.evaluate(SCROLL_THE_SCROLLER, between(begun(self._start), begun(self._end), progress))


class TypeIntoPage(Move):
    """A person typing into whatever holds the page's keyboard: real keys, at the times `strokes` has them."""

    strokes: Sequence[Keystroke]
    ease: Ease | None = linear
    _standing: str = PrivateAttr(default="")

    @override
    async def begin(self, film: Film) -> None:
        self._standing = ""

    @override
    async def at(self, film: Film, progress: float) -> None:
        wanted = typed_by(self.strokes, progress * typing_seconds(self.strokes))
        kept = _shared_start(wanted, self._standing)
        for _ in range(len(self._standing) - kept):
            await film.stage.keyboard.press(BACKSPACE)
        if wanted[kept:]:
            await film.stage.keyboard.type(wanted[kept:])
        self._standing = wanted


def _shared_start(first: str, second: str) -> int:
    """How many letters two texts share from their start."""
    shared = 0
    while shared < min(len(first), len(second)) and first[shared] == second[shared]:
        shared += 1
    return shared
