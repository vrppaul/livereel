"""The change the film shows: rate limits for a small search service, told as a story.

Data alone: the files as committed, the files as the change leaves them, and
the story the review's `story` command takes. A step's lines are found by the
text they start and end at, so editing a file never leaves a story pointing at
the wrong lines.
"""

COMMITTED = {
    "app/__init__.py": '"""A small search service."""\n',
    "app/api.py": '''"""The HTTP face of search."""

from flask import Flask, jsonify, request

from app import admin as operators
from app.config import Settings
from app.search import find

app = Flask(__name__)
settings = Settings.from_environment()
app.register_blueprint(operators.admin)


@app.get("/search")
def search():
    query = request.args.get("q", "")
    if not query:
        return jsonify(error="empty query"), 400
    return jsonify(results=find(query, limit=settings.page_size))


@app.get("/health")
def health():
    return jsonify(status="ok")
''',
    "app/config.py": '''"""Settings, read once from the environment."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    page_size: int

    @classmethod
    def from_environment(cls) -> "Settings":
        return cls(page_size=int(os.environ.get("SEARCH_PAGE_SIZE", "20")))
''',
    "app/errors.py": '''"""Errors the API turns into answers."""


class SearchError(Exception):
    """Something went wrong while searching."""
''',
    "app/metrics.py": '''"""Counters the service exposes."""

from prometheus_client import Counter

searches = Counter("searches_total", "Searches answered")
''',
    "app/search.py": '''"""Finding what was asked for."""


def find(query: str, limit: int) -> list[str]:
    return [query][:limit]
''',
    "tests/test_api.py": """from app.api import app


def test_an_empty_query_is_refused():
    client = app.test_client()
    assert client.get("/search?q=").status_code == 400


def test_health_answers_ok():
    client = app.test_client()
    assert client.get("/health").json == {"status": "ok"}
""",
    "README.md": """# search

A small search service.

## Run

    flask --app app.api run

## Settings

| Variable | Default | What it sets |
|---|---|---|
| `SEARCH_PAGE_SIZE` | 20 | Results per page |
""",
    "CHANGELOG.md": """# Changelog

## 0.3.0

- Search answers in pages of `SEARCH_PAGE_SIZE`.
""",
    "settings.example.toml": """[search]
page_size = 20
""",
    "pyproject.toml": """[project]
name = "search"
version = "0.3.0"
requires-python = ">=3.12"
dependencies = ["flask>=3.0", "prometheus-client>=0.20"]
""",
    "app/admin.py": '''"""What an operator may do to a running service."""

from flask import Blueprint, jsonify

admin = Blueprint("admin", __name__, url_prefix="/admin")


@admin.get("/status")
def status():
    return jsonify(status="ok")
''',
    "app/logging.py": '''"""How the service writes its log."""

import logging

log = logging.getLogger("search")


def searched(query: str, results: int) -> None:
    log.info("searched %r: %d results", query, results)
''',
    "tests/test_admin.py": """from app.api import app


def test_status_answers_ok():
    client = app.test_client()
    assert client.get("/admin/status").json == {"status": "ok"}
""",
    "tests/conftest.py": """import pytest

from app.api import app


@pytest.fixture
def client():
    return app.test_client()
""",
    "docs/api.md": """# API

## GET /search?q=

Answers `{"results": [...]}`, at most `SEARCH_PAGE_SIZE` of them.

| Status | When |
|---|---|
| 200 | Always, but for an empty query |
| 400 | The query is empty |
""",
    "docs/operations.md": """# Operations

## Metrics

`searches_total` counts the searches answered.

## Logs

Each search is logged at INFO with its query and how many results it found.
""",
    "deploy/config.env": """SEARCH_PAGE_SIZE=20
""",
}

