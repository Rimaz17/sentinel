from datetime import UTC, datetime, timedelta

from sentinel_detector.episodes import EPISODE_GAP, continues, episode_starts

T = datetime(2026, 9, 27, 6, tzinfo=UTC)


def hours(*offsets):
    return [T + timedelta(hours=h) for h in offsets]


def test_a_detection_within_a_day_continues_the_alert():
    assert continues(T, T + timedelta(hours=1))
    assert continues(T, T + EPISODE_GAP)


def test_a_detection_after_a_longer_quiet_spell_is_a_new_alert():
    assert not continues(T, T + EPISODE_GAP + timedelta(hours=1))


def test_hourly_detections_make_one_episode():
    assert episode_starts(hours(*range(0, 72))) == [T]


def test_a_gap_of_more_than_a_day_starts_a_second_episode():
    detections = hours(0, 1, 2, 30, 31)
    assert episode_starts(detections) == hours(0, 30)


def test_a_gap_of_exactly_a_day_does_not():
    assert episode_starts(hours(0, 24)) == hours(0)


def test_order_of_detections_does_not_matter():
    assert episode_starts(hours(31, 0, 30, 2, 1)) == hours(0, 30)


def test_no_detections_no_episodes():
    assert episode_starts([]) == []
