from datetime import timedelta
from urllib.parse import urlsplit

import psycopg
import pytest
from test_check import END, alerts, seed_history

from sentinel_detector import cli
from sentinel_detector.check import CheckResult
from sentinel_detector.cli import describe, main, parse_args, watch
from sentinel_detector.geography import Cluster
from sentinel_detector.store import RaisedAlert


@pytest.fixture
def api_style_env(database_url, monkeypatch):
    """The test database, described the way the API's settings describe one."""
    parts = urlsplit(database_url)
    monkeypatch.setenv(
        "SENTINEL_DB_URL", f"jdbc:postgresql://{parts.hostname}:{parts.port}{parts.path}"
    )
    monkeypatch.setenv("SENTINEL_DB_USERNAME", parts.username)
    monkeypatch.setenv("SENTINEL_DB_PASSWORD", parts.password)
    return {
        "conninfo": f"postgresql://{parts.hostname}:{parts.port}{parts.path}",
        "user": parts.username,
        "password": parts.password,
    }


def test_run_checks_once_and_reports_what_it_raised(db, api_style_env, capsys):
    seed_history(db, current=41)

    assert main(["run", "--at", END.isoformat()]) == 0

    out = capsys.readouterr().out
    assert "Checked 100 series for the 7 days to 2026-09-27 06:00 UTC: 1 above threshold" in out
    assert "new" in out and "KDY DENGUE_LIKE" in out and "41 reports, 3.2 sd above baseline" in out
    assert len(alerts(db)) == 1


def test_run_without_enough_history_says_so_and_fails(db, api_style_env, capsys):
    assert main(["run", "--at", END.isoformat()]) == 1
    assert "Not checked: a check needs reports from 63 days" in capsys.readouterr().err


def test_run_without_settings_names_what_is_missing(monkeypatch, tmp_path, capsys):
    for key in ("SENTINEL_DB_URL", "SENTINEL_DB_USERNAME", "SENTINEL_DB_PASSWORD"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.chdir(tmp_path)
    assert main(["run"]) == 1
    assert "set SENTINEL_DB_URL" in capsys.readouterr().err


def test_a_check_time_needs_an_offset():
    with pytest.raises(SystemExit):
        parse_args(["run", "--at", "2026-09-27T12:00"])


def test_watch_checks_now_then_a_minute_past_each_hour(db, api_style_env, capsys):
    seed_history(db, current=41)
    moments = iter(
        [
            END + timedelta(minutes=20),
            END + timedelta(minutes=20),
            END + timedelta(hours=1, minutes=1),
        ]
    )
    slept = []

    watch(api_style_env, 3.0, clock=lambda: next(moments), sleep=slept.append, checks=2)

    assert slept == [timedelta(minutes=41).total_seconds()]
    out = capsys.readouterr().out
    assert out.count("1 above threshold") == 2
    assert "ongoing" in out
    assert len(alerts(db)) == 1


def test_watch_keeps_going_when_there_is_not_enough_history(db, api_style_env, capsys):
    moments = iter([END, END, END + timedelta(hours=1)])
    watch(api_style_env, 3.0, clock=lambda: next(moments), sleep=lambda s: None, checks=2)
    assert capsys.readouterr().out.count("Not checked: a check needs reports") == 2


def test_watch_survives_the_database_being_unavailable(monkeypatch, capsys):
    def unavailable(*args):
        raise psycopg.OperationalError("connection refused")

    monkeypatch.setattr(cli, "check_once", unavailable)
    moments = iter([END, END, END + timedelta(hours=1)])
    watch({}, 3.0, clock=lambda: next(moments), sleep=lambda s: None, checks=2)
    assert capsys.readouterr().out.count("the database is unavailable") == 2


def test_evaluate_prints_the_measurements_as_markdown_without_a_database(monkeypatch, capsys):
    for key in ("SENTINEL_DB_URL", "SENTINEL_DB_USERNAME", "SENTINEL_DB_PASSWORD"):
        monkeypatch.delenv(key, raising=False)

    assert main(["evaluate", "--seed", "3", "--quiet-weeks", "2"]) == 0

    out = capsys.readouterr().out
    assert out.startswith("Seed 3: 600 injected outbreaks of 14 days")
    assert "| Threshold | Detected | at +50% | at +100% | at +200% |" in out
    assert out.count(" sd | ") == 4
    assert "Kandy dengue-like (usual week about 25 reports) at 3.0 sd:" in out


def test_describes_where_each_alert_is_bunched_or_that_it_is_not():
    clustered = RaisedAlert(
        "A-1001", "KDY", "DENGUE_LIKE", 41, 5.2, True, (Cluster(7.291, 80.634, 17, 7, 3.37, 7.4),)
    )
    spread = RaisedAlert("A-1002", "CMB", "INFLUENZA_LIKE", 110, 4.1, False)

    out = describe(CheckResult(END, 100, [clustered, spread]))

    assert out.splitlines()[1:] == [
        "  A-1001   new      KDY DENGUE_LIKE         41 reports, 5.2 sd above baseline",
        "           cluster at 7.291, 80.634: 17 reports within 2 km from 7 facilities,"
        " 3.4 expected",
        "  A-1002   ongoing  CMB INFLUENZA_LIKE      110 reports, 4.1 sd above baseline",
        "           no cluster: not bunched in any one place",
    ]
