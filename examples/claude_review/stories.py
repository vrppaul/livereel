"""claude-review's stories, filmed square: a task typed to an agent, a reader lost in 26 files, and the agent's story.

    uv run livereel shoot examples/claude_review/stories.py --out out/stories --sheet

It needs `claude-review` on the path. The review is served by its own
command line, of a demo change (`demo.py`), and the agent is played by the
same commands an agent runs: it takes the story request, tells the story,
answers the reader's question. The reader is played on the page itself. The
terminal is drawn on the stage: Claude Code cannot be filmed.
"""

import asyncio
import json
import os
import shutil
import tempfile
import urllib.request
from collections.abc import AsyncGenerator
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from pathlib import Path
from typing import override

import demo
from pydantic import BaseModel, ConfigDict

from livereel.easing import ease_in_out_cubic, ease_out_cubic, ease_out_quint, linear
from livereel.film import Film
from livereel.geometry import Format, Size
from livereel.keys import keystrokes
from livereel.moves.camera import Camera
from livereel.moves.cards import EndingIn, ScreenIn
from livereel.moves.light import LightOff, LightOn, LightTo
from livereel.moves.move import Share
from livereel.moves.page import ScrollBy, ScrollTo, TypeIntoPage
from livereel.moves.pointer import CursorTo
from livereel.moves.terminal import AgentWorks, TerminalLeaves, TypeInTerminal, submit
from livereel.moves.words import CaptionIn, CaptionOut
from livereel.scene import Ending, LineKind, Pose, Scene, Terminal, TerminalLine
from livereel.steps import Act, Cut, Play, Step, click, hold, typing
from livereel.studio import Production

SQUARE = Format(frame=Size(width=1080, height=1080), screen=Size(width=1440, height=1080))
REVIEW = "claude-review"
READY = "Review ready at "
GIT = ("git", "-c", "user.name=Demo", "-c", "user.email=demo@example.com", "-c", "init.defaultBranch=main")
REPOSITORY = "search"
STORY_DOCUMENT = "story.json"
GUIDE_ROUTE = "/api/guide"
SETTINGS_ROUTE = "/api/settings"
JSON_HEADERS = {"Content-Type": "application/json"}
TAKEN = "The agent took the request"
# How long the agent's command waits for the reader, and how long for nothing at all, as an agent attaching does
TAKE_WITHIN = "10"
ATTACHED_BY = "0.2"
SERVER_STOPS_WITHIN = 30

TASK = "add rate limiting to /search"
TASK_SLIP_AT = 12
COMMAND = "/review-ui"
WORK = [
    TerminalLine(kind=LineKind.WORK, text="Read app/api.py"),
    TerminalLine(kind=LineKind.WORK, text="Read app/config.py"),
    TerminalLine(kind=LineKind.WORK, text="Read tests/test_api.py"),
    TerminalLine(kind=LineKind.WORK, text="Write app/limits.py"),
    TerminalLine(kind=LineKind.WORK, text="Write app/clients.py"),
    TerminalLine(kind=LineKind.WORK, text="Update app/api.py"),
    TerminalLine(kind=LineKind.WORK, text="Write app/middleware.py"),
    TerminalLine(kind=LineKind.WORK, text="Update app/admin.py"),
    TerminalLine(kind=LineKind.WORK, text="Write tests/test_limits.py"),
    TerminalLine(kind=LineKind.WORK, text="Update docs/api.md"),
    TerminalLine(kind=LineKind.WORK, text="Bash pytest -q · 31 passed"),
    TerminalLine(
        kind=LineKind.SAID, text="Search is rate-limited: 5 a second per client, bursts of 10, 429 past that."
    ),
]
OPENING = [
    TerminalLine(kind=LineKind.WORK, text="Bash claude-review diff"),
    TerminalLine(kind=LineKind.SAID, text="The review is open in your browser."),
]
THINKING = TerminalLine(kind=LineKind.THINKING, text="Working…")
# The camera as the reader gets lost: drawing back, and leaning further away with every scroll
LOST = (
    Pose(focus_x=760, focus_y=560, zoom=0.98, tilt=5, turn=-3),
    Pose(focus_x=760, focus_y=570, zoom=0.96, tilt=9, turn=-6),
    Pose(focus_x=740, focus_y=580, zoom=0.9, tilt=15, turn=-10),
    Pose(focus_x=735, focus_y=585, zoom=0.88, tilt=16.5, turn=-11),
)
OPENS_FROM = 0.86
ENDING = Ending(name="claude-review", line="Make your agent walk you through its change", command="/review-ui")

