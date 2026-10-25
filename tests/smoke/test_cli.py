"""The command line, as a person runs it: a file that names no film refused by name, a still past the end refused."""

from pathlib import Path
from textwrap import dedent

from click.testing import CliRunner

from livereel.cli import main

NO_FILM = "WHAT = 1\n"
# A film of a page on the disk, a fifth of a second long
SHORT_FILM = """
    from contextlib import nullcontext
    from pathlib import Path

    from livereel.geometry import Format, Size
    from livereel.steps import hold
    from livereel.studio import Production

    PAGE = Path(__file__).parent / "page.html"


    class Short(Production):
        film_format = Format(frame=Size(width=320, height=320), screen=Size(width=480, height=320))

        def served(self):
            return nullcontext(PAGE.as_uri())

        async def ready(self, film):
            await film.app.locator("h1").wait_for()

        def steps(self, film):
            return [hold(0.2)]


    PRODUCTION = Short()
"""


def test_a_file_that_names_no_film_is_refused_by_the_name_of_what_was_given(tmp_path: Path) -> None:
    film = tmp_path / "nothing.py"
    film.write_text(NO_FILM)

    run = CliRunner().invoke(main, ["still", str(film), "--out", str(tmp_path), "--at", "0"])

    assert (run.exit_code, "names no PRODUCTION" in run.output, "FILM_FILE" in run.output) == (2, True, True)


def test_a_still_past_the_end_of_the_film_is_refused_with_how_long_it_is(tmp_path: Path) -> None:
    (tmp_path / "page.html").write_text("<!doctype html><h1>A heading</h1>")
    film = tmp_path / "short.py"
    film.write_text(dedent(SHORT_FILM))

    run = CliRunner().invoke(main, ["still", str(film), "--out", str(tmp_path / "out"), "--at", "5", "--draft"])

    assert (run.exit_code, run.output.strip()) == (1, "Error: short is 0.2 s long: there is no frame at 5 s")


def test_a_moment_before_the_film_begins_is_refused_as_it_is_read(tmp_path: Path) -> None:
    run = CliRunner().invoke(main, ["still", str(tmp_path / "any.py"), "--out", str(tmp_path), "--at", "-1"])

    assert run.exit_code == 2
