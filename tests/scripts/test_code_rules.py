"""The check of the code rules no linter here keeps, run as the hook runs it, on a file of its own."""

import subprocess
import sys
from pathlib import Path
from textwrap import dedent

CHECK = Path(__file__).parents[2] / "scripts" / "check_code_rules.py"
RULE_BROKEN = 1
ALL_KEPT = 0

BROKEN = """
    import copy

    import click


    def outer(names: list[str]) -> list[str]:
        def tidy(name: str) -> str:
            return name.strip()

        return [tidy(name) for name in names]


    def total(values: list[int]) -> int:
        s = 0
        return s


    def moved(pose: Pose) -> Pose:
        return pose.model_copy(update={"zoom": 2})


    def written(pose: Pose) -> dict:
        return copy.replace(pose, zoom=2).model_dump()


    @click.command()
    def shoot(film: str) -> None:
        return None
"""

KEPT = """
    import click


    class Pose:
        def looking(self, id: str) -> str:
            _, ok = id.partition(":")[0], True
            return str(ok)


    def lengths(names: list[str]) -> list[int]:
        return sorted(map(lambda name: len(name), names))


    @click.command()
    def shoot(*, film: str) -> None:
        return None
"""


def checked(directory: Path, source: str) -> subprocess.CompletedProcess[str]:
    file = directory / "checked.py"
    file.write_text(dedent(source))
    return subprocess.run(
        [sys.executable, str(CHECK), str(file)], capture_output=True, text=True, cwd=directory, check=False
    )


def test_every_rule_broken_is_named_where_it_is(tmp_path: Path) -> None:
    run = checked(tmp_path, BROKEN)

    # Each place as its line and the name it is told by: `checked.py:8: `tidy` is defined inside another function`
    said = [(line.split(":")[1], line.split("`")[1]) for line in run.stdout.splitlines()]
    assert (run.returncode, said) == (
        RULE_BROKEN,
        [
            ("8", "tidy"),
            ("15", "s"),
            ("20", "model_copy"),
            ("24", "model_dump"),
            ("24", "copy.replace"),
            ("28", "shoot"),
        ],
    )


def test_methods_lambdas_short_words_the_throwaway_and_commands_by_name_pass(tmp_path: Path) -> None:
    run = checked(tmp_path, KEPT)

    assert (run.returncode, run.stdout) == (ALL_KEPT, "")
