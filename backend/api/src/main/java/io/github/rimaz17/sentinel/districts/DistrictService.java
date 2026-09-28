package io.github.rimaz17.sentinel.districts;

import io.github.rimaz17.sentinel.alerts.AlertService;
import io.github.rimaz17.sentinel.reports.ReportService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DistrictService {

  static final Duration WEEK = Duration.ofDays(7);

  private final DistrictRepository districts;
  private final ReportService reports;
  private final AlertService alerts;
  private final Clock clock;

  DistrictService(
      DistrictRepository districts, ReportService reports, AlertService alerts, Clock clock) {
    this.districts = districts;
    this.reports = reports;
    this.alerts = alerts;
    this.clock = clock;
  }

  /** Every district, alphabetically by name. */
  public List<District> all() {
    return districts.findAllByOrderByNameAsc();
  }

  public Optional<District> findByCode(String code) {
    return districts.findById(code);
  }

  /**
   * Every district's current activity, alphabetically, including districts with no reports or
   * alerts at all. The seven days run up to now rather than to the detector's last check, so a
   * report shows here as soon as it is stored.
   */
  public List<DistrictActivity> activity() {
    Instant now = clock.instant();
    Map<String, Long> reportCounts = reports.countsByDistrict(now.minus(WEEK), now);
    Map<String, Long> openAlerts = alerts.openCountsByDistrict();
    return all().stream()
        .map(
            district ->
                new DistrictActivity(
                    district,
                    reportCounts.getOrDefault(district.getCode(), 0L),
                    openAlerts.getOrDefault(district.getCode(), 0L)))
        .toList();
  }
}
