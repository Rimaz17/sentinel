import random
from datetime import UTC, datetime, timedelta

from sentinel_simulator.baselines import WEEKLY_BASELINES
from sentinel_simulator.cli import backfill, live, main, parse_args, planned_demo
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

    posted = backfill(client, generator(), days=7, now=NOW)

    assert posted == len(client.submitted) > 0
    assert all(NOW - timedelta(days=7) <= r.reported_at < NOW for r in client.submitted)
    assert "Backfill complete" in capsys.readouterr().out


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

    backfill(client, Generator(facilities, random.Random(5), outbreaks=[outbreak]), days=7, now=NOW)

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


def test_a_live_run_plans_the_demo_outbreaks_years_ahead():
    planned = planned_demo(parse_args(["live"]), NOW)

    assert any(o.start <= NOW < o.end for o in planned)
    assert max(o.start for o in planned) > NOW + timedelta(days=3000)
