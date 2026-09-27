package io.github.rimaz17.sentinel.reports;

import io.github.rimaz17.sentinel.facilities.FacilityService;
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
}
