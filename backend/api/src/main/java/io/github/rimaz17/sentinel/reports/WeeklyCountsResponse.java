package io.github.rimaz17.sentinel.reports;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Weekly report counts for one district, or the whole country when {@code districtCode} is null.
 * Weeks run oldest first; the last ends at {@code asOf}.
 */
record WeeklyCountsResponse(String districtCode, Instant asOf, List<Week> weeks) {

  record Week(Instant start, Instant end, Map<SymptomGroup, Long> counts) {}

  static WeeklyCountsResponse from(String districtCode, List<WeekCounts> weeks) {
    return new WeeklyCountsResponse(
        districtCode,
        weeks.get(weeks.size() - 1).end(),
        weeks.stream().map(week -> new Week(week.start(), week.end(), week.counts())).toList());
  }
}
