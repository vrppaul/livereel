"""example.com, filmed: the page, the line that says what it is for in six languages, and its one link followed.

uv run livereel shoot examples/example_com.py --out out/example
"""

from contextlib import AbstractAsyncContextManager, nullcontext
from typing import override

from livereel.easing import ease_in_out_cubic, ease_out_cubic
from livereel.film import Film
from livereel.geometry import Format, Size
from livereel.moves.camera import Camera
from livereel.moves.cards import EndingIn, ScreenIn
from livereel.moves.light import LightOff, LightOn, LightTo
from livereel.moves.move import Share
from livereel.moves.pointer import CursorTo
from livereel.moves.words import CaptionIn, CaptionOut
from livereel.scene import Ending, Scene
from livereel.steps import Cut, Play, Step, click, hold
from livereel.studio import Production

ADDRESS = "https://example.com/"
# A square frame, and the page as a laptop lays it out
SQUARE = Format(frame=Size(width=1080, height=1080), screen=Size(width=1440, height=1080))
MARK = "svg"
ENGLISH = "p[lang=en]"
# The same line in the page's other languages, in the order the page says it
LANGUAGES = ("ar", "zh", "fr", "ru", "es")
LINK = "a"
FOLLOWED_TO = "**iana.org/**"
# The screen comes up from a little smaller than the whole of it
OPENS_FROM = 0.86


def in_language(language: str) -> str:
    return f"p[lang={language}]"


def from_the_ground(scene: Scene) -> None:
    """The film opens on the ground alone, the screen a little smaller than it will stand."""
    scene.screen_shown = 0.0
    whole = scene.pose
    scene.pose = whole.looking_at(whole.focus_x, whole.focus_y, whole.zoom * OPENS_FROM)


def without_cursor(scene: Scene) -> None:
    scene.cursor = None


async def follow_the_link(film: Film) -> None:
    await film.app.locator(LINK).click()
    await film.app.wait_for_url(FOLLOWED_TO)
    await film.app.wait_for_load_state()


def through_the_languages() -> list[Step]:
    return [
        step
        for language in LANGUAGES
        for step in (
            Play(
                seconds=0.6,
                moves=[
                    LightTo(target=in_language(language)),
                    Camera(onto=in_language(language), air=90, zoom_at_most=2),
                ],
                ease=ease_in_out_cubic,
            ),
            hold(0.35),
        )
    ]


class ExampleDotCom(Production):
    @property
    @override
    def film_format(self) -> Format:
        return SQUARE

    @override
    def served(self) -> AbstractAsyncContextManager[str]:
        return nullcontext(ADDRESS)

    @override
    async def ready(self, film: Film) -> None:
        await film.app.locator(LINK).wait_for()

    @override
    def steps(self, film: Film) -> list[Step]:
        whole = film.whole()
        return [
            Cut(change=from_the_ground),
            Play(seconds=0.9, moves=[ScreenIn(within=Share(end=0.7)), Camera(to=whole)], ease=ease_out_cubic),
            hold(0.4),
            Play(
                seconds=1.4,
                moves=[
                    Camera(onto=MARK, air=160, zoom_at_most=2.6),
                    CaptionIn(text="The most famous page on the web", within=Share(start=0.35)),
                ],
                ease=ease_in_out_cubic,
            ),
            hold(1.0),
            Play(
                seconds=1.1,
                moves=[
                    Camera(onto=ENGLISH, air=80, zoom_at_most=2),
                    LightOn(target=ENGLISH, within=Share(start=0.3)),
                    CaptionOut(within=Share(end=0.3)),
                    CaptionIn(text="It exists to be an example", within=Share(start=0.4)),
                ],
                ease=ease_in_out_cubic,
            ),
            hold(1.3),
            Play(seconds=0.4, moves=[CaptionOut()]),
            Play(seconds=0.4, moves=[CaptionIn(text="in six languages")]),
            *through_the_languages(),
            Play(
                seconds=1.0,
                moves=[
                    LightTo(target=LINK),
                    Camera(onto=LINK, air=170, zoom_at_most=2.2),
                    CaptionOut(within=Share(end=0.3)),
                    CursorTo(target=LINK, within=Share(start=0.2)),
                ],
                ease=ease_in_out_cubic,
            ),
            hold(0.3),
            Play(seconds=0.25, moves=[LightOff()]),
            *click(follow_the_link),
            Cut(change=without_cursor),
            Play(
                seconds=1.3,
                moves=[
                    Camera(to=whole),
                    CaptionIn(text="and its one link leads somewhere real", within=Share(start=0.3)),
                ],
                ease=ease_in_out_cubic,
            ),
            hold(1.4),
            Play(
                seconds=0.9,
                moves=[
                    CaptionOut(),
                    EndingIn(ending=Ending(name="example.com", line="Filmed live, frame by frame", command="livereel")),
                ],
                ease=ease_out_cubic,
            ),
            hold(1.8),
        ]


PRODUCTION = ExampleDotCom()
