"""A move: one part of the scene changing over a step of the film, or over a share of the step.

A move reads where it starts from once, as its step begins, then is told on
every frame how far along it is, already eased. It sets its part of the
scene from that alone, so a frame is the same whenever it is shot.
"""

from abc import ABC, abstractmethod

from pydantic import BaseModel, ConfigDict

from livereel.easing import Ease
from livereel.film import Film


class NotBegunError(RuntimeError):
    """A move asked where it stands before its step began it."""


class Share(BaseModel):
    """The part of its step a move takes: from `start` to `end`, each a share of the step, from 0 to 1."""

    model_config = ConfigDict(frozen=True)

    start: float = 0.0
    end: float = 1.0

    def of(self, progress: float) -> float:
        """How far along the move is when its step is `progress` along: none before its start, all after its end."""
        return min(1.0, max(0.0, (progress - self.start) / (self.end - self.start)))


WHOLE_STEP = Share()


class Move(BaseModel, ABC):
    """A part of the scene that changes; `ease` is its own curve, where it does not take its step's."""

    ease: Ease | None = None
    within: Share = WHOLE_STEP

    @abstractmethod
    async def begin(self, film: Film) -> None:
        """Read where it starts from, once, as its step begins."""

    @abstractmethod
    async def at(self, film: Film, progress: float) -> None:
        """Set its part of the scene, `progress` of the way along, eased."""


def begun[Value](value: Value | None) -> Value:
    """What a move read as it began; a move played without its step beginning it is a fault in the film."""
    if value is None:
        raise NotBegunError
    return value