# Where on the page the film looks
FILE_COUNT = "[data-testid=sidebar-heading]"
FILE_ROWS = "[data-testid=file-item]"
FILES_LOOKED_AT = 13
DIFF = "[data-testid=diff-view]"
SWITCH = "[data-testid=reading-view]"
STORY_BUTTON = "[data-testid=read-as-story]"
WRITING = "[data-testid=story-waiting]"
CHAPTER_IN_CONTENTS = "[data-testid=contents-parts] > li"
# The contents open on the overview, then the five chapters
FIRST_CHAPTER, LAST_CHAPTER = 1, 5
OVERVIEW_PART = "[data-testid=story-overview]"
OVERVIEW = "[data-testid=overview-lines]"
TASK_CARD = "[data-testid=overview-task]"
DONE_CARD = "[data-testid=overview-done]"
DOUBT_CARD = "[data-testid=overview-doubt]"
DECISIONS = "[data-testid=overview-list]"
DECISIONS_TOGGLE = "[data-testid=overview-list-toggle]"
SECOND_DECISION = "[data-testid=overview-item] >> nth=1"
CHAPTER_HEAD = "[data-testid=part-head]"
CHAPTER_WHY = "[data-testid=chapter-why-block]"
STEP = "[data-testid=step-frame]"
REASON = "[data-testid=step-reason-block]"
ASK = "[data-testid=ask-about-this]"
ASK_NOW = "[data-testid=ask-now]"
ANSWERING = "[data-testid=comment-answering]"
# The step the reader asks about: the second of the first chapter
ASKED_STEP = 1
ANSWERED = "Want it in this round?"


def nth(selector: str, index: int) -> str:
    return f"{selector} >> nth={index}"


class NoQuestionError(RuntimeError):
    """The agent asked to answer before it was handed a question."""


class HandedThread(BaseModel):
    thread_id: str


class HandedQuestion(BaseModel):
    question_id: str
    thread: HandedThread


class QuestionEvent(BaseModel):
    """What `wait` prints when the reader asks the agent in a thread: the part of it the agent answers by."""

    model_config = ConfigDict(frozen=True)

    question: HandedQuestion


class Agent:
    """The agent's side of the review, played through its command line as an agent plays it."""

    def __init__(self, port: str, environment: dict[str, str], scratch: Path) -> None:
        self.port = port
        self.environment = environment
        self.scratch = scratch
        self.question: HandedQuestion | None = None

    async def run(self, *arguments: str) -> str:
        process = await asyncio.create_subprocess_exec(
            REVIEW, *arguments, "--port", self.port,
            env=self.environment, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )  # fmt: skip
        out, errors = await process.communicate()
        if process.returncode != 0:
            message = f"{REVIEW} {' '.join(arguments)}: {errors.decode()}"
            raise RuntimeError(message)
        return out.decode()

    async def attach(self) -> None:
        """Wait once and come back, as an agent does between events: the review counts it as there."""
        await self.run("wait", "--seconds", ATTACHED_BY)

    async def take_the_story_request(self, film: Film) -> None:
        """The request picked up: the page says the agent took it."""
        await self.run("wait", "--seconds", TAKE_WITHIN)
        await film.app.get_by_text(TAKEN).wait_for()

    async def tell_the_story(self, film: Film) -> None:
        document = self.scratch / STORY_DOCUMENT
        await asyncio.to_thread(document.write_text, json.dumps(demo.STORY))
        await self.run("story", "--file", str(document))
        await film.app.locator(OVERVIEW).wait_for()

    async def take_the_question(self, film: Film) -> None:
        """The question picked up, waiting since the reader sent it: the thread says the agent is answering."""
        self.question = QuestionEvent.model_validate_json(await self.run("wait", "--seconds", TAKE_WITHIN)).question
        await film.app.locator(ANSWERING).wait_for()

    async def answer(self, film: Film) -> None:
        if self.question is None:
            raise NoQuestionError
        thread, asked = self.question.thread.thread_id, self.question.question_id
        await self.run("reply", "--thread", thread, "--question", asked, demo.REPLY)
        await film.app.get_by_text(ANSWERED).wait_for()


