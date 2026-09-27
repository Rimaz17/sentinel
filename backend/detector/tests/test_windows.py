from datetime import UTC, datetime, timedelta, timezone

import pytest

from sentinel_detector.windows import check_time, history_start


def test_checks_are_aligned_to_the_top_of_the_hour_in_utc():
    colombo = timezone(timedelta(hours=5, minutes=30))
    moment = datetime(2026, 9, 27, 20, 47, 13, tzinfo=colombo)
    assert check_time(moment) == datetime(2026, 9, 27, 15, 0, tzinfo=UTC)


def test_a_check_reads_nine_weeks_of_history():
    end = datetime(2026, 9, 27, 15, tzinfo=UTC)
    assert end - history_start(end) == timedelta(days=63)


def test_refuses_a_naive_check_time():
    with pytest.raises(ValueError):
        check_time(datetime(2026, 9, 27, 15))
