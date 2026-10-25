"""What the stage draws on one frame: where the camera looks, what is in the light, and what lies over the page.

A scene is numbers and words alone. The moves of a film change it frame by
frame; the stage (`stage/stage.js`) draws it as it is handed over, as JSON,
and decides nothing.
"""

from enum import StrEnum, auto

from pydantic import BaseModel, ConfigDict, computed_field

from livereel.easing import between, ease_out_cubic
from livereel.geometry import Box, Format

# How hard the rest of the page is dimmed around a block in the light, and how far the light reaches past it
LIGHT_DIM = 0.62
LIGHT_PAD = 4.0
# How many words of a caption are on their way up at once, and how much faster than the words the ground darkens
WORDS_AT_ONCE = 3
GROUND_DARKENS_FASTER = 2
# What the terminal shows before a line the person typed, and what parts a tool's name from what it is used on
PROMPT = ">"
SPACE = " "


class Pose(BaseModel):
    """Where the camera looks: the point of the screen at the frame's middle, how close, and at what angle.

    `tilt` leans the screen back from its top edge, `turn` swings it about its
    middle; both in degrees, 0 face-on.
    """

    model_config = ConfigDict(frozen=True)

    focus_x: float
    focus_y: float
    zoom: float = 1.0
    tilt: float = 0.0
    turn: float = 0.0

    @classmethod
    def whole(cls, film_format: Format) -> Pose:
        """Face-on, the whole screen as large as the frame holds it."""
        frame, screen = film_format.frame, film_format.screen
        zoom = min(frame.width / screen.width, frame.height / screen.height)
        return cls(focus_x=screen.width / 2, focus_y=screen.height / 2, zoom=zoom)

    @property
    def face_on(self) -> bool:
        return self.tilt == 0 and self.turn == 0

    def toward(self, other: Pose, progress: float) -> Pose:
        """This pose `progress` of the way to the other."""
        return Pose(
            focus_x=between(self.focus_x, other.focus_x, progress),
            focus_y=between(self.focus_y, other.focus_y, progress),
            zoom=between(self.zoom, other.zoom, progress),
            tilt=between(self.tilt, other.tilt, progress),
            turn=between(self.turn, other.turn, progress),
        )

    def looking_at(self, focus_x: float, focus_y: float, zoom: float) -> Pose:
        """The same angle, looking at another point from another distance."""
        return Pose(focus_x=focus_x, focus_y=focus_y, zoom=zoom, tilt=self.tilt, turn=self.turn)

    def angled(self, tilt: float, turn: float) -> Pose:
        """The same point and distance, at another angle."""
        return Pose(focus_x=self.focus_x, focus_y=self.focus_y, zoom=self.zoom, tilt=tilt, turn=turn)


class Light(BaseModel):
    """One block of the page in the light, the rest dimmed as far as `strength` goes, from 0 to 1."""

    box: Box
    strength: float = 0.0
    dim: float = LIGHT_DIM
    pad: float = LIGHT_PAD


class Cursor(BaseModel):
    """The pointer's tip on the screen; `press` is how far it is pressed in, from 0 to 1."""

    left: float
    top: float
    press: float = 0.0


class Word(BaseModel):
    """A word of a caption, and how far it has come up, eased, from 0 to 1."""

    model_config = ConfigDict(frozen=True)

    text: str
    appeared: float


class Caption(BaseModel):
    """Words over the frame: how far they have come up, and how far they have gone, each from 0 to 1.

    The words come up one after another, each over the share of the whole that
    `WORDS_AT_ONCE` words take, so several are on their way at a time; the
    ground under them darkens twice as fast as they come.
    """

    text: str
    shown: float = 0.0
    gone: float = 0.0

    @computed_field
    @property
    def words(self) -> list[Word]:
        spoken = self.text.split()
        share = WORDS_AT_ONCE / (len(spoken) + WORDS_AT_ONCE - 1)
        return [
            Word(text=word, appeared=ease_out_cubic(_share_of(self.shown, (place / len(spoken)) * (1 - share), share)))
            for place, word in enumerate(spoken)
        ]

    @computed_field
    @property
    def ground(self) -> float:
        """How dark the ground under the caption is, from 0 to 1."""
        return min(1.0, self.shown * GROUND_DARKENS_FASTER) * (1 - self.gone)


def _share_of(progress: float, start: float, length: float) -> float:
    """How far along a part of a whole is, the whole `progress` along: none before the part's start, all after it."""
    return min(1.0, max(0.0, (progress - start) / length))


class LineKind(StrEnum):
    """What a line of the agent's terminal is."""

    ASKED = auto()
    WORK = auto()
    SAID = auto()
    DONE = auto()
    THINKING = auto()


class TerminalLine(BaseModel):
    model_config = ConfigDict(frozen=True)

    kind: LineKind
    text: str


class ShownLine(BaseModel):
    """A line of the terminal as the stage draws it: its kind, what leads it set apart, and the rest."""

    model_config = ConfigDict(frozen=True)

    kind: LineKind
    lead: str
    text: str


class Terminal(BaseModel):
    """An agent's terminal drawn on the stage: its log above the line being typed."""

    title: str
    lines: list[TerminalLine] = []
    typed: str = ""
    caret: bool = True
    spinner: str = ""
    # As it gives way to what comes after it: 0 standing, 1 gone
    leaving: float = 0.0

    @computed_field
    @property
    def shown(self) -> list[ShownLine]:
        """Each line as it is drawn: what was asked after its prompt, a tool's name apart, the spinner while working."""
        return [self._shown(line) for line in self.lines]

    def _shown(self, line: TerminalLine) -> ShownLine:
        match line.kind:
            case LineKind.ASKED:
                return ShownLine(kind=line.kind, lead=PROMPT, text=line.text)
            case LineKind.THINKING:
                return ShownLine(kind=line.kind, lead=self.spinner, text=line.text)
            case LineKind.WORK:
                tool, _, used_on = line.text.partition(SPACE)
                return ShownLine(kind=line.kind, lead=tool, text=used_on)
            case LineKind.SAID | LineKind.DONE:
                return ShownLine(kind=line.kind, lead="", text=line.text)


class Ending(BaseModel):
    """The last card: a name, a line on what it is, and the command that starts it."""

    name: str
    line: str
    command: str
    shown: float = 0.0


class Scene(BaseModel):
    pose: Pose
    # How far the screen has come up, from 0 to 1: a film may open on the ground alone
    screen_shown: float = 1.0
    light: Light | None = None
    cursor: Cursor | None = None
    caption: Caption | None = None
    terminal: Terminal | None = None
    ending: Ending | None = None

    def posed(self, pose: Pose) -> Scene:
        """The same scene seen from another pose."""
        return Scene(
            pose=pose,
            screen_shown=self.screen_shown,
            light=self.light,
            cursor=self.cursor,
            caption=self.caption,
            terminal=self.terminal,
            ending=self.ending,
        )
