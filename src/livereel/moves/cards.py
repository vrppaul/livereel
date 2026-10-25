"""What stands over the whole frame: the screen coming up out of the ground, and the ending card."""

from typing import override

from livereel.film import Film
from livereel.moves.move import Move, begun
from livereel.scene import Ending


class ScreenIn(Move):
    @override
    async def begin(self, film: Film) -> None:
        return None

    @override
    async def at(self, film: Film, progress: float) -> None:
        film.scene.screen_shown = progress


class EndingIn(Move):
    ending: Ending

    @override
    async def begin(self, film: Film) -> None:
        film.scene.ending = Ending(name=self.ending.name, line=self.ending.line, command=self.ending.command)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(film.scene.ending).shown = progress
