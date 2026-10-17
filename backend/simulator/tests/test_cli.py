import random
from datetime import UTC, datetime, timedelta

from sentinel_simulator import cli
from sentinel_simulator.baselines import WEEKLY_BASELINES
from sentinel_simulator.cli import (
    backfill,
    describe_span,
    gap_start,
    holds_history,
    live,
    main,
    parse_args,
    planned_demo,
)
from sentinel_simulator.generator import Facility, Generator

NOW = datetime(2026, 9, 27, 6, 0, tzinfo=UTC)


class RecordingClient:
    def __init__(self):
        self.submitted = []

    def submit(self, report):
        self.submitted.append(report)
        return {"reportId": "x"}


def generator(seed=5):
    facilities = [Facility(f"P{d}0000001", d, "Teaching", 7.0, 80.5) for d in WEEKLY_BASELINES]
    return Generator(facilities, random.Random(seed))


def test_backfill_posts_every_report_in_the_window(capsys):
    client = RecordingClient()

    posted = backfill(client, generator(), start=NOW - timedelta(days=7), now=NOW)

    assert posted == len(client.submitted) > 0
    assert all(NOW - timedelta(days=7) <= r.reported_at < NOW for r in client.submitted)
    assert "Backfill complete" in capsys.readouterr().out


def test_a_span_is_described_in_the_largest_unit_that_reads_naturally():
    assert describe_span(timedelta(seconds=20)) == "less than a minute"
    assert describe_span(timedelta(minutes=1)) == "1 minute"
    assert describe_span(timedelta(minutes=12)) == "12 minutes"
    assert describe_span(timedelta(minutes=119)) == "119 minutes"
    assert describe_span(timedelta(hours=5, minutes=10)) == "5 hours"
    assert describe_span(timedelta(hours=47)) == "47 hours"
    assert describe_span(timedelta(days=15, hours=23)) == "16 days"
    assert describe_span(timedelta(days=63)) == "63 days"


class LatestClient:
    """Answers when the API's latest report presented, as SentinelClient does."""

    def __init__(self, latest):
        self.latest = latest

    def latest_reported_at(self):
        return self.latest


def test_a_gap_is_filled_from_the_apis_latest_report(capsys):
    latest = datetime(2026, 9, 11, 5, 30, tzinfo=UTC)

    assert gap_start(LatestClient(latest), NOW, days=63) == latest
    assert "from 2026-09-11 05:30 UTC; filling the 16 days since" in capsys.readouterr().out


def test_an_api_holding_no_report_gets_the_full_history(capsys):
    assert gap_start(LatestClient(None), NOW, days=63) == NOW - timedelta(days=63)
    assert "holds no reports; posting 63 days of history" in capsys.readouterr().out


def test_a_latest_report_older_than_the_window_gets_the_full_history(capsys):
    latest = NOW - timedelta(days=90)

    assert gap_start(LatestClient(latest), NOW, days=63) == NOW - timedelta(days=63)
    assert "before the 63 days a backfill covers; posting all of them" in capsys.readouterr().out


def test_a_stack_started_again_at_once_fills_only_the_minutes_since(capsys):
    latest = NOW - timedelta(minutes=3)

    assert gap_start(LatestClient(latest), NOW, days=63) == latest
    assert "filling the 3 minutes since" in capsys.readouterr().out


def test_nothing_is_missing_when_the_latest_report_is_from_now(capsys):
    assert gap_start(LatestClient(NOW), NOW, days=63) == NOW
    assert "nothing is missing" in capsys.readouterr().out


class GapApi(RecordingClient):
    """The API to a whole run of main: a registry, a latest report and somewhere to post.
    It stands in for the SentinelClient class, so calling it opens it."""

    def __init__(self, latest):
        super().__init__()
        self.latest = latest

    def __call__(self, api_url, feed_key):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def facilities(self):
        return [Facility(f"P{d}0000001", d, "Teaching", 7.0, 80.5) for d in WEEKLY_BASELINES]

    def latest_reported_at(self):
        return self.latest


def run_with(api, monkeypatch, *argv):
    monkeypatch.setenv("SENTINEL_FEED_KEY", "a-feed-key-for-tests-only-0123456789")
    monkeypatch.setattr(cli, "SentinelClient", api)
    return main(list(argv))


def test_a_fill_gap_backfill_posts_from_the_latest_report_to_now(monkeypatch, capsys):
    latest = datetime.now(UTC) - timedelta(days=2)
    api = GapApi(latest)

    assert run_with(api, monkeypatch, "--seed", "3", "backfill", "--fill-gap") == 0

    assert api.submitted
    assert all(latest <= r.reported_at < datetime.now(UTC) for r in api.submitted)
    assert "filling the 2 days since" in capsys.readouterr().out


def test_a_fill_gap_backfill_with_nothing_missing_posts_nothing(monkeypatch, capsys):
    api = GapApi(datetime.now(UTC) + timedelta(minutes=1))

    assert run_with(api, monkeypatch, "backfill", "--fill-gap") == 0

    assert api.submitted == []
    assert "nothing is missing" in capsys.readouterr().out


