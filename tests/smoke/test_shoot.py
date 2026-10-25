"""A film shot for real, in a browser, of a page on the disk: its frames written, or its one still."""

from contextlib import AbstractAsyncContextManager, nullcontext
from pathlib import Path
from typing import override

from livereel.film import Film, EveryFrame, OneFrame, frame_name
from livereel.geometry import Format, Size
from livereel.moves.camera import Camera
from livereel.moves.light import LightOn
from livereel.steps import Play, Step
from livereel.studio import Production, shoot_production

PAGE = "<!doctype html><title>A page</title><h1>A heading</h1><p>A line under it.</p>"
SMALL = Format(frame=Size(width=320, height=320), screen=Size(width=480, height=320))
# Six frames: a fifth of a second
SECONDS = 0.2


class OnePageFilm(Production):
    def __init__(self, page: Path) -> None:
        self.page = page

    @property
    @override
    def film_format(self) -> Format:
        return SMALL

    @override
    def served(self) -> AbstractAsyncContextManager[str]:
        return nullcontext(self.page.as_uri())

    @override
    async def ready(self, film: Film) -> None:
        await film.app.locator("h1").wait_for()

    @override
    def steps(self, film: Film) -> list[Step]:
        return [Play(seconds=SECONDS, moves=[Camera(onto="h1"), LightOn(target="p")])]


def a_page(directory: Path) -> Path:
    page = directory / "page.html"
    page.write_text(PAGE)
    return page


async def test_every_frame_of_a_film_is_written_in_order(tmp_path: Path) -> None:
    frames = tmp_path / "frames"
    frames.mkdir()

    film = await shoot_production(OnePageFilm(a_page(tmp_path)), EveryFrame(frames), pixel_ratio=1)

    assert sorted(path.name for path in frames.iterdir()) == [frame_name(shot) for shot in range(film.shot)]


async def test_a_still_is_the_one_frame_written_and_nothing_after_it_is_shot(tmp_path: Path) -> None:
    stills = tmp_path / "stills"
    stills.mkdir()

    film = await shoot_production(
        OnePageFilm(a_page(tmp_path)), OneFrame(stills / "still.jpg", moment=0.1), pixel_ratio=1
    )

    # The still is the fourth frame, a tenth of a second in: the film stops right after it, two frames short
    assert ([path.name for path in stills.iterdir()], film.shot) == (["still.jpg"], 4)
