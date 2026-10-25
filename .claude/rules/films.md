---
paths:
  - "examples/**/*.py"
---

# Films

A film is a Python file that names its `PRODUCTION`, a `Production` of `src/livereel/studio.py`. How a film is directed — story, storyboard, shots, checks — is the skill's, `skills/reel/SKILL.md`.

- A film is written as the package is: the same gates read it.
- A step's timing, framing and rhythm — `seconds`, `air`, `zoom_at_most`, `within`, a typing's `seed` and `pace` — are the film's script, given by keyword where they are used; any other literal with a meaning is named at the top.
- Every place on the page a film looks at is a named selector at the top of the file: a test id or a role where the page has one, never a class.
- A film is split into acts, a function each, that return their steps; `steps` only puts the acts in order.
- What changes at once is a named function handed to `Cut`; what the page does is a named coroutine handed to `Act`.
- A film that serves its own page starts and stops it in `served`, and leaves nothing running when it ends.
- A film's data — a change, a story, the words typed — lives in a module of its own beside it, as data alone.
