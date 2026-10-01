"""A real PostgreSQL for the store's tests, built from the API's own migrations.

Flyway migrations are the only schema authority, so the detector's tests apply
exactly those files, in version order, rather than a schema of their own.
"""

from pathlib import Path

import psycopg
import pytest

MIGRATIONS = Path(__file__).resolve().parents[2] / "api/src/main/resources/db/migration"


def migration_files():
    files = MIGRATIONS.glob("V*__*.sql")
    return sorted(files, key=lambda path: int(path.name[1:].split("__")[0]))


@pytest.fixture(scope="session")
def database_url():
    from testcontainers.community.postgres import PostgresContainer

    # The local compose image: PostgreSQL 17 with PostGIS, which the migrations enable.
    with PostgresContainer("postgis/postgis:17-3.5-alpine", driver=None) as postgres:
        url = postgres.get_connection_url()
        with psycopg.connect(url, autocommit=True) as connection:
            for migration in migration_files():
                connection.execute(migration.read_text(encoding="utf-8"))
        yield url


@pytest.fixture
def db(database_url):
    """A connection to an empty report history and alert list."""
    with psycopg.connect(database_url, autocommit=True) as connection:
        connection.execute("delete from alerts")
        connection.execute("delete from reports")
        yield connection
