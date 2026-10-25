"""How a move speeds up and settles: each curve takes the share of time gone and gives the share of the way gone.

Every curve starts at 0 and ends at 1. A camera that eases in and out reads
as a person's hand; a linear one reads as a machine.
"""

import math
from collections.abc import Callable

type Ease = Callable[[float], float]

# The half-way point of a curve that eases both in and out
HALF_WAY = 0.5


def between(start: float, end: float, progress: float) -> float:
    """The value `progress` of the way from start to end."""
    return start + (end - start) * progress


def linear(progress: float) -> float:
    return progress


def ease_in_quad(progress: float) -> float:
    return progress**2


def ease_out_cubic(progress: float) -> float:
    return 1 - (1 - progress) ** 3


def ease_out_quint(progress: float) -> float:
    return 1 - (1 - progress) ** 5


def ease_in_out_sine(progress: float) -> float:
    return (1 - math.cos(math.pi * progress)) / 2


def ease_in_out_cubic(progress: float) -> float:
    if progress < HALF_WAY:
        return 4 * progress**3
    return 1 - (2 - 2 * progress) ** 3 / 2
