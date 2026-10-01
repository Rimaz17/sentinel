"""Command line: fill in history, or keep reports flowing in real time.

    python -m sentinel_simulator backfill --days 63
    python -m sentinel_simulator live
    python -m sentinel_simulator --outbreak SETTINGS backfill
    python -m sentinel_simulator --quiet backfill

Detection compares the last 7 days with the 8 weeks before them, so a 63-day
backfill gives it a full window on first run. Unless `--quiet` is given, the
demo's rolling outbreaks run on top of the baseline, so the dashboards always
have alerts to show; see sentinel_simulator.scenario. `--outbreak` injects an
outbreak of your own, timed relative to now, with SETTINGS such as
district=KDY,group=DENGUE_LIKE,extra=40,start=-3d; see sentinel_simulator.outbreaks.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from sentinel_simulator.client import ApiError, SentinelClient
from sentinel_simulator.generator import Generator
from sentinel_simulator.outbreaks import Outbreak, parse_outbreak
from sentinel_simulator.scenario import demo_outbreaks, running
from sentinel_simulator.settings import feed_key

DEFAULT_API_URL = "http://localhost:8080"
PROGRESS_EVERY = 1000
# How far ahead a live run plans the demo's outbreaks: longer than any run lasts.
LIVE_HORIZON = timedelta(days=3650)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m sentinel_simulator",
        description="Post simulated symptom reports to the Sentinel ingestion API.",
    )
    parser.add_argument(
        "--api-url",
        default=os.environ.get("SENTINEL_API_URL", DEFAULT_API_URL),
        help="API base URL (default: $SENTINEL_API_URL, else %(default)s)",
    )
    parser.add_argument(
        "--feed-key",
        help="the API's report feed key (default: $SENTINEL_FEED_KEY, else the repository's .env)",
    )
    parser.add_argument("--seed", type=int, help="random seed, for a repeatable run")
    parser.add_argument(
        "--spread-km",
        type=float,
        default=2.0,
        help="how far patients live from their facility, as a standard deviation (default: 2)",
    )
    parser.add_argument(
        "--outbreak",
        action="append",
        default=[],
        metavar="SETTINGS",
        help=(
            "inject an outbreak, as district=KDY,group=DENGUE_LIKE,extra=40 plus optional"
            " start=-3d (offset from now), days=14, profile=ramp|step, spread=point|wave;"
            " repeatable"
        ),
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="leave out the demo's rolling outbreaks: the baseline alone, plus any --outbreak",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    backfill = commands.add_parser("backfill", help="post reports for the past N days, then stop")
    backfill.add_argument("--days", type=int, default=63, help="days of history (default: 63)")

    live = commands.add_parser("live", help="post reports as they happen, until interrupted")
    live.add_argument(
        "--interval", type=float, default=60.0, help="seconds between batches (default: 60)"
    )
    return parser.parse_args(argv)


def planned_demo(args: argparse.Namespace, now: datetime) -> list[Outbreak]:
    """The demo's outbreaks this run will post, or none with --quiet."""
    if args.quiet:
        return []
    if args.command == "backfill":
        return demo_outbreaks(now - timedelta(days=args.days), now)
    return demo_outbreaks(now, now + LIVE_HORIZON)


def backfill(client, generator: Generator, days: int, now: datetime) -> int:
    start = now - timedelta(days=days)
    posted = 0
    began = time.monotonic()
    for report in generator.reports(start, now):
        client.submit(report)
        posted += 1
        if posted % PROGRESS_EVERY == 0:
            print(f"  {posted:,} reports posted", flush=True)
    elapsed = time.monotonic() - began
    rate = posted / elapsed if elapsed > 0 else 0.0
    print(
        f"Backfill complete: {posted:,} reports over {days} days"
        f" in {elapsed:.1f} s ({rate:.0f}/s)"
    )
    return posted


def live(
    client,
    generator: Generator,
    interval: float,
    clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    sleep: Callable[[float], None] = time.sleep,
    batches: int | None = None,
) -> int:
    """Post each interval's reports at the end of it. `batches` bounds the loop for testing."""
    posted = 0
    since = clock()
    done = 0
    while batches is None or done < batches:
        sleep(interval)
        now = clock()
        batch = 0
        for report in generator.reports(since, now):
            client.submit(report)
            batch += 1
        posted += batch
        done += 1
        print(f"{now:%H:%M:%S} UTC  {batch} reports  ({posted:,} this run)", flush=True)
        since = now
    return posted


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    rng = random.Random(args.seed)
    now = datetime.now(UTC)
    try:
        outbreaks = [parse_outbreak(text, now) for text in args.outbreak]
    except ValueError as error:
        print(f"Not a valid outbreak: {error}", file=sys.stderr)
        return 2
    key = args.feed_key or feed_key()
    if not key:
        print(
            "Set SENTINEL_FEED_KEY, in the environment or the repository's .env, to the feed key"
            " the API was started with.",
            file=sys.stderr,
        )
        return 2
    demo = planned_demo(args, now)
    try:
        with SentinelClient(args.api_url, key) as client:
            facilities = client.facilities()
            generator = Generator(
                facilities, rng, spread_km=args.spread_km, outbreaks=outbreaks + demo
            )
            located = sum(1 for f in facilities if f.latitude is not None)
            print(f"{len(facilities):,} facilities in the registry, {located:,} with a location")
            if demo:
                print(
                    "The demo's outbreaks run on top of the baseline, a new one every 7 days"
                    " (--quiet leaves them out). Running now:"
                )
                for outbreak in running(now):
                    print(f"  {outbreak.describe()}")
            for outbreak in outbreaks:
                print(f"Injecting an outbreak: {outbreak.describe()}")
                if args.command == "backfill" and outbreak.start >= now:
                    print(
                        "  It starts after the backfill ends, so the backfill will not include it."
                    )
            if args.command == "backfill":
                backfill(client, generator, args.days, now)
            else:
                print(f"Posting live every {args.interval:g} s; Ctrl+C to stop", flush=True)
                live(client, generator, args.interval)
    except KeyboardInterrupt:
        print("Stopped.")
    except ApiError as error:
        print(f"The API refused a request: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Could not reach the API at {args.api_url}: {error}", file=sys.stderr)
        return 1
    return 0
