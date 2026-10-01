package io.github.rimaz17.sentinel.reports;

import java.time.Instant;
import java.util.UUID;

/** A report as the seven-day windows hold it: which window, and when it presented. */
public record WindowEntry(
    UUID id, String districtCode, SymptomGroup symptomGroup, Instant reportedAt) {

  static WindowEntry of(AnonymisedReport report) {
    return new WindowEntry(
        report.id(), report.districtCode(), report.symptomGroup(), report.reportedAt());
  }
}