async def motion_on(film: Film) -> None:
    """The page's own motion let go: what it draws while the agent works plays, sped up, as a time-lapse."""
    await film.stage.emulate_media(reduced_motion="no-preference")


async def motion_off(film: Film) -> None:
    await film.stage.emulate_media(reduced_motion="reduce")


async def ask_for_the_story(film: Film) -> None:
    await motion_on(film)
    await film.app.locator(STORY_BUTTON).click()
    await film.app.locator(WRITING).wait_for()


async def open_the_decisions(film: Film) -> None:
    await film.app.locator(DECISIONS_TOGGLE).click()
    await film.app.locator(SECOND_DECISION).wait_for()


async def open_the_question(film: Film) -> None:
    block = film.app.locator(nth(REASON, ASKED_STEP))
    await block.hover()
    await block.locator(ASK).click()


async def send_the_question(film: Film) -> None:
    await film.app.locator(ASK_NOW).click()


def open_the_terminal(scene: Scene) -> None:
    scene.terminal = Terminal(title="search — claude")
    scene.screen_shown = 0.0


def window_from_afar(scene: Scene) -> None:
    whole = scene.pose
    scene.pose = whole.looking_at(whole.focus_x, whole.focus_y, whole.zoom * OPENS_FROM)


def without_cursor(scene: Scene) -> None:
    scene.cursor = None


def act_terminal(count: str) -> list[Step]:
    """The task, typed by a person; the agent at work; the review asked for."""
    work = [*WORK, TerminalLine(kind=LineKind.DONE, text=count)]
    return [
        Cut(change=open_the_terminal),
        hold(0.5),
        *typing(TypeInTerminal(strokes=keystrokes(TASK, seed=11, typo_at=TASK_SLIP_AT, pace=0.55))),
        hold(0.2),
        Cut(change=submit),
        Play(seconds=2.4, moves=[AgentWorks(lines=work, thinking=THINKING)], ease=linear),
        hold(0.6),
        *typing(TypeInTerminal(strokes=keystrokes(COMMAND, seed=5, pace=0.5))),
        hold(0.15),
        Cut(change=submit),
        Play(seconds=0.5, moves=[AgentWorks(lines=OPENING, thinking=THINKING, thinking_share=0.3)], ease=linear),
        hold(0.25),
    ]


def act_lost(whole: Pose) -> list[Step]:
    """The review opens out of the terminal; the reader takes in how much there is, and is lost."""
    return [
        Cut(change=window_from_afar),
        Play(
            seconds=0.8,
            moves=[
                TerminalLeaves(within=Share(end=0.6)),
                ScreenIn(within=Share(start=0.15, end=0.8)),
                Camera(to=whole),
            ],
            ease=ease_out_cubic,
        ),
        hold(0.35),
        Play(
            seconds=1.1,
            moves=[
                Camera(onto=FILE_COUNT, air=70, zoom_at_most=2.6),
                CursorTo(target=FILE_COUNT, within=Share(start=0.35)),
            ],
            ease=ease_in_out_cubic,
        ),
        hold(0.7),
        Play(
            seconds=1.3,
            moves=[
                Camera(onto=FILE_ROWS, every=FILES_LOOKED_AT, air=30),
                CursorTo(target=nth(FILE_ROWS, FILES_LOOKED_AT - 1), within=Share(start=0.2)),
            ],
            ease=ease_in_out_cubic,
        ),
        hold(0.5),
        Play(seconds=0.9, moves=[Camera(to=LOST[0]), CursorTo(target=DIFF, within=Share(start=0.1, end=0.9))]),
        Play(seconds=0.8, moves=[ScrollBy(target=DIFF, pixels=700)], ease=ease_in_out_cubic),
        hold(0.35),
        Play(seconds=0.6, moves=[ScrollBy(target=DIFF, pixels=-240), Camera(to=LOST[1])], ease=ease_in_out_cubic),
        hold(0.3),
        Play(seconds=1.1, moves=[ScrollBy(target=DIFF, pixels=1600), Camera(to=LOST[2])], ease=ease_in_out_cubic),
        Play(
            seconds=1.6,
            moves=[CaptionIn(text="Don't know where to start?", within=Share(end=0.6)), Camera(to=LOST[3])],
            ease=linear,
        ),
        hold(0.3),
    ]


