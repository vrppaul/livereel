"""Check the code rules no linter here can be told to keep.

No function is defined inside another: a helper is a function of its
module, with a name and parameters of its own, not a closure in the body of
something else. A lambda is still allowed where a short one does.

No name is too short to say what it holds: `index`, not `i`; `error`, not
`e`. A few words are short and still say what they mean, and `_` says that
nothing is kept.

No model is taken apart into its fields by name, or put together from them:
a model made from another is made by a method of the model, which calls its
constructor with every field written out, where a type checker reads the
names. So pydantic's `model_copy`, `model_construct` and `model_dump`, its
`from_attributes` as a keyword or a mapping's key, and Python's `__dict__`,
`vars` and `copy.replace` are not used. A model leaves as JSON
(`model_dump_json`), never as a mapping. The check knows these by name
alone: a model handed to `dict(…)`, or walked field by field, is past what
it sees, and the rule holds there all the same.

A command of the command line takes every value by name, after `*`: click
hands its values over by name. A function is taken for a command by a
decorator that calls `command` or `group`, of click or of a group.

This is claude-review's check (its `scripts/check_code_rules.py`), less
what holds that project's own parts alone.

Run on files or directories, in the project's own environment:

    uv run python scripts/check_code_rules.py src scripts examples

Prints each place that breaks a rule and exits 1, or says nothing and exits 0.
"""

import ast
import sys
from pathlib import Path

from pydantic import BaseModel, ConfigDict

# Shorter than this, a name abbreviates what it holds rather than saying it
SHORTEST_NAME = 3
# Shorter than that, and still whole words; matched whatever their case
SHORT_WORDS = frozenset({"_", "id", "at", "to", "ok", "of", "on", "by", "is"})
PYTHON_FILES = "*.py"
FUNCTIONS = (ast.FunctionDef, ast.AsyncFunctionDef)
DEFINED_INSIDE = "`{name}` is defined inside another function"
TOO_SHORT = "`{name}` is too short to say what it holds"
# What takes a model apart into its fields by name, or puts one together from them, and what is said of each
FIELDS_BY_NAME = {
    "model_copy": "`model_copy` copies a model past its constructor, unchecked: the model makes its own copy",
    "model_construct": "`model_construct` builds a model unchecked, from names in text: build it by its constructor",
    "model_dump": "`model_dump` writes a model out as a mapping: hand the model on, or write it as JSON",
    "__dict__": "`__dict__` reads an object's fields as a mapping, by name: read the fields it has",
}
READ_BY_SHARED_NAMES = "from_attributes"
SHARED_NAMES_READ = (
    "`from_attributes` reads a model off another by the names the two share: build it by its constructor"
)
FIELDS_OF = "vars"
VARS_READ = "`vars` reads an object's fields as a mapping, by name: read the fields it has"
COPY_MODULE = "copy"
REPLACING = "replace"
REPLACED_BY_NAME = "`copy.replace` copies an object by the names of its fields: build it by its constructor"
COMMAND_DECORATORS = frozenset({"command", "group"})
BY_POSITION = "`{name}` is a command that takes a value by position: click hands every value over by name, after `*`"
# What the process exits with
ALL_KEPT = 0
RULE_BROKEN = 1


class GivenName(BaseModel):
    """A name given to something, and the line it is given on."""

    model_config = ConfigDict(frozen=True)

    name: str
    line: int


class Said(BaseModel):
    """What a rule says of a node that breaks it, and the line the node is on."""

    model_config = ConfigDict(frozen=True)

    line: int
    says: str


class Breach(BaseModel):
    """One place that breaks a rule, and what it does."""

    model_config = ConfigDict(frozen=True)

    path: Path
    line: int
    says: str

    def __str__(self) -> str:
        return f"{self.path}:{self.line}: {self.says}"


def breaches_in(path: Path) -> list[Breach]:
    """Every place in one file that breaks a rule, in the order they are found."""
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    found: list[Breach] = []
    _look_inside(tree, path, _names_of_the_copy_module(tree), inside_function=False, found=found)
    return found


def _names_of_the_copy_module(tree: ast.AST) -> frozenset[str]:
    """Every name a file's imports give the module `copy`, wherever in the file it is imported."""
    return frozenset(
        imported.asname or imported.name
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        for imported in node.names
        if imported.name == COPY_MODULE
    )


