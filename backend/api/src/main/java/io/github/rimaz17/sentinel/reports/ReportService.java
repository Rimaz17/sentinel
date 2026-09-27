package io.github.rimaz17.sentinel.reports;

import io.github.rimaz17.sentinel.facilities.FacilityService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReportService {

  private final ReportRepository reports;
  private final FacilityService facilities;

  ReportService(ReportRepository reports, FacilityService facilities) {
    this.reports = reports;
    this.facilities = facilities;
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

  /** How many reports each district has, by when the patient presented, in [from, to). */
  @Transactional(readOnly = true)
  public Map<String, Long> countsByDistrict(Instant from, Instant to) {
    return reports.countByDistrict(from, to).stream()
        .collect(Collectors.toMap(row -> (String) row[0], row -> (Long) row[1]));
  }
}
