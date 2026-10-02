"""Checks a running full stack from the outside, as a browser reaches it.

    python smoke_test.py
    python smoke_test.py --base-url http://127.0.0.1:8088 --alert-timeout 900

Every request goes through the web container, so this checks the site, the
API behind it, the alert socket's handshake and, given time, the whole pipeline:
the simulator's reports through Kafka into PostgreSQL, the detector's alerts
out of it. Standard library only. Exits 1 at the first check that fails.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

DISTRICTS = 25


class CheckFailed(Exception):
    pass


def request(base: str, path: str, *, data: dict | None = None, token: str | None = None):
    """(status, body as text) for a GET, or a POST of JSON when data is given."""
    headers = {"Accept": "application/json, text/html"}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise CheckFailed(message)
    print(f"ok    {message}", flush=True)


def wait_for_site(base: str, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    while True:
        try:
            status, _ = request(base, "/")
            if status == 200:
                return
        except OSError:
            pass
        if time.monotonic() > deadline:
            raise CheckFailed(f"the site at {base} did not answer within {timeout:.0f} s")
        time.sleep(3)


def handshake(base: str, origin: str) -> int:
    """The HTTP status the alert socket's WebSocket handshake answers with."""
    parts = urlsplit(base)
    host, port = parts.hostname, parts.port or 80
    key = base64.b64encode(os.urandom(16)).decode()
    lines = [
        "GET /api/ws HTTP/1.1",
        f"Host: {parts.netloc}",
        "Upgrade: websocket",
        "Connection: Upgrade",
        f"Sec-WebSocket-Key: {key}",
        "Sec-WebSocket-Version: 13",
        f"Origin: {origin}",
    ]
    with socket.create_connection((host, port), timeout=10) as connection:
        connection.sendall(("\r\n".join(lines) + "\r\n\r\n").encode())
        status_line = connection.makefile("rb").readline().decode()
    return int(status_line.split()[1])


def sign_in(base: str, email: str, password: str) -> str:
    status, body = request(base, "/api/auth/signin", data={"email": email, "password": password})
    expect(status == 200, f"{email} signs in")
    return json.loads(body)["accessToken"]


def check_site(base: str) -> None:
    status, body = request(base, "/")
    expect(status == 200 and 'id="root"' in body, "the landing page is served")
    status, body = request(base, "/app/districts/KDY")
    expect(status == 200 and 'id="root"' in body, "a deep link is answered with the app")
    status, body = request(base, "/api/public/districts")
    expect(
        status == 200 and len(json.loads(body)) == DISTRICTS,
        f"the public API answers through the proxy, with {DISTRICTS} districts",
    )


def check_socket(base: str) -> None:
    expect(handshake(base, base) == 101, "the alert socket accepts a page from its own origin")
    expect(
        handshake(base, "http://elsewhere.example") == 403,
        "the alert socket refuses a page from another origin",
    )


def demo_accounts(base: str) -> dict | None:
    status, body = request(base, "/api/public/demo")
    return json.loads(body) if status == 200 else None


def check_scope(base: str, demo: dict) -> None:
    colombo = sign_in(base, "inspector.colombo@demo.sentinel.test", demo["password"])
    status, _ = request(base, "/api/districts/CMB", token=colombo)
    expect(status == 200, "a Colombo inspector reads Colombo")
    status, _ = request(base, "/api/districts/KDY", token=colombo)
    expect(status == 403, "a Colombo inspector is refused Kandy")


def wait_for_alerts(base: str, demo: dict, timeout: float) -> None:
    """Alerts reach the inspectors' API once the history is in and the detector has checked."""
    email = "inspector.national@demo.sentinel.test"
    token = sign_in(base, email, demo["password"])
    deadline = time.monotonic() + timeout
    print(f"...   waiting up to {timeout:.0f} s for the detector's first alerts", flush=True)
    while True:
        status, body = request(base, "/api/alerts", token=token)
        if status == 401:
            # Access tokens last 15 minutes.
            token = sign_in(base, email, demo["password"])
            continue
        if status == 200 and (alerts := json.loads(body)):
            codes = ", ".join(
                f"{a['code']} {a['districtCode']} {a['symptomGroup']}" for a in alerts
            )
            print(f"ok    the detector raised {len(alerts)} alert(s): {codes}", flush=True)
            return
        if time.monotonic() > deadline:
            raise CheckFailed(f"no alert within {timeout:.0f} s (last answer: HTTP {status})")
        time.sleep(15)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8088",
        help="the site, as a browser reaches it (default: %(default)s)",
    )
    parser.add_argument(
        "--start-timeout",
        type=float,
        default=300,
        help="seconds to wait for the site to answer (default: %(default)s)",
    )
    parser.add_argument(
        "--alert-timeout",
        type=float,
        default=900,
        help="seconds to wait for the first alert; 0 skips the check (default: %(default)s)",
    )
    args = parser.parse_args(argv)
    base = args.base_url.rstrip("/")
    try:
        wait_for_site(base, args.start_timeout)
        check_site(base)
        check_socket(base)
        demo = demo_accounts(base)
        if demo is None:
            print("skip  demo mode is off, so there is no account to sign in with", flush=True)
            return 0
        check_scope(base, demo)
        if args.alert_timeout > 0:
            wait_for_alerts(base, demo, args.alert_timeout)
    except (CheckFailed, OSError, ValueError, KeyError) as error:
        print(f"FAIL  {error}", file=sys.stderr, flush=True)
        return 1
    print("All checks passed.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
