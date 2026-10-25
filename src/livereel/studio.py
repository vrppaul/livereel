"""A production put on the stage and shot: the browser, the page in the stage's frame, and the frames made a video.

A page is shown even where it refuses to be shown in another page's frame
(`X-Frame-Options`, a CSP `frame-ancestors`): the filming browser alone
takes the refusal off every page's answer, and lets everything else a page
asks for go by untouched. The page's own motion is stilled, by the reduced
motion it is asked for, so every move in the film is the film's.
"""

import asyncio
import math
from abc import ABC, abstractmethod
from contextlib import AbstractAsyncContextManager
from pathlib import Path
from urllib.parse import urlsplit

from playwright.async_api import Browser, Frame, Route, async_playwright

from livereel.film import FPS, FRAME_DIGITS, FRAME_SUFFIX, SET_UP, Film, Footage, set_up
from livereel.geometry import Format, Size
from livereel.steps import Step, shoot

STAGE = Path(__file__).parent / "stage" / "stage.html"
# Headers by which a page refuses to be shown in a frame of another page
# A CSP's directives, and the one of them that says which pages may frame this one
DIRECTIVES_APART = "; "
ANCESTORS = "frame-ancestors"
# The ways a page comes from a server, and what a page is among what a page asks for
SERVED = frozenset({"http", "https"})
DOCUMENT = "document"
# The stage is a file, and Chrome refuses a page framed in it the connections it makes to this machine (Local Network
# Access): a page served here, as a film's own is, would never hear its server again once loaded
BROWSER_ARGUMENTS = ["--disable-features=LocalNetworkAccessChecks"]
NAVIGATED = "framenavigated"
OPEN = "address => window.stage.open(address)"
# The video: H.264 that any player opens, its quality, and how hard the encoder works for it
FRAMES = f"%0{FRAME_DIGITS}d{FRAME_SUFFIX}"
ENCODING = ("-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart")
# A contact sheet: a frame a second, this many to a row
SHEET_COLUMNS = 6
SHEET_TILE_WIDTH = 360


class ProductionError(RuntimeError):
    """A film that cannot be shot as written: ffmpeg refused it."""


class Production(ABC):
    """A film to shoot: the frame it is shot at and the screen its page is laid out on, its page, and its steps."""

    @property
    @abstractmethod
    def film_format(self) -> Format: ...

    @abstractmethod
    def served(self) -> AbstractAsyncContextManager[str]:
        """The page's address, for as long as the page is served."""

    @abstractmethod
    async def ready(self, film: Film) -> None:
        """Wait until the page stands as the first frame shows it."""

    @abstractmethod
    def steps(self, film: Film) -> list[Step]: ...


async def shoot_production(production: Production, footage: Footage, pixel_ratio: int) -> Film:
    """Every frame of the production that the footage keeps, shot `pixel_ratio` times as sharp as the frame."""
    async with production.served() as address, async_playwright() as playwright:
        browser = await playwright.chromium.launch(args=BROWSER_ARGUMENTS)
        try:
            film = await _on_stage(browser, address, production.film_format, footage, pixel_ratio)
            await production.ready(film)
            await shoot(film, production.steps(film))
        finally:
            await browser.close()
        return film


async def encode(frames: Path, video: Path, frame: Size) -> Path:
    """The frames, shot sharper than the frame, made a video of the frame's size."""
    await _ffmpeg(
        "-framerate", str(FPS), "-i", str(frames / FRAMES),
        "-vf", f"scale={frame.width}:{frame.height}:flags=lanczos", *ENCODING, str(video),
    )  # fmt: skip
    return video


async def contact_sheet(video: Path, sheet: Path, seconds: float) -> Path:
    """A frame a second of the video, side by side: the whole film at a glance."""
    rows = math.ceil(seconds / SHEET_COLUMNS)
    tiles = f"select='not(mod(n\\,{FPS}))',scale={SHEET_TILE_WIDTH}:-1,tile={SHEET_COLUMNS}x{rows}"
    await _ffmpeg("-i", str(video), "-vf", tiles, "-frames:v", "1", str(sheet))
    return sheet


async def _on_stage(browser: Browser, address: str, film_format: Format, footage: Footage, pixel_ratio: int) -> Film:
    frame, screen = film_format.frame, film_format.screen
    stage = await browser.new_page(
        viewport={"width": frame.width, "height": frame.height}, device_scale_factor=pixel_ratio
    )
    await stage.emulate_media(reduced_motion="reduce", color_scheme="light")
    await stage.route(_served, _without_frame_refusals)
    await stage.goto(STAGE.as_uri())
    await stage.evaluate(SET_UP, set_up(frame, screen))
    async with stage.expect_event(NAVIGATED, predicate=_is_in_a_frame) as navigated:
        await stage.evaluate(OPEN, address)
    app: Frame = await navigated.value
    await app.wait_for_load_state()
    chrome = await stage.context.new_cdp_session(stage)
    return Film(stage=stage, chrome=chrome, app=app, film_format=film_format, footage=footage)


def _is_in_a_frame(navigated: Frame) -> bool:
    """Whether a page that went somewhere is the one in the stage's frame, not the stage itself."""
    return navigated.parent_frame is not None


def _served(requested: str) -> bool:
    """Whether a request goes to a server: a page on the disk refuses no frame."""
    return urlsplit(requested).scheme in SERVED


async def _without_frame_refusals(route: Route) -> None:
    """A page's answer with its refusals to be framed taken off; anything but a page goes on untouched."""
    if route.request.resource_type != DOCUMENT:
        await route.fallback()
        return
    answer = await route.fetch()
    headers = {name: _framed_anyway(name, value) for name, value in answer.headers.items()}
    await route.fulfill(response=answer, headers={name: value for name, value in headers.items() if value})


def _framed_anyway(name: str, value: str) -> str:
    """A header as it stands once it no longer refuses a frame: `X-Frame-Options` gone, a CSP less `frame-ancestors`."""
    match name.lower():
        case "x-frame-options":
            return ""
        case "content-security-policy":
            directives = [directive.strip() for directive in value.split(DIRECTIVES_APART)]
            return DIRECTIVES_APART.join(directive for directive in directives if not directive.startswith(ANCESTORS))
        case _:
            return value


async def _ffmpeg(*arguments: str) -> None:
    process = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-loglevel", "error", *arguments, stderr=asyncio.subprocess.PIPE
    )
    _, errors = await process.communicate()
    if process.returncode != 0:
        message = errors.decode()
        raise ProductionError(message)
