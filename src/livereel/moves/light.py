"""The light: one block of the page lit, the rest dimmed; carried from block to block; put out."""

import math
from typing import override

from pydantic import PrivateAttr

from livereel.film import Film
from livereel.geometry import Box
from livereel.moves.move import Move, begun
from livereel.scene import LIGHT_DIM, Light

# How far the light dims halfway from one block to another, so the page between them never shows bright
DIP = 0.7


class LightOn(Move):
    """A block of the page lit as the step goes on, the rest dimmed by `dim`."""

    target: str
    dim: float = LIGHT_DIM

    @override
    async def begin(self, film: Film) -> None:
        film.scene.light = Light(box=await film.box(self.target), dim=self.dim)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(film.scene.light).strength = progress


class LightTo(Move):
    """The light carried from the block it is on to another."""

    target: str
    _start: Box | None = PrivateAttr(default=None)
    _end: Box | None = PrivateAttr(default=None)

    @override
    async def begin(self, film: Film) -> None:
        self._start = begun(film.scene.light).box
        self._end = await film.box(self.target)

    @override
    async def at(self, film: Film, progress: float) -> None:
        light = begun(film.scene.light)
        light.box = begun(self._start).toward(begun(self._end), progress)
        light.strength = 1 - DIP * math.sin(math.pi * progress)


class LightOff(Move):
    @override
    async def begin(self, film: Film) -> None:
        begun(film.scene.light)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(film.scene.light).strength = 1 - progress
        if progress >= 1:
            film.scene.light = None
