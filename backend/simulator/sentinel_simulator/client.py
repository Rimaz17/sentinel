"""A small client for the Sentinel API, on the standard library's http.client.

One connection is kept open across requests, which matters when a backfill posts
thousands of reports. A POST is never retried: a failure after sending could mean
the report was stored, and a retry would store it twice. Instead a connection
left idle long enough for the server to have closed it is replaced before use.
"""

from __future__ import annotations

import http.client
import json
import time
from urllib.parse import urlsplit

from sentinel_simulator.generator import Facility, SimulatedReport

FACILITY_HEADER = "X-Facility-Code"
FEED_KEY_HEADER = "X-Feed-Key"

# Tomcat closes an idle keep-alive connection after 20 seconds by default.
MAX_IDLE_SECONDS = 5.0


class ApiError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(f"HTTP {status}: {detail}")
        self.status = status
        self.detail = detail


class SentinelClient:
    """Talks to the API as its trusted report feed, sending the feed key with every request."""

    def __init__(self, base_url: str, feed_key: str, timeout: float = 10.0):
        parts = urlsplit(base_url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise ValueError(f"not an http(s) URL: {base_url}")
        self._scheme = parts.scheme
        self._host = parts.hostname
        self._port = parts.port
        self._prefix = parts.path.rstrip("/")
        self._feed_key = feed_key
        self._timeout = timeout
        self._connection: http.client.HTTPConnection | None = None
        self._last_used = 0.0

    def facilities(self) -> list[Facility]:
        status, body = self._request("GET", "/api/facilities")
        if status != 200:
            raise ApiError(status, _detail(body))
        return [
            Facility(
                code=item["code"],
                district_code=item["districtCode"],
                institution_type=item["institutionType"],
                latitude=item["latitude"],
                longitude=item["longitude"],
            )
            for item in json.loads(body)
        ]

    def submit(self, report: SimulatedReport) -> dict:
        status, body = self._request(
            "POST",
            "/api/ingestion/reports",
            json.dumps(report.payload()).encode("utf-8"),
            {FACILITY_HEADER: report.facility_code, "Content-Type": "application/json"},
        )
        if status != 202:
            raise ApiError(status, _detail(body))
        return json.loads(body)

    def close(self) -> None:
        if self._connection is not None:
            self._connection.close()
            self._connection = None

    def __enter__(self) -> SentinelClient:
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def _request(self, method, path, body=None, headers=None) -> tuple[int, bytes]:
        connection = self._open()
        try:
            connection.request(
                method,
                self._prefix + path,
                body=body,
                headers={FEED_KEY_HEADER: self._feed_key, **(headers or {})},
            )
            response = connection.getresponse()
            data = response.read()
        except (OSError, http.client.HTTPException):
            self.close()
            raise
        self._last_used = time.monotonic()
        return response.status, data

    def _open(self) -> http.client.HTTPConnection:
        if self._connection is not None and time.monotonic() - self._last_used > MAX_IDLE_SECONDS:
            self.close()
        if self._connection is None:
            factory = (
                http.client.HTTPSConnection
                if self._scheme == "https"
                else http.client.HTTPConnection
            )
            self._connection = factory(self._host, self._port, timeout=self._timeout)
        return self._connection


def _detail(body: bytes) -> str:
    """The problem detail's own words where the API sent one, the raw body otherwise."""
    try:
        problem = json.loads(body)
    except ValueError:
        return body.decode("utf-8", "replace")[:200]
    detail = problem.get("detail", "")
    errors = "; ".join(f"{e['field']} {e['message']}" for e in problem.get("errors", []))
    return f"{detail} {errors}".strip()
