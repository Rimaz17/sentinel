package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.ReportService;
import org.springframework.stereotype.Component;

/** Hands each report straight to storage, in the request, until Kafka sits between them. */
@Component
class DirectReportPublisher implements ReportPublisher {

  private final ReportService reports;

  DirectReportPublisher(ReportService reports) {
    this.reports = reports;
  }

  @Override
  public void publish(AnonymisedReport report) {
    reports.record(report);
  }
}
