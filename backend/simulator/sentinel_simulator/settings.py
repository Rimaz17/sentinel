"""The feed key, from the environment or the repository's .env.

The simulator submits through the API's trusted report feed (docs/adr/0012), so
it needs the same SENTINEL_FEED_KEY the API was started with. Like the API and
the detector, it falls back to the repository's .env when run from the
repository root or from backend/simulator, and a variable set in the
environment always wins over the file.
"""

from __future__ import annotations

import os
from collections.abc import Mapping, Sequence
from pathlib import Path

ENV_FILES = (Path(".env"), Path("../../.env"))
FEED_KEY = "SENTINEL_FEED_KEY"


def read_env_file(path: Path) -> dict[str, str]:
    """KEY=VALUE lines; blank lines and # comments are skipped, surrounding quotes removed."""
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip()] = value
    return values


def feed_key(
    environ: Mapping[str, str] = os.environ, env_files: Sequence[Path] = ENV_FILES
) -> str | None:
    """The feed key, or None if it is set nowhere."""
    if environ.get(FEED_KEY):
        return environ[FEED_KEY]
    found = None
    for path in env_files:
        # A later file wins, as with the API's spring.config.import list.
        if path.is_file():
            found = read_env_file(path).get(FEED_KEY) or found
    return found
