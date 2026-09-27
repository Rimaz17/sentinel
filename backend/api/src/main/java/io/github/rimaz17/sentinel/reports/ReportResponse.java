package io.github.rimaz17.sentinel.reports;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** A stored report as the internal API shows it: already anonymised, so nothing is withheld. */
record ReportResponse(
    UUID id,
    String facilityCode,
    String districtCode,
    SymptomGroup symptomGroup,
    AgeBand ageBand,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant reportedAt,
    Instant receivedAt) {

  static ReportResponse from(Report report) {
    return new ReportResponse(
        report.getId(),
        report.getFacility().getCode(),
        report.getDistrictCode(),
        report.getSymptomGroup(),
        report.getAgeBand(),
        report.getLatitude(),
        report.getLongitude(),
        report.getReportedAt(),
        report.getReceivedAt());
  }
}
