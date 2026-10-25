"""Where the camera stands to frame a block of the page, and how it keeps the screen's edges out of the frame.

Pure arithmetic on boxes and poses, so a film's framing is worked out before
a browser is asked anything.
"""

from livereel.geometry import Box, Format, Size
from livereel.scene import Pose


def onto(box: Box, *, around: Pose, frame: Size, air: float, zoom_at_most: float) -> Pose:
    """The pose that holds a box with `air` clear on its every side, at `around`'s angle, no closer than allowed."""
    fit = min(frame.width / (box.width + 2 * air), frame.height / (box.height + 2 * air))
    return around.looking_at(box.middle_x, box.middle_y, min(fit, zoom_at_most))


def covering(pose: Pose, film_format: Format) -> Pose:
    """A face-on pose moved as little as it takes for the screen to fill the frame, no edge of it showing.

    Along a side the screen is too short to fill at that zoom, the pose stays as it is.
    """
    half_width = film_format.frame.width / (2 * pose.zoom)
    half_height = film_format.frame.height / (2 * pose.zoom)
    focus_x = _kept_within(pose.focus_x, half_width, film_format.screen.width)
    focus_y = _kept_within(pose.focus_y, half_height, film_format.screen.height)
    return pose.looking_at(focus_x, focus_y, pose.zoom)


def _kept_within(focus: float, half_seen: float, length: float) -> float:
    """A focus moved so that as much as is seen either side of it stays on the screen, where it can."""
    if 2 * half_seen > length:
        return focus
    return min(max(focus, half_seen), length - half_seen)
