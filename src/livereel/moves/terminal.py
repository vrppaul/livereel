"""An agent's terminal drawn on the stage: a person typing into it, the agent at work, and the terminal giving way."""

import math
from collections.abc import Sequence
from typing import override

from pydantic import PrivateAttr

from livereel.easing import Ease, linear
from livereel.film import Film
from livereel.keys import Keystroke, typed_by, typing_seconds
from livereel.moves.move import Move, begun
from livereel.scene import LineKind, Scene, TerminalLine

# Of the agent's work, the share it only thinks before its first line
THINKING_SHARE = 0.22


class TypeInTerminal(Move):
    """A person typing into the terminal, key by key as `strokes` has it."""

    strokes: Sequence[Keystroke]
    ease: Ease | None = linear

    @override
    async def begin(self, film: Film) -> None:
        begun(film.scene.terminal)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(film.scene.terminal).typed = typed_by(self.strokes, progress * typing_seconds(self.strokes))


class AgentWorks(Move):
    """The agent at work: its spinner under the lines it writes, one after another, gone once it is done."""

    lines: Sequence[TerminalLine]
    thinking: TerminalLine
    thinking_share: float = THINKING_SHARE
    ease: Ease | None = linear
    _before: list[TerminalLine] = PrivateAttr(default_factory=list)

    @override
    async def begin(self, film: Film) -> None:
        self._before = list(begun(film.scene.terminal).lines)

    @override
    async def at(self, film: Film, progress: float) -> None:
        written = max(0.0, (progress - self.thinking_share) / (1 - self.thinking_share))
        shown = list(self.lines[: math.floor(written * len(self.lines))])
        working = [self.thinking] if progress < 1 else []
        begun(film.scene.terminal).lines = [*self._before, *shown, *working]


class TerminalLeaves(Move):
    @override
    async def begin(self, film: Film) -> None:
        begun(film.scene.terminal)

    @override
    async def at(self, film: Film, progress: float) -> None:
        begun(film.scene.terminal).leaving = progress
        if progress >= 1:
            film.scene.terminal = None


def submit(scene: Scene) -> None:
    """Enter: what the person typed goes up into the log, and the line is empty again."""
    terminal = begun(scene.terminal)
    terminal.lines = [*terminal.lines, TerminalLine(kind=LineKind.ASKED, text=terminal.typed)]
    terminal.typed = ""
