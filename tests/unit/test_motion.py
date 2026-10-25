"""How things move: every curve from standing to the whole way, a move's share of its step, a cursor's arc."""

from livereel.easing import (
    ease_in_out_cubic,
    ease_in_out_sine,
    ease_in_quad,
    ease_out_cubic,
    ease_out_quint,
    linear,
)
from livereel.geometry import Arc, Point
from livereel.moves.move import Share

CURVES = [linear, ease_in_quad, ease_out_cubic, ease_out_quint, ease_in_out_sine, ease_in_out_cubic]


def test_every_curve_starts_still_and_ends_the_whole_way() -> None:
    ends = {curve.__name__: (curve(0.0), curve(1.0)) for curve in CURVES}

    assert ends == {curve.__name__: (0.0, 1.0) for curve in CURVES}


def test_a_move_does_nothing_before_its_share_of_the_step_and_is_done_after_it() -> None:
    share = Share(start=0.25, end=0.75)

    assert [share.of(0.125), share.of(0.5), share.of(0.875)] == [0.0, 0.5, 1.0]


def test_the_cursor_leaves_from_its_start_and_comes_to_rest_at_its_end() -> None:
    start, end = Point(left=0, top=0), Point(left=100, top=40)

    arc = Arc.bowed(start, end, bow=0.14)

    assert [arc.at(0.0), arc.at(1.0)] == [start, end]
