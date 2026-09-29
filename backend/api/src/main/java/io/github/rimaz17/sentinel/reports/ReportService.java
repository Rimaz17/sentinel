package io.github.rimaz17.sentinel.reports;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@Transactional
public class ReportService {

  static final Duration WEEK = Duration.ofDays(7);

  /**
   * How many times a count rebuilds the windows before giving up on a Redis that keeps emptying.
   */
  static final int REBUILD_ATTEMPTS = 3;

  private final ReportRepository reports;
  private final ReportWindows windows;
  private final Clock clock;
  private final Object rebuilding = new Object();

  ReportService(ReportRepository reports, ReportWindows windows, Clock clock) {
    this.reports = reports;
    this.windows = windows;
    this.clock = clock;
  }

  /**
   * Stores a report that has already been through ingestion's anonymiser, noting when it was
   * stored, and once that is committed adds it to its seven-day window. A report already stored is
   * left as it was, but still added to its window, in case an earlier attempt stored it and then
   * failed to reach Redis. Returns whether this call stored it.
   *
   * <p>A failure to reach Redis is thrown after the commit, so the stream processor retries the
   * report, which is then stored as it was and added again.
   */
  public boolean record(AnonymisedReport report) {
    boolean stored =
        reports.insertIfAbsent(
                report.id(),
                report.facilityId(),
                report.districtCode(),
                report.symptomGroup().name(),
                report.ageBand().label(),
                report.latitude(),
                report.longitude(),
                report.reportedAt(),
                report.receivedAt(),
                clock.instant())
            == 1;
    WindowEntry entry = WindowEntry.of(report);
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            windows.add(entry, clock.instant());
          }
        });
    return stored;
  }

  /**
   * How many reports each of the given districts has had over the seven days up to now, read from
   * the live windows. If Redis has lost them, they are rebuilt from storage first, so the answer is
   * the same either way.
   */
  @Transactional(readOnly = true)
  public Map<String, Long> countsLast7Days(List<String> districtCodes) {
    for (int attempt = 0; attempt < REBUILD_ATTEMPTS; attempt++) {
      Instant now = clock.instant();
      Optional<Map<String, Long>> counts = windows.counts(districtCodes, now.minus(WEEK), now);
      if (counts.isPresent()) {
        return counts.get();
      }
      rebuildWindows();
    }
    throw new DataAccessResourceFailureException(
        "The seven-day windows were lost again each time they were rebuilt");
  }

  /** One rebuild at a time: a count that waited for another's finds the windows complete. */
  private void rebuildWindows() {
    synchronized (rebuilding) {
      Instant now = clock.instant();
      if (windows.counts(List.of(), now, now).isPresent()) {
        return;
      }
      windows.rebuild(reports.findWindowEntriesSince(now.minus(WEEK)));
    }
  }

  /*
   * The queries below take the districts they may look at: a list of codes, or null for the whole
   * country. An empty list is a caller who may see no district at all, and finds nothing.
   */

  /**
   * The most recently reported first, by when the patient presented rather than when it arrived.
   */
  @Transactional(readOnly = true)
  public List<Report> recent(List<String> districtCodes, int limit) {
    if (districtCodes == null) {
      return reports.findAllByOrderByReportedAtDescIdDesc(Limit.of(limit));
    }
    if (districtCodes.isEmpty()) {
      return List.of();
    }
    return reports.findByDistrictCodeInOrderByReportedAtDescIdDesc(districtCodes, Limit.of(limit));
  }

  /**
   * Reports with a location that presented within the last {@code days} days, newest first, at most
   * {@code limit}.
   */
  @Transactional(readOnly = true)
  public List<Report> locatedWithin(List<String> districtCodes, int days, int limit) {
    Instant now = clock.instant();
    Instant from = now.minus(Duration.ofDays(days));
    if (districtCodes == null) {
      return reports.findLocated(from, now, Limit.of(limit));
    }
    if (districtCodes.isEmpty()) {
      return List.of();
    }
    return reports.findLocatedIn(from, now, districtCodes, Limit.of(limit));
  }

  /**
   * Every district's reports in each of the last {@code weeks} seven-day windows up to now, all
   * symptom groups together, by district code. Index 0 is the current week, index 1 the week
   * before, and so on; a district with no reports at all is absent.
   */
  @Transactional(readOnly = true)
  public Map<String, long[]> weeklyTotalsByDistrict(int weeks) {
    Instant end = clock.instant();
    Map<String, long[]> totals = new HashMap<>();
    for (Object[] row : reports.countByDistrictAndWeek(end.minus(WEEK.multipliedBy(weeks)), end)) {
      totals
              .computeIfAbsent((String) row[0], code -> new long[weeks])[
              ((Number) row[1]).intValue()] =
          ((Number) row[2]).longValue();
    }
    return totals;
  }

  /** Reports per symptom group in each of the last {@code weeks} seven-day windows, up to now. */
  @Transactional(readOnly = true)
  public List<WeekCounts> weeklyCountsToNow(List<String> districtCodes, int weeks) {
    return weeklyCounts(districtCodes, clock.instant(), weeks);
  }

  /**
   * Reports per symptom group in each of the {@code weeks} seven-day windows ending at {@code end},
   * oldest first, so the last is [end - 7 days, end), summed over the given districts.
   */
  @Transactional(readOnly = true)
  public List<WeekCounts> weeklyCounts(List<String> districtCodes, Instant end, int weeks) {
    List<Map<SymptomGroup, Long>> counts = new ArrayList<>();
    for (int i = 0; i < weeks; i++) {
      Map<SymptomGroup, Long> week = new EnumMap<>(SymptomGroup.class);
      for (SymptomGroup group : SymptomGroup.values()) {
        week.put(group, 0L);
      }
      counts.add(week);
    }
    Instant start = end.minus(WEEK.multipliedBy(weeks));
    List<Object[]> rows =
        districtCodes == null
            ? reports.countByGroupAndWeek(start, end, null)
            : districtCodes.isEmpty()
                ? List.of()
                : reports.countByGroupAndWeek(start, end, String.join(",", districtCodes));
    for (Object[] row : rows) {
      int weeksAgo = ((Number) row[1]).intValue();
      counts
          .get(weeks - 1 - weeksAgo)
          .put(SymptomGroup.valueOf((String) row[0]), ((Number) row[2]).longValue());
    }
    List<WeekCounts> result = new ArrayList<>();
    for (int i = 0; i < weeks; i++) {
      Instant weekEnd = end.minus(WEEK.multipliedBy(weeks - 1 - i));
      result.add(new WeekCounts(weekEnd.minus(WEEK), weekEnd, counts.get(i)));
    }
    return result;
  }
}
