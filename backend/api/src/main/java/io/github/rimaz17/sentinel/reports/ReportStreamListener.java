package io.github.rimaz17.sentinel.reports;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * The stream processor: takes each report off the reports topic and stores it. Storing is
 * idempotent, so a report delivered again, after a failure or a restart, is stored once.
 */
@Component
class ReportStreamListener {

  private final ReportMessages messages;
  private final ReportService reports;

  ReportStreamListener(ReportMessages messages, ReportService reports) {
    this.messages = messages;
    this.reports = reports;
  }

  @KafkaListener(
      id = "report-store",
      groupId = ReportTopics.STORE_GROUP,
      topics = ReportTopics.REPORTS,
      concurrency = "3")
  void store(byte[] message) {
    reports.record(messages.read(message));
  }
}
