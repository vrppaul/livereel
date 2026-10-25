"""The steps a film is a list of: so many seconds of frames, a cut, or something done to the page between frames.

A film reads as a script: `Play` for what moves, `Cut` for what changes at
once, `Act` for what the page really does — a click, a reply from its
server — which takes no time in the film however long it takes the browser.
"""

from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable, Sequence
from typing import override

from pydantic import BaseModel

from livereel.easing import Ease, ease_in_out_sine, ease_out_cubic, linear
from livereel.film import FPS, Film
from livereel.keys import typing_seconds
from livereel.moves.move import Move
from livereel.moves.page import TypeIntoPage
from livereel.moves.pointer import Press
from livereel.moves.terminal import TypeInTerminal
from livereel.scene import Scene

# A beat after the last key, before the next step
AFTER_TYPING_SECONDS = 0.12
# How long a press goes in, and how long it takes to let go
PRESS_SECONDS = 0.09
RELEASE_SECONDS = 0.12


class Step(BaseModel, ABC):
    @abstractmethod
    async def run(self, film: Film) -> None: ...


class Play(Step):
    """So many seconds of frames, every move eased along them, each over its own share of the step."""

    seconds: float
    moves: Sequence[Move] = ()
    ease: Ease = ease_in_out_sine

    @override
    async def run(self, film: Film) -> None:
        for move in self.moves:
            await move.begin(film)
        frames = max(1, round(self.seconds * FPS))
        # A move is played from the start of its share of the step to its end, and its end once
        playing = list(self.moves)
        for index in range(1, frames + 1):
            if film.finished:
                return
            progress = index / frames
            for move in [move for move in playing if progress >= move.within.start]:
                ease = move.ease or self.ease
                await move.at(film, ease(move.within.of(progress)))
                if progress >= move.within.end:
                    playing.remove(move)
            await film.frame()


class Cut(Step):
    """The scene changed at once, between two frames."""

    change: Callable[[Scene], None]

    @override
    async def run(self, film: Film) -> None:
        self.change(film.scene)


class Act(Step):
    """Something done to the page between two frames, to the page as it stands, the camera put aside."""

    action: Callable[[Film], Awaitable[None]]

    @override
    async def run(self, film: Film) -> None:
        if film.finished:
            return
        async with film.page_as_it_stands():
            await self.action(film)


def hold(seconds: float) -> Play:
    """So many seconds of frames with nothing moving."""
    return Play(seconds=seconds)


def typing(move: TypeInTerminal | TypeIntoPage) -> list[Step]:
    """As long as the person takes to type, and a beat after the last key."""
    return [Play(seconds=typing_seconds(move.strokes), moves=[move], ease=linear), hold(AFTER_TYPING_SECONDS)]


def click(action: Callable[[Film], Awaitable[None]]) -> list[Step]:
    """The cursor pressed in, the page clicked as `action` does it, and the cursor let go."""
    return [
        Play(seconds=PRESS_SECONDS, moves=[Press(down=True)], ease=ease_out_cubic),
        Act(action=action),
        Play(seconds=RELEASE_SECONDS, moves=[Press(down=False)], ease=ease_out_cubic),
    ]


async def shoot(film: Film, steps: Sequence[Step]) -> None:
    """Every step in turn, until the steps or the footage run out."""
    for step in steps:
        if film.finished:
            return
        await step.run(film)
