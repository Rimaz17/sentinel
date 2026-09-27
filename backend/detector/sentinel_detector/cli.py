"""Command line: one check now, or a check at the top of every hour.

python -m sentinel_detector run
python -m sentinel_detector run --at 2026-09-27T12:00+05:30
python -m sentinel_detector watch
"""

from __future__ import annotations

import argparse
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import psycopg

from sentinel_detector.check import CheckResult, InsufficientHistory, run_check
from sentinel_detector.config import ConfigError, connection_settings
from sentinel_detector.zscore import DEFAULT_THRESHOLD

# Checks start a minute past the hour, so reports stamped just before it have landed.
WATCH_DELAY = timedelta(minutes=1)

# Seconds to wait for the database before giving up on a check.
CONNECT_TIMEOUT = 10


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m sentinel_detector",
        description="Compare each district and symptom group's last 7 days with its baseline.",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    run = commands.add_parser("run", help="check once and exit")
    run.add_argument(
        "--at",
        type=_moment,
        help="check as of this ISO 8601 time with an offset (default: now)",
    )
    watch = commands.add_parser("watch", help="check at the top of every hour until interrupted")
    for command in (run, watch):
        command.add_argument(
            "--threshold",
            type=float,
            default=DEFAULT_THRESHOLD,
            help="standard deviations above baseline that raise an alert (default: %(default)s)",
        )
    return parser.parse_args(argv)


def _moment(text: str) -> datetime:
    moment = datetime.fromisoformat(text)
    if moment.tzinfo is None:
        raise argparse.ArgumentTypeError("give a UTC offset, as in 2026-09-27T12:00+05:30")
    return moment


def describe(result: CheckResult) -> str:
    lines = [
        f"Checked {result.series} series for the 7 days to {result.end:%Y-%m-%d %H:%M} UTC:"
        f" {len(result.alerts)} above threshold"
    ]
    for alert in result.alerts:
        lines.append(
            f"  {alert.code:<8} {'new' if alert.is_new else 'ongoing':<8}"
            f" {alert.district_code} {alert.symptom_group:<19}"
            f" {alert.observed} reports, {alert.z_score:.1f} sd above baseline"
        )
    return "\n".join(lines)


def check_once(settings: dict, moment: datetime, threshold: float) -> CheckResult:
    with psycopg.connect(
        **settings, autocommit=True, connect_timeout=CONNECT_TIMEOUT
    ) as connection:
        return run_check(connection, moment, threshold)


def watch(
    settings: dict,
    threshold: float,
    clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    sleep: Callable[[float], None] = time.sleep,
    checks: int | None = None,
) -> None:
    """Check now, then a minute past every hour. `checks` bounds the loop for testing."""
    done = 0
    while checks is None or done < checks:
        try:
            print(describe(check_once(settings, clock(), threshold)), flush=True)
        except InsufficientHistory as error:
            print(f"Not checked: {error}", flush=True)
        except psycopg.OperationalError as error:
            print(f"Not checked, the database is unavailable: {error}", flush=True)
        done += 1
        if checks is not None and done >= checks:
            break
        now = clock()
        next_check = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        sleep((next_check + WATCH_DELAY - now).total_seconds())


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        settings = connection_settings()
        if args.command == "run":
            print(describe(check_once(settings, args.at or datetime.now(UTC), args.threshold)))
        else:
            print(f"Checking every hour at {WATCH_DELAY.seconds // 60} minute past; Ctrl+C to stop")
            watch(settings, args.threshold)
    except KeyboardInterrupt:
        print("Stopped.")
    except (ConfigError, InsufficientHistory) as error:
        print(f"Not checked: {error}", file=sys.stderr)
        return 1
    except psycopg.OperationalError as error:
        print(f"Could not reach the database: {error}", file=sys.stderr)
        return 1
    return 0
