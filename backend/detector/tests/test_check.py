from datetime import UTC, datetime, timedelta

import pytest

from sentinel_detector.check import InsufficientHistory, run_check
from sentinel_detector.windows import WEEK, history_start

END = datetime(2026, 9, 27, 6, tzinfo=UTC)

# Kandy's dengue-like baseline, oldest week (w8) first: mean 25, as in the project overview.
KANDY_BASELINE = [26, 24, 31, 19, 26, 25, 22, 27]


def add_reports(db, district, group, reported_at, count=1):
    db.execute(
        """
        insert into reports (id, facility_id, district_code, symptom_group, age_band,
            reported_at, received_at)
        select gen_random_uuid(),
               (select id from facilities where district_code = %(district)s order by id limit 1),
               %(district)s, %(group)s, '30-39', %(at)s, %(at)s
        from generate_series(1, %(count)s)
        """,
        {"district": district, "group": group, "at": reported_at, "count": count},
    )


def seed_history(db, end=END, current=25):
    """Nine weeks of Kandy dengue-like reports: the baseline above, then `current` this week."""
    for weeks_back, count in zip(range(8, 0, -1), KANDY_BASELINE, strict=True):
        add_reports(db, "KDY", "DENGUE_LIKE", end - weeks_back * WEEK - WEEK / 2, count)
    add_reports(db, "KDY", "DENGUE_LIKE", end - WEEK / 2, current)
    # The oldest moment the check reads, so the history is complete.
    add_reports(db, "ANU", "GASTROINTESTINAL", history_start(end))


def alerts(db):
    return db.execute("""
        select code, district_code, symptom_group, status, first_detected_at, last_detected_at,
               observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold
        from alerts order by id
        """).fetchall()


def test_refuses_to_check_without_any_history(db):
    with pytest.raises(InsufficientHistory, match="there are none"):
        run_check(db, END)


def test_refuses_to_check_with_less_than_nine_weeks_of_history(db):
    add_reports(db, "KDY", "DENGUE_LIKE", END - timedelta(days=30))
    with pytest.raises(InsufficientHistory, match="63 days"):
        run_check(db, END)


def test_an_ordinary_week_raises_nothing(db):
    seed_history(db, current=29)

    result = run_check(db, END)

    assert result.series == 25 * 4
    assert result.alerts == []
    assert alerts(db) == []


def test_a_week_far_above_baseline_raises_a_new_alert(db):
    seed_history(db, current=41)

    [raised] = run_check(db, END).alerts

    assert raised.is_new
    assert (raised.district_code, raised.symptom_group, raised.observed) == (
        "KDY",
        "DENGUE_LIKE",
        41,
    )
    [row] = alerts(db)
    code, district, group, status, first, last, observed, mean, sd, z, peak, threshold = row
    assert code == raised.code and code.startswith("A-")
    assert (district, group, status, observed) == ("KDY", "DENGUE_LIKE", "NEW", 41)
    assert first == last == END
    assert float(mean) == 25.0
    assert float(sd) == pytest.approx(3.55, abs=0.01)
    assert float(z) == pytest.approx(4.51, abs=0.01) and peak == z
    assert float(threshold) == 3.0


def test_checking_the_same_hour_twice_changes_nothing(db):
    seed_history(db, current=41)

    first = run_check(db, END + timedelta(minutes=5))
    second = run_check(db, END + timedelta(minutes=40))

    assert first.alerts[0].is_new and not second.alerts[0].is_new
    assert len(alerts(db)) == 1


def test_later_checks_extend_the_same_alert(db):
    seed_history(db, current=41)
    run_check(db, END)
    add_reports(db, "KDY", "DENGUE_LIKE", END + timedelta(minutes=30), 5)

    [raised] = run_check(db, END + timedelta(hours=1)).alerts

    assert not raised.is_new
    [row] = alerts(db)
    assert row[4] == END and row[5] == END + timedelta(hours=1)
    assert row[6] == 46
    assert row[10] >= row[9]


def test_a_rise_after_more_than_a_day_without_one_is_a_new_alert(db):
    seed_history(db, current=41)
    run_check(db, END)

    later = END + timedelta(hours=26)
    add_reports(db, "KDY", "DENGUE_LIKE", later - timedelta(hours=1), 10)
    [raised] = run_check(db, later).alerts

    assert raised.is_new
    assert len(alerts(db)) == 2


def test_an_older_check_does_not_rewrite_a_newer_one(db):
    seed_history(db, current=41)
    run_check(db, END + timedelta(hours=2))

    assert run_check(db, END).alerts == []
    [row] = alerts(db)
    assert row[5] == END + timedelta(hours=2)


def test_the_threshold_used_is_recorded(db):
    seed_history(db, current=35)

    assert run_check(db, END, threshold=3.0).alerts == []
    [raised] = run_check(db, END, threshold=2.5).alerts
    assert float(alerts(db)[0][11]) == 2.5 and raised.is_new


def test_window_edges_count_each_report_exactly_once(db):
    seed_history(db, current=0)
    # Start of the current week: counted. The end itself: not yet.
    add_reports(db, "CMB", "LEPTOSPIROSIS_LIKE", END - WEEK, 5)
    add_reports(db, "CMB", "LEPTOSPIROSIS_LIKE", END, 50)
    # Just before the history: not read at all.
    add_reports(db, "CMB", "LEPTOSPIROSIS_LIKE", history_start(END) - timedelta(seconds=1), 50)

    [raised] = run_check(db, END).alerts

    assert (raised.district_code, raised.observed) == ("CMB", 5)
