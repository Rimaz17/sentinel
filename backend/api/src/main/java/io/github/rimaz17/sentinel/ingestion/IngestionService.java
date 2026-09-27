package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.facilities.FacilityService;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;

/** Validates, anonymises and publishes a report on behalf of the submitting facility. */
@Service
public class IngestionService {

  /** Tolerance for a submitting system's clock running ahead of ours. */
  static final Duration CLOCK_SKEW = Duration.ofMinutes(5);

  /** Detection looks back nine weeks; a year allows late returns without accepting junk. */
  static final Duration OLDEST_REPORT = Duration.ofDays(366);

  private final FacilityService facilities;
  private final Anonymiser anonymiser;
  private final ReportPublisher publisher;
  private final Clock clock;

  IngestionService(
      FacilityService facilities, Anonymiser anonymiser, ReportPublisher publisher, Clock clock) {
    this.facilities = facilities;
    this.anonymiser = anonymiser;
    this.publisher = publisher;
    this.clock = clock;
  }

  ReportReceipt submit(String facilityCode, ReportSubmission submission) {
    Facility facility =
        facilities.findByCode(facilityCode).orElseThrow(UnknownFacilityException::new);

    Instant now = clock.instant();
    Instant reportedAt = submission.reportedAt().toInstant();
    if (reportedAt.isAfter(now.plus(CLOCK_SKEW))) {
      throw new InvalidReportException("reportedAt", "must not be in the future");
    }
    if (reportedAt.isBefore(now.minus(OLDEST_REPORT))) {
      throw new InvalidReportException("reportedAt", "must be within the last 366 days");
    }

    AnonymisedReport report =
        anonymiser.anonymise(submission, facility.getId(), facility.getDistrictCode(), now);
    publisher.publish(report);
    return new ReportReceipt(report.id(), report.receivedAt());
  }
}