class HoldingClient:
    def __init__(self, held):
        self.held = held

    def recent_report_count(self):
        return self.held


def test_a_backfill_if_empty_is_skipped_when_the_api_holds_recent_reports(capsys):
    assert holds_history(HoldingClient(11_934))
    assert "already holds 11,934 reports" in capsys.readouterr().out


def test_a_backfill_if_empty_goes_ahead_when_the_api_holds_none(capsys):
    assert not holds_history(HoldingClient(0))
    assert capsys.readouterr().out == ""


def test_if_empty_is_off_unless_asked_for():
    assert not parse_args(["backfill"]).if_empty
    assert parse_args(["backfill", "--if-empty"]).if_empty


def test_live_posts_each_interval_as_it_ends(capsys):
    client = RecordingClient()
    moments = iter([NOW, NOW + timedelta(hours=1), NOW + timedelta(hours=2)])
    slept = []

    posted = live(
        client,
        generator(),
        interval=3600,
        clock=lambda: next(moments),
        sleep=slept.append,
        batches=2,
    )

    assert slept == [3600, 3600]
    assert posted == len(client.submitted) > 0
    assert all(NOW <= r.reported_at < NOW + timedelta(hours=2) for r in client.submitted)


def test_the_api_url_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("SENTINEL_API_URL", "http://api.example:9000")
    assert parse_args(["backfill"]).api_url == "http://api.example:9000"


def test_defaults(monkeypatch):
    monkeypatch.delenv("SENTINEL_API_URL", raising=False)
    args = parse_args(["backfill"])
    assert (args.api_url, args.days, args.spread_km) == ("http://localhost:8080", 63, 2.0)
    assert parse_args(["live"]).interval == 60.0


def test_an_unreachable_api_exits_with_an_error(capsys, monkeypatch):
    monkeypatch.setenv("SENTINEL_FEED_KEY", "a-feed-key-for-tests-only-0123456789")
    # Port 9 (discard) on loopback is closed on any ordinary machine.
    assert main(["--api-url", "http://127.0.0.1:9", "backfill", "--days", "1"]) == 1
    assert "Could not reach the API" in capsys.readouterr().err


def test_outbreaks_are_collected_from_repeated_options():
    args = parse_args(
        [
            "--outbreak",
            "district=KDY,group=DENGUE_LIKE,extra=40,start=-3d",
            "--outbreak",
            "district=CMB,group=INFLUENZA_LIKE,extra=90,spread=wave",
            "backfill",
        ]
    )
    assert len(args.outbreak) == 2


def test_an_invalid_outbreak_is_refused_before_anything_is_posted(capsys):
    assert main(["--outbreak", "district=KDY,group=DENGUE_LIKE", "backfill"]) == 2
    assert "Not a valid outbreak: an outbreak needs extra" in capsys.readouterr().err


def test_backfill_includes_an_injected_outbreak(capsys):
    from sentinel_simulator.outbreaks import parse_outbreak

    outbreak = parse_outbreak("district=KDY,group=DENGUE_LIKE,extra=300,start=-5d,days=4", NOW)
    facilities = [Facility(f"P{d}0000001", d, "Teaching", 7.0, 80.5) for d in WEEKLY_BASELINES]
    client = RecordingClient()

    backfill(
        client,
        Generator(facilities, random.Random(5), outbreaks=[outbreak]),
        start=NOW - timedelta(days=7),
        now=NOW,
    )

    kandy_dengue = [
        r
        for r in client.submitted
        if r.facility_code == "PKDY0000001" and r.symptom_group == "DENGUE_LIKE"
    ]
    assert len(kandy_dengue) > 100


def test_the_demo_outbreaks_run_unless_quiet():
    assert parse_args(["backfill"]).quiet is False
    assert parse_args(["--quiet", "backfill"]).quiet is True

    assert planned_demo(parse_args(["backfill"]), NOW)
    assert planned_demo(parse_args(["--quiet", "backfill"]), NOW) == []
    assert planned_demo(parse_args(["--quiet", "live"]), NOW) == []


def test_a_backfill_plans_the_demo_outbreaks_of_its_own_days():
    planned = planned_demo(parse_args(["backfill", "--days", "63"]), NOW)

    assert all(o.end > NOW - timedelta(days=63) and o.start < NOW for o in planned)
    assert any(o.start <= NOW < o.end for o in planned)


def test_a_backfill_from_a_given_start_plans_only_the_outbreaks_since():
    start = NOW - timedelta(days=16)
    planned = planned_demo(parse_args(["backfill", "--days", "63"]), NOW, start)

    assert planned
    assert all(o.end > start and o.start < NOW for o in planned)
    assert len(planned) < len(planned_demo(parse_args(["backfill", "--days", "63"]), NOW))


def test_a_live_run_plans_the_demo_outbreaks_years_ahead():
    planned = planned_demo(parse_args(["live"]), NOW)

    assert any(o.start <= NOW < o.end for o in planned)
    assert max(o.start for o in planned) > NOW + timedelta(days=3000)