CHANGED = {
    "app/api.py": '''"""The HTTP face of search."""

from flask import Flask, jsonify, request

from app import admin as operators
from app.clients import client_key
from app.config import Settings
from app.errors import TooManyRequests
from app.limits import Limits
from app.logging import refused as log_refusal
from app.metrics import refused
from app.middleware import tell_remaining
from app.search import find

app = Flask(__name__)
settings = Settings.from_environment()
limits = Limits(rate=settings.rate_per_second, burst=settings.burst)
operators.limits = limits
app.register_blueprint(operators.admin)
tell_remaining(app, limits)


@app.errorhandler(TooManyRequests)
def too_many(error: TooManyRequests):
    response = jsonify(error="slow down", retry_after=error.retry_after)
    response.headers["Retry-After"] = str(error.retry_after)
    return response, 429


@app.get("/search")
def search():
    client = client_key(request)
    bucket = limits.bucket_of(client)
    if not bucket.take():
        retry_after = max(1, round(bucket.seconds_to_next()))
        refused.inc()
        log_refusal(client, retry_after)
        raise TooManyRequests(retry_after=retry_after)
    query = request.args.get("q", "")
    if not query:
        return jsonify(error="empty query"), 400
    return jsonify(results=find(query, limit=settings.page_size))


@app.get("/health")
def health():
    return jsonify(status="ok")
''',
    "app/config.py": '''"""Settings, read once from the environment."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    page_size: int
    rate_per_second: float
    burst: int

    @classmethod
    def from_environment(cls) -> "Settings":
        return cls(
            page_size=int(os.environ.get("SEARCH_PAGE_SIZE", "20")),
            rate_per_second=float(os.environ.get("SEARCH_RATE", "5")),
            burst=int(os.environ.get("SEARCH_BURST", "10")),
        )
''',
    "app/errors.py": '''"""Errors the API turns into answers."""


class SearchError(Exception):
    """Something went wrong while searching."""


class TooManyRequests(Exception):
    """A client asked faster than its bucket refills."""

    def __init__(self, retry_after: int) -> None:
        super().__init__(f"retry after {retry_after} s")
        self.retry_after = retry_after
''',
    "app/metrics.py": '''"""Counters the service exposes."""

from prometheus_client import Counter

searches = Counter("searches_total", "Searches answered")
refused = Counter("searches_refused_total", "Searches refused by the rate limit")
''',
    "app/limits.py": '''"""How often one client may search: a bucket of tokens per client."""

import time
from dataclasses import dataclass, field


@dataclass
class TokenBucket:
    """Tokens refill at `rate` a second, up to `burst`; each request takes one."""

    rate: float
    burst: int
    tokens: float = field(init=False)
    updated: float = field(init=False, default_factory=time.monotonic)

    def __post_init__(self) -> None:
        self.tokens = float(self.burst)

    def take(self) -> bool:
        now = time.monotonic()
        self.tokens = min(self.burst, self.tokens + (now - self.updated) * self.rate)
        self.updated = now
        if self.tokens < 1:
            return False
        self.tokens -= 1
        return True

    def seconds_to_next(self) -> float:
        """How long until one more request would be let through."""
        return max(0.0, (1 - self.tokens) / self.rate)


class Limits:
    """One bucket per client, made on its first request."""

    def __init__(self, rate: float, burst: int) -> None:
        self.rate = rate
        self.burst = burst
        self.buckets: dict[str, TokenBucket] = {}

    def bucket_of(self, client: str) -> TokenBucket:
        return self.buckets.setdefault(client, TokenBucket(self.rate, self.burst))
''',
    "app/clients.py": '''"""Who is asking: the key a request is limited by."""

from flask import Request

API_KEY_HEADER = "X-Api-Key"


def client_key(request: Request) -> str:
    """The API key when the request carries one, else the address it came from."""
    api_key = request.headers.get(API_KEY_HEADER)
    if api_key:
        return f"key:{api_key}"
    return f"address:{request.remote_addr}"
''',
    "tests/test_api.py": """from app.api import app


def test_an_empty_query_is_refused():
    client = app.test_client()
    assert client.get("/search?q=").status_code == 400


def test_health_answers_ok():
    client = app.test_client()
    assert client.get("/health").json == {"status": "ok"}


def test_a_burst_past_the_limit_is_answered_429():
    client = app.test_client()
    answers = [client.get("/search?q=cats").status_code for _ in range(11)]
    assert answers[-1] == 429


def test_429_says_when_to_retry():
    client = app.test_client()
    for _ in range(11):
        answer = client.get("/search?q=dogs")
    assert int(answer.headers["Retry-After"]) >= 1
""",
    "tests/test_limits.py": """from app.limits import Limits, TokenBucket


def test_a_new_bucket_lets_a_whole_burst_through():
    bucket = TokenBucket(rate=5, burst=10)
    assert all(bucket.take() for _ in range(10))


def test_a_bucket_refuses_once_empty():
    bucket = TokenBucket(rate=5, burst=10)
    for _ in range(10):
        bucket.take()
    assert not bucket.take()


def test_an_empty_bucket_says_how_long_to_wait():
    bucket = TokenBucket(rate=5, burst=1)
    bucket.take()
    assert 0 < bucket.seconds_to_next() <= 0.2


def test_each_client_has_a_bucket_of_its_own():
    limits = Limits(rate=5, burst=10)
    assert limits.bucket_of("a") is not limits.bucket_of("b")
""",
    "tests/test_clients.py": """from flask import request

from app.api import app
from app.clients import client_key


def test_an_api_key_wins_over_the_address():
    with app.test_request_context(headers={"X-Api-Key": "k1"}):
        assert client_key(request) == "key:k1"


def test_without_a_key_the_address_is_the_client():
    with app.test_request_context(environ_base={"REMOTE_ADDR": "10.0.0.7"}):
        assert client_key(request) == "address:10.0.0.7"
""",
    "README.md": """# search

A small search service.

## Run

    flask --app app.api run

## Settings

| Variable | Default | What it sets |
|---|---|---|
| `SEARCH_PAGE_SIZE` | 20 | Results per page |
| `SEARCH_RATE` | 5 | Searches a second, per client |
| `SEARCH_BURST` | 10 | Searches a client may make at once |

## Rate limits

Each client may search `SEARCH_RATE` times a second, with bursts of up to
`SEARCH_BURST`. Past that, `/search` answers 429 with a `Retry-After` header.
See [docs/rate-limits.md](docs/rate-limits.md).
""",
    "CHANGELOG.md": """# Changelog

## 0.4.0

- Each client is rate-limited: 5 searches a second, bursts of 10. Past that,
  `/search` answers 429 and says when to retry.

## 0.3.0

- Search answers in pages of `SEARCH_PAGE_SIZE`.
""",
    "docs/rate-limits.md": """# Rate limits

Search keeps a bucket of tokens for each client. A bucket holds up to
`SEARCH_BURST` tokens and refills at `SEARCH_RATE` tokens a second; each
search takes one. An empty bucket means a 429.

## Who is a client

A request with an `X-Api-Key` header is limited by its key; any other, by the
address it came from. Clients behind one proxy share an address, so give them
keys.

## What a refused client sees

    HTTP/1.1 429 Too Many Requests
    Retry-After: 1

    {"error": "slow down", "retry_after": 1}

## Watching it

`searches_refused_total` counts the searches the limit refused.
""",
    "settings.example.toml": """[search]
page_size = 20
rate = 5
burst = 10
""",
    "pyproject.toml": """[project]
name = "search"
version = "0.4.0"
requires-python = ">=3.12"
dependencies = ["flask>=3.0", "prometheus-client>=0.20"]
""",
    "app/__init__.py": '"""A small search service."""\n\n__version__ = "0.4.0"\n',
    "app/admin.py": '''"""What an operator may do to a running service."""

from flask import Blueprint, jsonify

from app.limits import Limits

admin = Blueprint("admin", __name__, url_prefix="/admin")
limits: Limits | None = None


@admin.get("/status")
def status():
    return jsonify(status="ok")


@admin.delete("/limits/<client>")
def forgive(client: str):
    """Give a client a full bucket again, as if it had never searched."""
    if limits is not None:
        limits.buckets.pop(client, None)
    return "", 204
''',
    "app/logging.py": '''"""How the service writes its log."""

import logging

log = logging.getLogger("search")


def searched(query: str, results: int) -> None:
    log.info("searched %r: %d results", query, results)


def refused(client: str, retry_after: int) -> None:
    log.warning("refused %s: retry after %d s", client, retry_after)
''',
    "app/middleware.py": '''"""What every answer says of the limit: how many searches the client has left."""

from flask import Flask, Response, request

from app.clients import client_key
from app.limits import Limits

REMAINING_HEADER = "X-RateLimit-Remaining"


def tell_remaining(app: Flask, limits: Limits) -> None:
    @app.after_request
    def remaining(response: Response) -> Response:
        if request.path == "/search":
            bucket = limits.bucket_of(client_key(request))
            response.headers[REMAINING_HEADER] = str(int(bucket.tokens))
        return response
''',
    "tests/test_admin.py": """from app.api import app


def test_status_answers_ok():
    client = app.test_client()
    assert client.get("/admin/status").json == {"status": "ok"}


def test_a_forgiven_client_searches_again(client):
    for _ in range(11):
        client.get("/search?q=cats")
    client.delete("/admin/limits/address:127.0.0.1")
    assert client.get("/search?q=cats").status_code == 200
""",
    "tests/conftest.py": '''import pytest

from app import api
from app.api import app


@pytest.fixture
def client():
    return app.test_client()


@pytest.fixture(autouse=True)
def fresh_limits():
    """Each test starts with every bucket full."""
    api.limits.buckets.clear()
''',
    "tests/test_middleware.py": """def test_a_search_says_how_many_are_left(client):
    answer = client.get("/search?q=cats")
    assert answer.headers["X-RateLimit-Remaining"] == "9"


def test_other_routes_say_nothing_of_the_limit(client):
    assert "X-RateLimit-Remaining" not in client.get("/health").headers
""",
    "docs/api.md": """# API

## GET /search?q=

Answers `{"results": [...]}`, at most `SEARCH_PAGE_SIZE` of them.

| Status | When |
|---|---|
| 200 | Always, but for an empty query or a client over its limit |
| 400 | The query is empty |
| 429 | The client searched faster than its limit; `Retry-After` says when to try again |

Every answer to a search carries `X-RateLimit-Remaining`: the searches the
client may still make at once.

## DELETE /admin/limits/{client}

Gives a client a full bucket again. Answers 204.
""",
    "docs/operations.md": """# Operations

## Metrics

`searches_total` counts the searches answered; `searches_refused_total`, the
searches the rate limit refused.

## Alerts

`deploy/alerts.yml` pages when more than one search in ten is refused for
five minutes: a client is flooding, or the limit is set too low.

## Logs

Each search is logged at INFO with its query and how many results it found;
each refusal at WARNING, with the client and when it may retry.
""",
    "deploy/alerts.yml": """groups:
  - name: search
    rules:
      - alert: SearchesRefused
        expr: |
          rate(searches_refused_total[5m])
            / rate(searches_total[5m]) > 0.1
        for: 5m
        labels:
          severity: page
        annotations:
          summary: More than one search in ten is refused by the rate limit
""",
    "deploy/config.env": """SEARCH_PAGE_SIZE=20
SEARCH_RATE=5
SEARCH_BURST=10
""",
    "scripts/load_test.py": '''"""Search as fast as one client can, and count the answers by status."""

import collections
import sys

import httpx

URL = "http://localhost:5000/search?q=load"


def main(requests: int) -> None:
    statuses = collections.Counter(httpx.get(URL).status_code for _ in range(requests))
    for status, count in sorted(statuses.items()):
        print(f"{status}: {count}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 50)
''',
}


