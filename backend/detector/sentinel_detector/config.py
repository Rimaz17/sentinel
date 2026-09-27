"""Database settings, shared with the API.

The detector reads the same three variables as the Spring Boot API, so there is
one place to configure the database. Like the API, it falls back to the
repository's .env when run from the repository root or from backend/detector,
and a variable set in the environment always wins over the file.
"""

from __future__ import annotations

import os
from collections.abc import Mapping, Sequence
from pathlib import Path

ENV_FILES = (Path(".env"), Path("../../.env"))
JDBC_PREFIX = "jdbc:"
REQUIRED = ("SENTINEL_DB_URL", "SENTINEL_DB_USERNAME", "SENTINEL_DB_PASSWORD")


class ConfigError(Exception):
    pass


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


def connection_settings(
    environ: Mapping[str, str] = os.environ, env_files: Sequence[Path] = ENV_FILES
) -> dict[str, str]:
    """Keyword arguments for psycopg.connect."""
    values: dict[str, str] = {}
    for path in env_files:
        # A later file wins, as with the API's spring.config.import list.
        if path.is_file():
            values.update(read_env_file(path))
    values.update({key: environ[key] for key in REQUIRED if key in environ})

    missing = [key for key in REQUIRED if not values.get(key)]
    if missing:
        raise ConfigError(f"set {', '.join(missing)} in the environment or in .env")

    url = values["SENTINEL_DB_URL"]
    if not url.startswith(JDBC_PREFIX + "postgresql://"):
        raise ConfigError("SENTINEL_DB_URL must be a jdbc:postgresql:// URL, as the API uses")
    return {
        "conninfo": url.removeprefix(JDBC_PREFIX),
        "user": values["SENTINEL_DB_USERNAME"],
        "password": values["SENTINEL_DB_PASSWORD"],
    }