def act_hint(agent: Agent) -> list[Step]:
    """Close on the switch: the agent can walk you through it. The story asked for, and written."""
    return [
        Play(
            seconds=1.3,
            moves=[
                CaptionOut(within=Share(end=0.3)),
                Camera(onto=SWITCH, air=170, tilt=0, turn=0),
                CursorTo(target=STORY_BUTTON, within=Share(start=0.25)),
            ],
            ease=ease_in_out_cubic,
        ),
        Play(seconds=1.1, moves=[CaptionIn(text="Make the agent walk you through it")]),
        hold(0.7),
        *click(ask_for_the_story),
        Cut(change=without_cursor),
        Play(
            seconds=1.0, moves=[CaptionOut(within=Share(end=0.4)), Camera(onto=WRITING, air=50)], ease=ease_in_out_cubic
        ),
        hold(0.7),
        Act(action=agent.take_the_story_request),
        hold(1.6),
        Act(action=agent.tell_the_story),
        Act(action=motion_off),
    ]


def act_chapters(whole: Pose) -> list[Step]:
    """The story as it lands, the whole of it; then down its chapters, the camera and the light together."""
    down_the_chapters = [
        step
        for chapter in range(FIRST_CHAPTER + 1, LAST_CHAPTER + 1)
        for step in (
            Play(
                seconds=0.8,
                moves=[
                    LightTo(target=nth(CHAPTER_IN_CONTENTS, chapter)),
                    Camera(onto=nth(CHAPTER_IN_CONTENTS, chapter), air=60, zoom_at_most=1.9),
                ],
                ease=ease_in_out_cubic,
            ),
            hold(0.45),
        )
    ]
    first = nth(CHAPTER_IN_CONTENTS, FIRST_CHAPTER)
    return [
        Play(seconds=1.0, moves=[Camera(to=whole)], ease=ease_in_out_cubic),
        hold(0.4),
        Play(
            seconds=2.6,
            moves=[
                Camera(onto=OVERVIEW_PART, air=40, zoom_at_most=1.15),
                CaptionIn(text="It tells you the story of its change", within=Share(start=0.2, end=0.7)),
            ],
        ),
        hold(0.8),
        Play(
            seconds=1.4,
            moves=[
                CaptionOut(within=Share(end=0.3)),
                Camera(onto=first, air=60, zoom_at_most=1.9),
                LightOn(target=first, within=Share(start=0.5), ease=ease_out_cubic),
                CaptionIn(text="26 files. Five chapters.", within=Share(start=0.4)),
            ],
            ease=ease_in_out_cubic,
        ),
        hold(0.6),
        *down_the_chapters,
        hold(0.4),
    ]


def act_brief() -> list[Step]:
    """The title and the whole brief, then each part of it, then what the agent turned down: the reader opens it."""
    return [
        Play(
            seconds=1.3,
            moves=[
                LightOff(within=Share(end=0.5)),
                CaptionOut(within=Share(end=0.3)),
                Camera(onto=OVERVIEW_PART, air=40, zoom_at_most=1.3),
                CaptionIn(text="First, a brief", within=Share(start=0.45)),
            ],
            ease=ease_in_out_cubic,
        ),
        hold(1.0),
        Play(
            seconds=1.0,
            moves=[
                Camera(onto=OVERVIEW, air=40),
                LightOn(target=TASK_CARD, within=Share(start=0.3)),
                CaptionOut(within=Share(end=0.3)),
                CaptionIn(text="What you asked", within=Share(start=0.4)),
            ],
            ease=ease_in_out_cubic,
        ),
        hold(1.1),
        *light_and_say(DONE_CARD, "What it did"),
        hold(1.5),
        *light_and_say(DOUBT_CARD, "What to doubt"),
        hold(1.5),
        Play(
            seconds=1.0,
            moves=[
                LightTo(target=DECISIONS),
                CaptionOut(within=Share(end=0.35)),
                Camera(onto=DECISIONS, air=160, zoom_at_most=1.5),
                CursorTo(target=DECISIONS_TOGGLE, within=Share(start=0.3)),
            ],
            ease=ease_in_out_cubic,
        ),
        hold(0.3),
        *click(open_the_decisions),
        Play(
            seconds=0.9,
            moves=[
                LightTo(target=DECISIONS),
                Camera(onto=DECISIONS, air=60, zoom_at_most=1.5),
                CaptionIn(text="What it turned down, and why", within=Share(start=0.3)),
            ],
            ease=ease_in_out_cubic,
        ),
        Cut(change=without_cursor),
        hold(2.2),
    ]


