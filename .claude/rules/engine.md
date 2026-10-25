---
paths:
  - "src/livereel/*.py"
  - "src/livereel/moves/*.py"
---

# The engine and the command line

How a module is built is said in its docstring. The stage has its own rules, `.claude/rules/stage.md`.

## Python

- Write Python 3.14: type parameter syntax, `match`, `str | None`, `list[X]`.
- Every function signature carries type hints.
- All I/O is `async` and awaited: no blocking call. A file written from a coroutine goes through `asyncio.to_thread`.
- A model is a Pydantic model, never a plain dataclass. A model made from another is made by a method of the model that writes every field out (`Pose.toward`, `Scene.posed`).
- No model is taken apart into its fields by name: `scripts/check_code_rules.py` refuses `model_copy`, `model_construct`, `model_dump`, `__dict__`, `vars` and `copy.replace`. A model leaves for the stage as JSON (`model_dump_json`).
- What the page answers with shape is read through a model (`ScrollCourse`, `BOXES_READ`), never used as a raw mapping.
- An interface is an abstract class (`ABC`), never a `typing.Protocol`; every member is `@abstractmethod`, every implementation marks its methods `@override`.
- Every `**/__init__.py` is empty.
- Raise and catch a specific exception, never `Exception`.

## Time and the frame

- A frame is a moment of the film, `shot / FPS` seconds in, whatever the browser took: nothing reads the wall clock.
- A move sets its part of the scene from how far along it is, already eased, and from what it read as its step began: never from the frame before.
- Only an `Act` changes the page itself; a `Play` changes the scene and, for the page's own scroll or keys, does what that frame wants done.
- The page's own motion stays stilled (reduced motion): every move in a film is the film's.
- The stage is handed numbers and words and decides nothing; a choice about what is shown is made here, in Python.

## The command line

- A click command takes its options keyword-only (`*`): `scripts/check_code_rules.py` refuses one that takes a value by position.
- What the command line says goes through `click.echo`; nothing else prints.
