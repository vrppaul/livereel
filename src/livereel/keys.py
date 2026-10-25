"""A person typing: keys at uneven times, a breath now and then, a wrong key rubbed out.

Typing at an even pace reads as a machine. The times are drawn from a seed,
so a film typed twice is typed the same.
"""

import random
from collections.abc import Sequence

from pydantic import BaseModel, ConfigDict

# The usual time between two keys, how unevenly they come, the start of a word a little slower,
# a longer breath now and then, and how long a wrong key stands before it is rubbed out
KEY_SECONDS = 0.085
KEY_SPREAD = 0.45
WORD_START_SLOWER = 1.6
BREATH_CHANCE = 0.08
BREATH_SECONDS = 0.22
TYPO_STANDS_SECONDS = 0.3
# The middle of the lognormal the gaps are drawn from: a gap is the usual one, more or less
USUAL = 0.0
KEYBOARD_ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
SPACE = " "


class Keystroke(BaseModel):
    """A moment of the typing, in seconds from its start, and what then stands typed."""

    model_config = ConfigDict(frozen=True)

    at: float
    typed: str


def keystrokes(text: str, *, seed: int, typo_at: int | None = None, pace: float = 1.0) -> list[Keystroke]:
    """The text typed by a person, `pace` times as slow as usual; with `typo_at`, a slip on that letter."""
    chance = random.Random(seed)  # noqa: S311 - a film's rhythm, not a secret
    moment = 0.0
    typed = ""
    strokes: list[Keystroke] = []
    for index, letter in enumerate(text):
        gap = _gap(chance, starts_a_word=index > 0 and text[index - 1] == SPACE) * pace
        if index == typo_at:
            moment += gap
            strokes.append(Keystroke(at=moment, typed=typed + _beside(letter)))
            moment += TYPO_STANDS_SECONDS
            strokes.append(Keystroke(at=moment, typed=typed))
        moment += gap
        typed += letter
        strokes.append(Keystroke(at=moment, typed=typed))
    return strokes


def typed_by(strokes: Sequence[Keystroke], moment: float) -> str:
    """What stands typed at a moment of the typing."""
    standing = ""
    for stroke in strokes:
        if stroke.at > moment:
            break
        standing = stroke.typed
    return standing


def typing_seconds(strokes: Sequence[Keystroke]) -> float:
    return strokes[-1].at


def _gap(chance: random.Random, *, starts_a_word: bool) -> float:
    gap = KEY_SECONDS * chance.lognormvariate(USUAL, KEY_SPREAD)
    if starts_a_word:
        gap *= WORD_START_SLOWER
    if chance.random() < BREATH_CHANCE:
        gap += BREATH_SECONDS
    return gap


def _beside(letter: str) -> str:
    """The key beside a letter, where a finger slips to; a key on no row slips nowhere."""
    for row in KEYBOARD_ROWS:
        if letter.lower() in row:
            return row[(row.index(letter.lower()) + 1) % len(row)]
    return letter