def light_and_say(target: str, caption: str) -> list[Step]:
    """The light carried to a block, and the caption that says what it is."""
    return [
        Play(
            seconds=0.8,
            moves=[
                LightTo(target=target),
                CaptionOut(within=Share(end=0.35)),
                CaptionIn(text=caption, within=Share(start=0.4)),
            ],
            ease=ease_in_out_cubic,
        ),
    ]


def act_chunks() -> list[Step]:
    """The chapters themselves: why the first is there, then every chunk of code under its reason."""
    return [
        Play(seconds=0.6, moves=[LightOff(), CaptionOut()]),
        Play(seconds=1.3, moves=[ScrollTo(target=nth(CHAPTER_HEAD, 0), top=30)], ease=ease_in_out_cubic),
        Play(
            seconds=1.0,
            moves=[
                Camera(onto=nth(CHAPTER_WHY, 0), air=110, zoom_at_most=1.5),
                LightOn(target=nth(CHAPTER_WHY, 0), within=Share(start=0.4)),
            ],
            ease=ease_in_out_cubic,
        ),
        Play(seconds=0.9, moves=[CaptionIn(text="Then every chunk, explained")]),
        hold(1.0),
        *onto_the_step(0),
        hold(1.6),
        *onto_the_step(ASKED_STEP),
        hold(1.2),
    ]


def onto_the_step(index: int) -> list[Step]:
    """The page scrolled to a step, then the step framed and lit whole: its reason above its code."""
    return [
        Play(seconds=1.1, moves=[ScrollTo(target=nth(STEP, index), top=40), LightOff()], ease=ease_in_out_cubic),
        Play(
            seconds=0.9,
            moves=[
                Camera(onto=nth(STEP, index), air=40),
                LightOn(target=nth(STEP, index), dim=0.5, within=Share(start=0.3)),
            ],
            ease=ease_in_out_cubic,
        ),
    ]


def act_question(agent: Agent) -> list[Step]:
    """A question on a step, typed by the reader; the agent answering, then its answer."""
    question = keystrokes(demo.QUESTION, seed=23, typo_at=9, pace=0.5)
    return [
        Play(
            seconds=0.8,
            moves=[LightOff(), CaptionOut(within=Share(end=0.5)), CursorTo(target=nth(REASON, ASKED_STEP))],
            ease=ease_in_out_cubic,
        ),
        *click(open_the_question),
        *typing(TypeIntoPage(strokes=question)),
        Play(seconds=0.5, moves=[CursorTo(target=ASK_NOW)], ease=ease_in_out_cubic),
        *click(send_the_question),
        Act(action=motion_on),
        Act(action=agent.take_the_question),
        Cut(change=without_cursor),
        Play(seconds=0.8, moves=[Camera(onto=nth(STEP, ASKED_STEP), air=30)], ease=ease_in_out_cubic),
        hold(1.0),
        Act(action=agent.answer),
        Act(action=motion_off),
        Play(seconds=0.9, moves=[CaptionIn(text="Ask about any step")]),
        hold(2.2),
    ]


def act_ending() -> list[Step]:
    return [
        Play(seconds=0.9, moves=[CaptionOut(), EndingIn(ending=ENDING)], ease=ease_out_quint),
        hold(2.4),
    ]


async def _git(repository: Path, *arguments: str) -> str:
    process = await asyncio.create_subprocess_exec(*GIT, *arguments, cwd=repository, stdout=asyncio.subprocess.PIPE)
    out, _ = await process.communicate()
    return out.decode()


def _write(root: Path, files: dict[str, str]) -> None:
    for path, text in files.items():
        (root / path).parent.mkdir(parents=True, exist_ok=True)
        (root / path).write_text(text)


