"""Measures the report pipeline: how many reports a second it sustains, and how
long a report takes from submission to storage.

Submits simulated reports through the API's report feed at a steady rate, as
the simulator does, then reads back from PostgreSQL when the stream processor
stored each one. Every second it also counts how many accepted reports are
still waiting on the stream: the consumer lag. A rate is sustained when that
lag stays within a second's worth of reports while submitting, and drains
straight after.

It adds real reports, so run it against a throwaway stack with nothing else
submitting. See README.md.
"""

from __future__ import annotations

import argparse
import random
import statistics
import sys
import threading
import time
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

try:
    import sentinel_detector  # noqa: F401
    import sentinel_simulator  # noqa: F401
except ImportError:  # run from the repository: both are sibling projects
    BACKEND = Path(__file__).resolve().parents[2] / "backend"
    sys.path.extend([str(BACKEND / "simulator"), str(BACKEND / "detector")])

import psycopg  # noqa: E402

from sentinel_detector.config import ConfigError, connection_settings  # noqa: E402
from sentinel_simulator.client import ApiError, SentinelClient  # noqa: E402
from sentinel_simulator.generator import Facility, SimulatedReport  # noqa: E402
from sentinel_simulator.settings import feed_key  # noqa: E402

GROUPS = ("DENGUE_LIKE", "INFLUENZA_LIKE", "GASTROINTESTINAL", "LEPTOSPIROSIS_LIKE")

# How long to wait, after the last submission, for everything accepted to be stored.
DRAIN_TIMEOUT_SECONDS = 120.0


@dataclass(frozen=True)
class Submission:
    report_id: str
    sent_at: datetime
    round_trip: float


@dataclass
class Run:
    """What happened at one target rate."""

    target_rate: float
    seconds: float
    submissions: list[Submission] = field(default_factory=list)
    refused: int = 0
    sending_seconds: float = 0.0
    lag_samples: list[int] = field(default_factory=list)
    drain_seconds: float | None = None
    stored_after: list[float] = field(default_factory=list)

    @property
    def accepted_rate(self) -> float:
        return len(self.submissions) / self.sending_seconds if self.sending_seconds else 0.0

    @property
    def final_lag(self) -> int:
        return self.lag_samples[-1] if self.lag_samples else 0

    @property
    def sustained(self) -> bool:
        """Kept up: took nearly every report on time, and storage kept pace with it."""
        return (
            self.refused == 0
            and self.accepted_rate >= 0.97 * self.target_rate
            and self.final_lag <= max(1, self.target_rate)
            and self.drain_seconds is not None
            and self.drain_seconds <= 2.0
        )


def send_times(rate: float, seconds: float) -> list[float]:
    """When each report is due, in seconds from the start: evenly spaced at the rate."""
    return [i / rate for i in range(int(rate * seconds))]


def percentile(values: Sequence[float], share: float) -> float:
    """The value at or below which `share` of the values fall, by nearest rank."""
    ordered = sorted(values)
    if not ordered:
        raise ValueError("no values")
    rank = max(1, round(share * len(ordered)))
    return ordered[min(rank, len(ordered)) - 1]


def simulated_report(rng: random.Random, facility: Facility, now: datetime) -> SimulatedReport:
    """A report from the last hour at a located facility, identity included as sent."""
    serial = rng.randrange(1_000_000)
    return SimulatedReport(
        facility_code=facility.code,
        symptom_group=rng.choice(GROUPS),
        reported_at=now - timedelta(seconds=rng.uniform(0, 3600)),
        age=rng.randrange(90),
        date_of_birth=None,
        latitude=facility.latitude,
        longitude=facility.longitude,
        patient_name=f"SIMULATED patient {serial:06d}",
        nic_number=f"SIMULATED-{serial:06d}",
        phone_number=f"SIMULATED-{serial:010d}",
        home_address=f"SIMULATED address {serial:06d}, {facility.district_code}",
    )