def _look_inside(
    node: ast.AST, path: Path, copy_module_names: frozenset[str], *, inside_function: bool, found: list[Breach]
) -> None:
    """Check everything under a node, knowing whether it already sits in a function."""
    for child in ast.iter_child_nodes(node):
        said = [
            *_said_of_a_function_inside(child, inside_function=inside_function),
            *_said_of_a_short_name(child),
            *_said_of_fields_by_name(child, copy_module_names),
            *_said_of_a_command_by_position(child),
        ]
        found.extend(Breach(path=path, line=one.line, says=one.says) for one in said)
        inside = inside_function or isinstance(child, FUNCTIONS)
        _look_inside(child, path, copy_module_names, inside_function=inside, found=found)


def _said_of_a_function_inside(node: ast.AST, *, inside_function: bool) -> list[Said]:
    match node:
        case ast.FunctionDef(name=name) | ast.AsyncFunctionDef(name=name) if inside_function:
            return [Said(line=node.lineno, says=DEFINED_INSIDE.format(name=name))]
        case _:
            return []


def _said_of_a_short_name(node: ast.AST) -> list[Said]:
    given = _name_given(node)
    if given is None or not _too_short(given.name):
        return []
    return [Said(line=given.line, says=TOO_SHORT.format(name=given.name))]


def _said_of_fields_by_name(node: ast.AST, copy_module_names: frozenset[str]) -> list[Said]:
    """What is said of a node that takes a model apart by the names of its fields, or puts one together from them."""
    match node:
        case ast.Attribute(value=ast.Name(id=module), attr=name) if module in copy_module_names and name == REPLACING:
            return [Said(line=node.lineno, says=REPLACED_BY_NAME)]
        case ast.ImportFrom(module=module, names=names, level=0) if module == COPY_MODULE and any(
            alias.name == REPLACING for alias in names
        ):
            return [Said(line=node.lineno, says=REPLACED_BY_NAME)]
        case ast.Attribute(attr=name) if name in FIELDS_BY_NAME:
            return [Said(line=node.lineno, says=FIELDS_BY_NAME[name])]
        case ast.keyword(arg=name) if name == READ_BY_SHARED_NAMES:
            return [Said(line=node.lineno, says=SHARED_NAMES_READ)]
        case ast.Dict(keys=keys) if any(
            isinstance(key, ast.Constant) and key.value == READ_BY_SHARED_NAMES for key in keys
        ):
            return [Said(line=node.lineno, says=SHARED_NAMES_READ)]
        case ast.Name(id=name) if name == FIELDS_OF:
            return [Said(line=node.lineno, says=VARS_READ)]
        case _:
            return []


def _said_of_a_command_by_position(node: ast.AST) -> list[Said]:
    match node:
        case ast.FunctionDef(name=name, args=arguments) | ast.AsyncFunctionDef(name=name, args=arguments) if (
            _is_a_command(node) and [*arguments.posonlyargs, *arguments.args]
        ):
            return [Said(line=node.lineno, says=BY_POSITION.format(name=name))]
        case _:
            return []


def _is_a_command(function: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    """Whether a decorator of a function calls `command` or `group`, of click or of a group."""
    return any(
        isinstance(decorator, ast.Call)
        and isinstance(decorator.func, ast.Attribute)
        and decorator.func.attr in COMMAND_DECORATORS
        for decorator in function.decorator_list
    )


def _name_given(node: ast.AST) -> GivenName | None:
    """The name a node gives to something — a variable, a parameter, a function, a class, an import — if any."""
    match node:
        case (
            ast.Name(id=name, ctx=ast.Store())
            | ast.Attribute(attr=name, ctx=ast.Store())
            | ast.arg(arg=name)
            | ast.FunctionDef(name=name)
            | ast.AsyncFunctionDef(name=name)
            | ast.ClassDef(name=name)
            | ast.ExceptHandler(name=str() as name)
            | ast.alias(asname=str() as name)
            | ast.MatchAs(name=str() as name)
            | ast.MatchStar(name=str() as name)
        ):
            return GivenName(name=name, line=node.lineno)
        case _:
            return None


def _too_short(name: str) -> bool:
    return len(name) < SHORTEST_NAME and name.lower() not in SHORT_WORDS


def _python_files(places: list[str]) -> list[Path]:
    """The Python files named, and those under the directories named."""
    files: list[Path] = []
    for place in map(Path, places):
        files.extend(sorted(place.rglob(PYTHON_FILES)) if place.is_dir() else [place])
    return files


def main(places: list[str]) -> int:
    breaches = [breach for path in _python_files(places) for breach in breaches_in(path)]
    for breach in breaches:
        print(breach)
    return RULE_BROKEN if breaches else ALL_KEPT


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
