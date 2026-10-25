"""Where the camera stands: a block framed with air round it, never too close, the screen's edge out of a face-on frame."""

from livereel.framing import covering, onto
from livereel.geometry import Box, Format, Size
from livereel.scene import Pose

SQUARE = Format(frame=Size(width=1000, height=1000), screen=Size(width=1400, height=1000))
FACE_ON = Pose(focus_x=700, focus_y=500)


def test_a_block_is_framed_whole_with_its_air_round_it() -> None:
    block = Box(left=100, top=200, width=400, height=100)

    framed = onto(block, around=FACE_ON, frame=SQUARE.frame, air=50, zoom_at_most=5)

    assert framed == Pose(focus_x=300, focus_y=250, zoom=2)


def test_the_camera_comes_no_closer_than_allowed() -> None:
    block = Box(left=0, top=0, width=10, height=10)

    framed = onto(block, around=FACE_ON, frame=SQUARE.frame, air=0, zoom_at_most=3)

    assert framed.zoom == 3


def test_a_framing_keeps_the_angle_it_was_taken_at() -> None:
    angled = Pose(focus_x=0, focus_y=0, tilt=20, turn=-10)

    framed = onto(Box(left=0, top=0, width=500, height=500), around=angled, frame=SQUARE.frame, air=0, zoom_at_most=5)

    assert (framed.tilt, framed.turn) == (20, -10)


def test_a_face_on_camera_near_a_corner_moves_until_no_edge_of_the_screen_shows() -> None:
    near_the_corner = Pose(focus_x=50, focus_y=950, zoom=2)

    covered = covering(near_the_corner, SQUARE)

    assert (covered.focus_x, covered.focus_y) == (250, 750)


def test_a_screen_too_short_to_fill_the_frame_stays_where_the_camera_put_it() -> None:
    far = Pose(focus_x=700, focus_y=900, zoom=0.5)

    assert covering(far, SQUARE) == far
