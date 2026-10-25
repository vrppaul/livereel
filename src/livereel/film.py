"""The film being shot: the stage, the page on its screen, the scene as it stands, and the frames shot so far.

Time here is the film's own. A frame is a moment, `shot / FPS` seconds in,
whatever the browser took to draw it, so a wait for the page's server costs
the film nothing and the same film is shot the same every time.
"""

import asyncio
import base64
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import override

from playwright.async_api import CDPSession, Frame, Page
from pydantic import BaseModel, TypeAdapter

from livereel.geometry import Box, Format, Size
from livereel.scene import Pose, Scene

FPS = 30
# A frame's file: its number, padded so the files sort in the order they were shot
FRAME_DIGITS = 5
FRAME_SUFFIX = ".jpg"
JPEG_QUALITY = 92
# The spinner of an agent at work, how many of its glyphs go by a second, and how often the caret blinks
SPINNER = "·✢✳✶✻✽✻✶✳✢"
SPINNER_GLYPHS_PER_SECOND = 10
CARET_BLINKS_PER_SECOND = 1.1
# Where a block of the page stands, read in the page: left, top, width and height of each block that matches
READ_BOXES = (
    "blocks => blocks.map(block => { const box = block.getBoundingClientRect(); "
    "return {left: box.left, top: box.top, width: box.width, height: box.height}; })"
)
BOXES_READ = TypeAdapter(list[Box])
DRAW = "scene => window.stage.apply(JSON.parse(scene))"
SET_UP = "sizes => window.stage.setup(sizes)"


class Screenshot(BaseModel):
    """What Chrome answers a screenshot with: the image, in base64."""

    data: str


def set_up(frame: Size, screen: Size) -> str:
    """The stage's sizes, as the stage reads them: the frame it fills, and the screen it lays the page out on."""
    return Format(frame=frame, screen=screen).model_dump_json()


def frame_name(shot: int) -> str:
    return f"{shot:0{FRAME_DIGITS}}{FRAME_SUFFIX}"


class Footage(ABC):
    """Which frames of a film are kept, and where each goes."""

    @abstractmethod
    def keeps(self, shot: int) -> bool: ...

    @abstractmethod
    def path_of(self, shot: int) -> Path: ...

    @abstractmethod
    def complete(self, shot: int) -> bool:
        """Whether nothing is left to keep once this many frames are shot."""


class EveryFrame(Footage):
    """Every frame, numbered in a directory of their own: what a video is made of."""

    def __init__(self, directory: Path) -> None:
        self.directory = directory

    @override
    def keeps(self, shot: int) -> bool:
        return True

    @override
    def path_of(self, shot: int) -> Path:
        return self.directory / frame_name(shot)

    @override
    def complete(self, shot: int) -> bool:
        return False


class OneFrame(Footage):
    """The one frame at a moment of the film: a still, to look at a shot without making the video."""

    def __init__(self, path: Path, moment: float) -> None:
        self.path = path
        self.shot = round(moment * FPS)

    @override
    def keeps(self, shot: int) -> bool:
        return shot == self.shot

    @override
    def path_of(self, shot: int) -> Path:
        return self.path

    @override
    def complete(self, shot: int) -> bool:
        return shot > self.shot


class Film:
    """The stage, the page on it, the scene as it stands, and how many frames are shot."""

    def __init__(self, *, stage: Page, chrome: CDPSession, app: Frame, film_format: Format, footage: Footage) -> None:
        self.stage = stage
        self.chrome = chrome
        self.app = app
        self.film_format = film_format
        self.footage = footage
        self.scene = Scene(pose=self.whole())
        self.shot = 0

    @property
    def moment(self) -> float:
        return self.shot / FPS

    @property
    def finished(self) -> bool:
        return self.footage.complete(self.shot)

    def whole(self) -> Pose:
        """The pose that shows the whole screen, face-on, as large as the frame holds it."""
        return Pose.whole(self.film_format)

    async def box(self, target: str, every: int = 1) -> Box:
        """Where a block of the page stands on the screen; with `every`, the first that many that match, together."""
        found = await self.app.locator(target).evaluate_all(READ_BOXES)
        if not found:
            message = f"nothing on the page matches {target}"
            raise LookupError(message)
        return Box.around(BOXES_READ.validate_python(found[:every]))

    async def frame(self) -> None:
        """One frame: the scene drawn as it stands and, where the footage keeps it, shot."""
        self._tick()
        await self._draw(self.scene)
        if self.footage.keeps(self.shot):
            # Straight from Chrome: Playwright's own screenshot waits on the page and restyles it around every
            # shot, which made a frame three times as slow (350 ms against 110 ms, measured)
            answer = await self.chrome.send(
                "Page.captureScreenshot", {"format": "jpeg", "quality": JPEG_QUALITY, "optimizeForSpeed": True}
            )
            image = base64.b64decode(Screenshot.model_validate(answer).data)
            await asyncio.to_thread(self.footage.path_of(self.shot).write_bytes, image)
        self.shot += 1

    @asynccontextmanager
    async def page_as_it_stands(self) -> AsyncGenerator[None]:
        """The screen laid flat over a stage its own size while the page is acted on, so it is clicked as it stands.

        A browser finds the point it clicks wrongly on a screen the camera has
        scaled; at no scale, every point is the page's own.
        """
        screen = self.film_format.screen
        await self._stage_of(screen)
        await self._draw(self.scene.posed(Pose(focus_x=screen.width / 2, focus_y=screen.height / 2)))
        try:
            yield
        finally:
            await self._stage_of(self.film_format.frame)

    async def _stage_of(self, frame: Size) -> None:
        await self.stage.set_viewport_size({"width": frame.width, "height": frame.height})
        await self.stage.evaluate(SET_UP, set_up(frame, self.film_format.screen))

    def _tick(self) -> None:
        """What moves of itself in the scene: the spinner of an agent at work, and the caret, once typing stops."""
        terminal = self.scene.terminal
        if terminal is None:
            return
        terminal.spinner = SPINNER[int(self.moment * SPINNER_GLYPHS_PER_SECOND) % len(SPINNER)]
        terminal.caret = int(self.moment * CARET_BLINKS_PER_SECOND * 2) % 2 == 0

    async def _draw(self, scene: Scene) -> None:
        await self.stage.evaluate(DRAW, scene.model_dump_json())
