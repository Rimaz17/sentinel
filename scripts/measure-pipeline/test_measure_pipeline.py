import random
from datetime import UTC, datetime, timedelta

import pytest

from measure_pipeline import (
    Run,
    Submission,
    describe,
    percentile,
    send_times,
    simulated_report,
)
from sentinel_simulator.generator import Facility

KANDY = Facility("LKY0001016", "KDY", "Teaching Hospital", 7.27, 80.60)


def test_spaces_the_reports_evenly_at_the_rate():
    assert send_times(4, 1.5) == [0.0, 0.25, 0.5, 0.75, 1.0, 1.25]


def test_takes_a_percentile_by_nearest_rank():
    values = list(range(1, 101))
    assert percentile(values, 0.5) == 50
    assert percentile(values, 0.95) == 95
    assert percentile(values, 1.0) == 100
    assert percentile([7], 0.95) == 7


def test_has_no_percentile_of_nothing():
    with pytest.raises(ValueError):
        percentile([], 0.5)


def test_makes_a_report_from_the_last_hour_at_the_facility():
    now = datetime(2026, 9, 30, 8, 0, tzinfo=UTC)
    report = simulated_report(random.Random(1), KANDY, now)

    assert report.facility_code == "LKY0001016"
    assert now - timedelta(hours=1) <= report.reported_at <= now
    assert (report.latitude, report.longitude) == (7.27, 80.60)
    assert report.patient_name.startswith("SIMULATED")
    # The facility travels as the submitter's identity, never in the body.
    assert "LKY0001016" not in str(report.payload())


def run(**overrides) -> Run:
    measured = Run(target_rate=100, seconds=10)
    measured.submissions = [Submission(str(i), datetime.now(UTC), 0.01) for i in range(1000)]
    measured.sending_seconds = 10.0
    measured.lag_samples = [3, 5, 2]
    measured.drain_seconds = 0.1
    measured.stored_after = [0.02] * 1000
    for name, value in overrides.items():
        setattr(measured, name, value)
    return measured


def test_calls_a_rate_sustained_when_storage_keeps_pace():
    assert run().sustained


def test_does_not_call_a_rate_sustained_when_reports_pile_up_on_the_stream():
    assert not run(lag_samples=[40, 180, 450]).sustained


def test_does_not_call_a_rate_sustained_when_submissions_fall_behind():
    assert not run(sending_seconds=14.0).sustained


def test_does_not_call_a_rate_sustained_when_anything_was_refused():
    assert not run(refused=1).sustained


def test_does_not_call_a_rate_sustained_when_the_stream_never_drained():
    assert not run(drain_seconds=None).sustained


def test_describes_a_run_in_words():
    text = describe(run())

    assert "100 reports/s for 10 s: 1,000 accepted at 100.0/s, 0 refused" in text
    assert "submitted to stored: median 20 ms" in text
    assert "at most 5, 2 as sending ended" in text
    assert text.endswith("sustained: yes")
