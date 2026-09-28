package io.github.rimaz17.sentinel.reports;

import io.github.rimaz17.sentinel.facilities.FacilityService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReportService {

  static final Duration WEEK = Duration.ofDays(7);

  private final ReportRepository reports;
  private final FacilityService facilities;
  private final Clock clock;

  ReportService(ReportRepository reports, FacilityService facilities, Clock clock) {
    this.reports = reports;
    this.facilities = facilities;
    this.clock = clock;
  }

  /** Stores a report that has already been through ingestion's anonymiser. */
  public void record(AnonymisedReport report) {
    reports.save(new Report(report, facilities.reference(report.facilityId())));
  }

  /**
   * The most recently reported first, by when the patient presented rather than when it arrived.
   */
  @Transactional(readOnly = true)
  public List<Report> recent(int limit) {
    return reports.findAllByOrderByReportedAtDescIdDesc(Limit.of(limit));
  }

  @Transactional(readOnly = true)
  public List<Report> recentInDistrict(String districtCode, int limit) {
    return reports.findByDistrictCodeOrderByReportedAtDescIdDesc(districtCode, Limit.of(limit));
  }

  /**
   * Reports with a location that presented within the last {@code days} days, newest first, at most
   * {@code limit}. A null district means the whole country.
   */
  @Transactional(readOnly = true)
  public List<Report> locatedWithin(String districtCode, int days, int limit) {
    Instant now = clock.instant();
    return reports.findLocated(
        now.minus(Duration.ofDays(days)), now, districtCode, Limit.of(limit));
  }

  /** How many reports each district has, by when the patient presented, in [from, to). */
  @Transactional(readOnly = true)
  public Map<String, Long> countsByDistrict(Instant from, Instant to) {
    return reports.countByDistrict(from, to).stream()
        .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
  }

  /** Reports per symptom group in each of the last {@code weeks} seven-day windows, up to now. */
  @Transactional(readOnly = true)
  public List<WeekCounts> weeklyCountsToNow(String districtCode, int weeks) {
    return weeklyCounts(districtCode, clock.instant(), weeks);
  }

  /**
   * Reports per symptom group in each of the {@code weeks} seven-day windows ending at {@code end},
   * oldest first, so the last is [end - 7 days, end). A null district counts the whole country.
   */
  @Transactional(readOnly = true)
  public List<WeekCounts> weeklyCounts(String districtCode, Instant end, int weeks) {
    List<Map<SymptomGroup, Long>> counts = new ArrayList<>();
    for (int i = 0; i < weeks; i++) {
      Map<SymptomGroup, Long> week = new EnumMap<>(SymptomGroup.class);
      for (SymptomGroup group : SymptomGroup.values()) {
        week.put(group, 0L);
      }
      counts.add(week);
    }
    Instant start = end.minus(WEEK.multipliedBy(weeks));
    for (Object[] row : reports.countByGroupAndWeek(start, end, districtCode)) {
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