async def demo_repository(root: Path) -> str:
    """The demo change in a repository of its own; returns git's count of it, as the agent says it."""
    await asyncio.to_thread(_write, root, demo.COMMITTED)
    await _git(root, "init", "-q")
    await _git(root, "add", ".")
    await _git(root, "commit", "-q", "-m", REPOSITORY)
    await asyncio.to_thread(_write, root, demo.CHANGED)
    await _git(root, "add", "-N", ".")
    counted = [row.split("\t") for row in (await _git(root, "diff", "--numstat")).splitlines()]
    added = sum(int(row[0]) for row in counted)
    removed = sum(int(row[1]) for row in counted)
    return f"✓ {len(counted)} files changed  +{added} -{removed}"


class Guide(BaseModel):
    """A reader shown around already: no welcome, no introduction to stories over the page."""

    seen_release: str = "1.6.0"
    story_introduced: bool = True


class Settings(BaseModel):
    """A reader whose story is written as soon as it is asked for, with no question first."""

    story_writing: str = "without_asking"


async def _put(address: str, route: str, body: BaseModel) -> None:
    request = urllib.request.Request(  # noqa: S310 - the review's own server, on this machine
        f"{address}{route}", data=body.model_dump_json().encode(), method="PUT", headers=JSON_HEADERS
    )
    await asyncio.to_thread(urllib.request.urlopen, request)


async def _address_announced(server: asyncio.subprocess.Process) -> str:
    """Where the review is, as it says once it is served."""
    while server.stderr is not None:
        line = (await server.stderr.readline()).decode()
        if line.startswith(READY):
            return line.removeprefix(READY).strip()
    message = f"{REVIEW} ended before it said where it is"
    raise RuntimeError(message)


async def _drained(server: asyncio.subprocess.Process) -> None:
    """The rest of what the server says, read and dropped: a full pipe would stop it."""
    while server.stderr is not None and await server.stderr.readline():
        pass


class Stories(Production):
    def __init__(self) -> None:
        self.agent: Agent | None = None
        self.count = ""

    @property
    @override
    def film_format(self) -> Format:
        return SQUARE

    @override
    def served(self) -> AbstractAsyncContextManager[str]:
        return self._served()

    @asynccontextmanager
    async def _served(self) -> AsyncGenerator[str]:
        scratch = Path(tempfile.mkdtemp(prefix="livereel-stories-"))
        environment = {
            **os.environ,
            "XDG_CONFIG_HOME": str(scratch / "config"),
            "XDG_STATE_HOME": str(scratch / "state"),
        }
        self.count = await demo_repository(scratch / REPOSITORY)
        server = await asyncio.create_subprocess_exec(
            REVIEW, "diff", "--port", "0", "--no-open",
            cwd=scratch / REPOSITORY, env=environment, stderr=asyncio.subprocess.PIPE,
        )  # fmt: skip
        draining: asyncio.Task[None] | None = None
        try:
            address = await _address_announced(server)
            draining = asyncio.create_task(_drained(server))
            await _put(address, GUIDE_ROUTE, Guide())
            await _put(address, SETTINGS_ROUTE, Settings())
            self.agent = Agent(address.rsplit(":", 1)[1].split("/")[0], environment, scratch)
            yield address
        finally:
            server.terminate()
            await asyncio.wait_for(server.wait(), SERVER_STOPS_WITHIN)
            if draining is not None:
                draining.cancel()
            shutil.rmtree(scratch, ignore_errors=True)

    @override
    async def ready(self, film: Film) -> None:
        await film.app.locator(STORY_BUTTON).wait_for()
        await self._the_agent().attach()

    @override
    def steps(self, film: Film) -> list[Step]:
        whole = film.whole()
        agent = self._the_agent()
        return [
            *act_terminal(self.count),
            *act_lost(whole),
            *act_hint(agent),
            *act_chapters(whole),
            *act_brief(),
            *act_chunks(),
            *act_question(agent),
            *act_ending(),
        ]

    def _the_agent(self) -> Agent:
        if self.agent is None:
            message = "the agent is played once the review is served"
            raise RuntimeError(message)
        return self.agent


PRODUCTION = Stories()