def measure(
    api_url: str,
    key: str,
    connection: psycopg.Connection,
    facilities: list[Facility],
    rate: float,
    seconds: float,
    workers: int,
    rng: random.Random,
) -> Run:
    run = Run(target_rate=rate, seconds=seconds)
    due = send_times(rate, seconds)
    reports = [simulated_report(rng, rng.choice(facilities), datetime.now(UTC)) for _ in due]
    next_index = iter(range(len(due)))
    lock = threading.Lock()
    sending = threading.Event()
    sending.set()
    started_wall = datetime.now(UTC)
    started = time.monotonic()

    def submit_until_done() -> None:
        with SentinelClient(api_url, key) as client:
            while True:
                with lock:
                    index = next(next_index, None)
                if index is None:
                    return
                delay = started + due[index] - time.monotonic()
                if delay > 0:
                    time.sleep(delay)
                sent_at = datetime.now(UTC)
                before = time.perf_counter()
                try:
                    receipt = client.submit(reports[index])
                except (ApiError, OSError):
                    with lock:
                        run.refused += 1
                    continue
                submission = Submission(receipt["reportId"], sent_at, time.perf_counter() - before)
                with lock:
                    run.submissions.append(submission)

    def sample_lag() -> None:
        while sending.is_set():
            time.sleep(1.0)
            with lock:
                accepted = len(run.submissions)
            # A report can be stored before its 202 reaches the submitter, so storage can
            # briefly run ahead of the accepted count; that is no report waiting.
            run.lag_samples.append(max(0, accepted - stored_since(connection, started_wall)))

    threads = [threading.Thread(target=submit_until_done) for _ in range(workers)]
    sampler = threading.Thread(target=sample_lag)
    sampler.start()
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    run.sending_seconds = time.monotonic() - started
    sending.clear()
    sampler.join()

    finished = time.monotonic()
    while time.monotonic() - finished < DRAIN_TIMEOUT_SECONDS:
        if stored_since(connection, started_wall) >= len(run.submissions):
            run.drain_seconds = time.monotonic() - finished
            break
        time.sleep(0.05)
    sent = {submission.report_id: submission.sent_at for submission in run.submissions}
    rows = connection.execute(
        "select id::text, stored_at from reports where id = any(%s::uuid[])",
        (list(sent),),
    ).fetchall()
    run.stored_after = [
        (stored_at - sent[report_id]).total_seconds() for report_id, stored_at in rows
    ]
    return run


def stored_since(connection: psycopg.Connection, since: datetime) -> int:
    """Reports stored that were received since the run began; nothing else may be submitting.

    The API stamps received_at by the same machine's clock as `since`, so no margin is
    allowed: one would count the previous run's last reports as this one's.
    """
    return connection.execute(
        "select count(*) from reports where received_at >= %s", (since,)
    ).fetchone()[0]


def describe(run: Run) -> str:
    millis = [value * 1000 for value in run.stored_after]
    trips = [submission.round_trip * 1000 for submission in run.submissions]
    lines = [
        f"{run.target_rate:g} reports/s for {run.seconds:g} s: "
        f"{len(run.submissions):,} accepted at {run.accepted_rate:.1f}/s, {run.refused} refused",
    ]
    if trips:
        lines.append(
            f"  submission round trip: median {statistics.median(trips):.0f} ms, "
            f"95th percentile {percentile(trips, 0.95):.0f} ms"
        )
    if millis:
        lines.append(
            f"  submitted to stored: median {statistics.median(millis):.0f} ms, "
            f"95th percentile {percentile(millis, 0.95):.0f} ms, slowest {max(millis):.0f} ms"
        )
    drained = "never" if run.drain_seconds is None else f"{run.drain_seconds:.2f} s"
    lines.append(
        f"  waiting on the stream: at most {max(run.lag_samples, default=0)}, "
        f"{run.final_lag} as sending ended; all stored {drained} after the last submission"
    )
    lines.append(f"  sustained: {'yes' if run.sustained else 'no'}")
    return "\n".join(lines)


def parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--api-url", default="http://localhost:8080")
    parser.add_argument(
        "--rates", default="25,50,100,200", help="reports a second to try, comma-separated"
    )
    parser.add_argument("--seconds", type=float, default=30.0, help="how long each rate runs")
    parser.add_argument("--workers", type=int, default=16, help="concurrent submitters")
    parser.add_argument("--seed", type=int, default=2026)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    key = feed_key()
    if not key:
        print("Set SENTINEL_FEED_KEY in the environment or in .env", file=sys.stderr)
        return 1
    try:
        database = connection_settings()
    except ConfigError as error:
        print(f"Database settings: {error}", file=sys.stderr)
        return 1
    rng = random.Random(args.seed)
    with SentinelClient(args.api_url, key) as client:
        facilities = [f for f in client.facilities() if f.latitude is not None]
    print(f"Submitting to {args.api_url} with {args.workers} submitters")
    # Opened once, before any clock starts, and shared by the lag sampler and the drain check.
    with psycopg.connect(**database, autocommit=True) as connection:
        for rate in (float(value) for value in args.rates.split(",")):
            run = measure(
                args.api_url, key, connection, facilities, rate, args.seconds, args.workers, rng
            )
            print(describe(run), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
