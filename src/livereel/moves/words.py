"""Captions: words that come up one after another, and go."""

from typing import override

from pydantic import PrivateAttr

from livereel.easing import Ease, linear
from livereel.film import Film
from livereel.moves.move import Move, begun
from livereel.scene import Caption


class CaptionIn(Move):
    """A caption coming up word by word; one still on screen gives way as this one begins to show."""

    text: str
    ease: Ease | None = linear

    @override
    async def begin(self, film: Film) -> None:
        return None

    @override
    async def at(self, film: Film, progress: float) -> None:
        caption = film.scene.caption
        if caption is None or caption.text != self.text:
            caption = Caption(text=self.text)
            film.scene.caption = caption
        caption.shown = progress


class CaptionOut(Move):
    """The caption on screen as the step begins, going; one that comes up after it in the same step stays."""

    _leaving: Caption | None = PrivateAttr(default=None)

    @override
    async def begin(self, film: Film) -> None:
        self._leaving = begun(film.scene.caption)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(self._leaving).gone = progress