def lines_of(path: str, first_text: str, last_text: str) -> str:
    """The lines of a changed file from the first holding one text to the next holding the other, as `a-b`."""
    rows = CHANGED[path].splitlines()
    first = next(row for row, line in enumerate(rows, start=1) if first_text in line)
    last = next(row for row, line in enumerate(rows, start=1) if row >= first and last_text in line)
    return f"{first}-{last}"


def whole(path: str) -> str:
    return f"1-{len(CHANGED[path].splitlines())}"


STORY = {
    "title": "Rate-limit search, per client",
    "told_from": "memory",
    "overview": {
        "task": "Stop one client from flooding /search: limit each client, let short bursts through.",
        "done": "Each client gets a bucket of tokens: 5 searches a second, bursts of 10. Past that, /search answers 429 and says when to retry; refusals are counted, logged and alerted on.",
        "doubt": "Buckets are never dropped: a client that never comes back keeps its bucket for the life of the process.",
        "decisions": [
            {
                "text": "A token bucket, not a fixed window: a burst at a window's edge cannot double the rate.",
                "chapter": "bucket",
            },
            {
                "text": "An API key wins over the address: clients behind one proxy would share a bucket.",
                "chapter": "client",
            },
        ],
    },
    "chapters": [
        {
            "id": "bucket",
            "title": "A bucket of tokens per client",
            "why": "The limit lives apart from the route, so it is tested without a server and the next route reuses it.",
            "steps": [
                {
                    "file": "app/limits.py",
                    "lines": lines_of("app/limits.py", "class TokenBucket", "return True"),
                    "reason": "Starts full, so a client's first burst is never refused; refills from the time passed, so nothing runs while nobody asks.",
                },
                {
                    "file": "app/limits.py",
                    "lines": lines_of("app/limits.py", "class Limits", "return self.buckets"),
                    "reason": "One bucket per client, made on its first request.",
                },
                {
                    "file": "tests/test_limits.py",
                    "lines": whole("tests/test_limits.py"),
                    "reason": "A burst, an empty bucket, the wait it names, two clients apart.",
                },
            ],
        },
        {
            "id": "client",
            "title": "Who counts as one client",
            "why": "An address is shared behind a proxy; a key is not.",
            "steps": [
                {
                    "file": "app/clients.py",
                    "lines": whole("app/clients.py"),
                    "reason": "The key when there is one, else the address.",
                },
                {
                    "file": "tests/test_clients.py",
                    "lines": whole("tests/test_clients.py"),
                    "reason": "Both ways a client is known.",
                },
            ],
        },
        {
            "id": "search",
            "title": "Search answers 429 when the bucket is empty",
            "why": "The route asks the bucket first and stops there: nothing is searched for a request it refuses.",
            "steps": [
                {
                    "file": "app/api.py",
                    "lines": lines_of("app/api.py", "client = client_key", "raise TooManyRequests"),
                    "reason": "Refused before the query is read: a flood costs one lookup.",
                },
                {
                    "file": "app/api.py",
                    "lines": lines_of("app/api.py", "@app.errorhandler", "return response, 429"),
                    "reason": "429 says when to come back, in the header clients already read.",
                },
                {
                    "file": "app/errors.py",
                    "lines": lines_of("app/errors.py", "class TooManyRequests", "self.retry_after = retry_after"),
                    "reason": "The wait travels with the error, so the handler needs nothing else.",
                },
                {
                    "file": "app/middleware.py",
                    "lines": whole("app/middleware.py"),
                    "reason": "Every search says how many are left, so a client can slow down before it is refused.",
                },
                {
                    "file": "app/config.py",
                    "lines": lines_of("app/config.py", "rate_per_second: float", "burst=int"),
                    "reason": "Rate and burst from the environment, 5 and 10 unless set.",
                },
                {
                    "file": "tests/conftest.py",
                    "lines": lines_of("tests/conftest.py", "@pytest.fixture(autouse=True)", "buckets.clear()"),
                    "reason": "Every test starts with full buckets: one test's searches never refuse the next one's.",
                },
                {
                    "file": "tests/test_api.py",
                    "lines": lines_of("tests/test_api.py", "def test_a_burst", "Retry-After"),
                    "reason": "A burst past the limit, and the wait it is told.",
                },
                {
                    "file": "tests/test_middleware.py",
                    "lines": whole("tests/test_middleware.py"),
                    "reason": "Searches say what is left; other routes say nothing.",
                },
            ],
        },
        {
            "id": "watch",
            "title": "Seeing it work, and undoing it",
            "why": "A limit set too low refuses honest clients: whoever runs the service must see refusals and forgive a client.",
            "steps": [
                {
                    "file": "app/metrics.py",
                    "lines": lines_of("app/metrics.py", "refused =", "refused ="),
                    "reason": "Refusals counted apart from searches, so their share can be watched.",
                },
                {
                    "file": "deploy/alerts.yml",
                    "lines": whole("deploy/alerts.yml"),
                    "reason": "A page when one search in ten is refused for five minutes.",
                },
                {
                    "file": "app/logging.py",
                    "lines": lines_of("app/logging.py", "def refused", "log.warning"),
                    "reason": "Who was refused, and for how long.",
                },
                {
                    "file": "app/admin.py",
                    "lines": lines_of("app/admin.py", "@admin.delete", 'return "", 204'),
                    "reason": "Forgiving a client empties nothing else: its bucket is made again, full, on its next search.",
                },
                {
                    "file": "tests/test_admin.py",
                    "lines": lines_of("tests/test_admin.py", "def test_a_forgiven", "status_code == 200"),
                    "reason": "Refused, forgiven, served.",
                },
            ],
        },
        {
            "id": "docs",
            "title": "Said where people look",
            "why": "Whoever calls the API or runs the service learns of the limit before it refuses them.",
            "steps": [
                {
                    "file": "docs/rate-limits.md",
                    "lines": whole("docs/rate-limits.md"),
                    "reason": "How the limit works and who counts as a client.",
                },
                {
                    "file": "docs/api.md",
                    "lines": lines_of("docs/api.md", "| 429 |", "DELETE /admin/limits"),
                    "reason": "429 and the remaining count, in the API's own reference.",
                },
                {
                    "file": "docs/operations.md",
                    "lines": whole("docs/operations.md"),
                    "reason": "The new counter, the alert, the warning in the log.",
                },
                {
                    "file": "README.md",
                    "lines": lines_of("README.md", "SEARCH_RATE", "See [docs/rate-limits.md]"),
                    "reason": "The two settings, and where to read more.",
                },
                {
                    "file": "settings.example.toml",
                    "lines": whole("settings.example.toml"),
                    "reason": "The settings, with their defaults.",
                },
                {
                    "file": "deploy/config.env",
                    "lines": whole("deploy/config.env"),
                    "reason": "Production starts at the defaults, written out.",
                },
                {
                    "file": "CHANGELOG.md",
                    "lines": lines_of("CHANGELOG.md", "## 0.4.0", "answers 429"),
                    "reason": "The change, as a user reads it.",
                },
            ],
        },
    ],
}

# What a reader asks about one of the steps, and what the agent answers
QUESTION = "Do these buckets ever get dropped?"
REPLY = (
    "Not yet: that is the doubt in the brief. Dropping buckets idle for ten minutes is a few lines here "
    "and a test. Want it in this round?"
)
