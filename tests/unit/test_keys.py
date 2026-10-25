"""A person typing: the whole text in the end, a slip rubbed out, and the same rhythm from the same seed."""

from livereel.keys import keystrokes, typed_by, typing_seconds

TEXT = "add rate limiting"


def test_the_typing_ends_with_the_whole_text() -> None:
    strokes = keystrokes(TEXT, seed=1)

    assert typed_by(strokes, typing_seconds(strokes)) == TEXT


def test_a_slip_stands_and_is_rubbed_out_before_the_right_letter() -> None:
    typed = [stroke.typed for stroke in keystrokes("rate", seed=1, typo_at=2)]

    assert typed == ["r", "ra", "ray", "ra", "rat", "rate"]


def test_the_same_seed_types_the_same_and_another_seed_otherwise() -> None:
    assert keystrokes(TEXT, seed=7) == keystrokes(TEXT, seed=7)
    assert keystrokes(TEXT, seed=7) != keystrokes(TEXT, seed=8)


def test_keys_come_one_after_another_in_time() -> None:
    moments = [stroke.at for stroke in keystrokes(TEXT, seed=3, typo_at=5)]

    assert moments == sorted(moments)


def test_before_the_first_key_nothing_stands_typed() -> None:
    assert typed_by(keystrokes(TEXT, seed=1), 0.0) == ""


def test_a_slower_pace_takes_longer() -> None:
    assert typing_seconds(keystrokes(TEXT, seed=1, pace=2.0)) > typing_seconds(keystrokes(TEXT, seed=1))
