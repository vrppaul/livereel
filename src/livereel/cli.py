"""The command line: shoot a film written as a Python file, whole as a video, or one still of it.

A film file names its production `PRODUCTION`. Its own directory is put on
the import path first, so a film may keep its data in the files beside it.
"""

import asyncio
import importlib.util
import shutil
import sys
import time
from pathlib import Path
from typing import override

import click
from pydantic import BaseModel, ConfigDict

from livereel.film import EveryFrame, OneFrame
from livereel.studio import Production, contact_sheet, encode, shoot_production

PRODUCTION_NAME = "PRODUCTION"
# Sharp enough to zoom into and to angle without the text going soft; a draft is shot at the frame's own size
PIXEL_RATIO = 2
DRAFT_PIXEL_RATIO = 1
FRAMES_DIRECTORY = "frames"
VIDEO_SUFFIX = ".mp4"
STILL_SUFFIX = ".jpg"
SHEET_SUFFIX = "-sheet.png"


class LoadedFilm(BaseModel):
    """A film file as the command line loaded it: what its outputs are named after, and its production."""

    model_config = ConfigDict(frozen=True, arbitrary_types_allowed=True)

    name: str
    production: Production


class FilmFile(click.ParamType):
    """A Python file that names a production; one that cannot be loaded, or names none, is refused by name."""

    name = "film"

    @override
    def convert(self, value: str, param: click.Parameter | None, ctx: click.Context | None) -> LoadedFilm:
        path = Path(value)
        sys.path.insert(0, str(path.parent.resolve()))
        specification = importlib.util.spec_from_file_location(path.stem, path)
        if specification is None or specification.loader is None:
            self.fail(f"{value} cannot be loaded as Python", param, ctx)
        module = importlib.util.module_from_spec(specification)
        specification.loader.exec_module(module)
        production = getattr(module, PRODUCTION_NAME, None)
        if not isinstance(production, Production):
            self.fail(f"{value} names no {PRODUCTION_NAME}: a Production of livereel.studio", param, ctx)
        return LoadedFilm(name=path.stem, production=production)


def _pixel_ratio(*, draft: bool) -> int:
    return DRAFT_PIXEL_RATIO if draft else PIXEL_RATIO


THE_FILM = click.argument("film", metavar="FILM_FILE", type=FilmFile())
OUT = click.option("--out", type=click.Path(file_okay=False, path_type=Path), required=True, help="Where to write.")
DRAFT = click.option("--draft", is_flag=True, help="Shoot at the frame's own size: quicker, softer.")


@click.group()
def main() -> None:
    """Film a live web page: a camera, a light, a cursor and captions over it, frame by frame."""


@main.command()
@THE_FILM
@OUT
@DRAFT
@click.option("--sheet", is_flag=True, help="Also write a contact sheet, a frame a second.")
def shoot(*, film: LoadedFilm, out: Path, draft: bool, sheet: bool) -> None:
    """Shoot FILM_FILE whole, as a video."""
    frames = out / FRAMES_DIRECTORY
    shutil.rmtree(frames, ignore_errors=True)
    frames.mkdir(parents=True)
    started = time.perf_counter()
    shot = asyncio.run(shoot_production(film.production, EveryFrame(frames), _pixel_ratio(draft=draft)))
    filmed = time.perf_counter()
    video = asyncio.run(encode(frames, out / f"{film.name}{VIDEO_SUFFIX}", film.production.film_format.frame))
    encoded = time.perf_counter()
    click.echo(
        f"{video}: {shot.shot} frames, {shot.moment:.1f} s; "
        f"shot in {filmed - started:.1f} s, made a video in {encoded - filmed:.1f} s"
    )
    if sheet:
        click.echo(asyncio.run(contact_sheet(video, out / f"{film.name}{SHEET_SUFFIX}", shot.moment)))


@main.command()
@THE_FILM
@OUT
@DRAFT
@click.option("--at", type=click.FloatRange(min=0), required=True, help="The moment of the still, in seconds.")
def still(*, film: LoadedFilm, out: Path, draft: bool, at: float) -> None:
    """Shoot one still of FILM_FILE, without making the video."""
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{film.name}-{at:g}s{STILL_SUFFIX}"
    path.unlink(missing_ok=True)
    started = time.perf_counter()
    shot = asyncio.run(shoot_production(film.production, OneFrame(path, at), _pixel_ratio(draft=draft)))
    if not path.exists():
        message = f"{film.name} is {shot.moment:.1f} s long: there is no frame at {at:g} s"
        raise click.ClickException(message)
    click.echo(f"{path}: shot in {time.perf_counter() - started:.1f} s")
