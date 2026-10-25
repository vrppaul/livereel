---
paths:
  - "scripts/*.py"
---

# The scripts

The gates of our own, which no linter here can be told to keep. How each is built is said in its docstring.

- A script's docstring says why it exists and how it is run, what it prints and every code it exits with.
- It is run in the repository's root and does its whole job in one process start.
- It is written as the package is: ruff, ty, vulture and `scripts/check_code_rules.py` read it, but that a script may print.
- A gate taken from claude-review says so in its docstring, and what it left out.
- A gate's test runs it as it is run: as a process (`tests/scripts/test_code_rules.py`).
