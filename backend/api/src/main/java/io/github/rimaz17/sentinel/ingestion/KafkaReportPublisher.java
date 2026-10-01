package io.github.rimaz17.sentinel.ingestion;

import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.ReportMessages;
import io.github.rimaz17.sentinel.reports.ReportTopics;
import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.stereotype.Component;

/**
 * Publishes each anonymised report to the reports topic, keyed by its district, and returns once
 * Kafka has written it. The stream processor stores it after, so ingestion never touches the
 * database. See docs/adr/0014-kafka-between-ingestion-and-storage.md.
 */
@Component
class KafkaReportPublisher implements ReportPublisher {

  private static final Logger log = LoggerFactory.getLogger(KafkaReportPublisher.class);

  /**
   * A last resort. The producer's own limits (application.yml) end a send in about six seconds, so
   * this is reached only if they somehow do not.
   */
  static final Duration GIVE_UP_AFTER = Duration.ofSeconds(10);

  private final KafkaOperations<String, byte[]> kafka;
  private final ReportMessages messages;

  KafkaReportPublisher(KafkaOperations<String, byte[]> kafka, ReportMessages messages) {
    this.kafka = kafka;
    this.messages = messages;
  }

  @Override
  public void publish(AnonymisedReport report) {
    try {
      kafka
          .send(ReportTopics.REPORTS, report.districtCode(), messages.write(report))
          .get(GIVE_UP_AFTER.toMillis(), TimeUnit.MILLISECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw unavailable(e);
    } catch (ExecutionException
        | TimeoutException
        | org.apache.kafka.common.KafkaException
        | org.springframework.kafka.KafkaException e) {
      throw unavailable(e);
    }
  }

  /** Logs why, without the report: its value is bytes, and only the failure's own words go out. */
  private static ReportsUnavailableException unavailable(Exception cause) {
    Throwable reason = cause instanceof ExecutionException ? cause.getCause() : cause;
    log.warn("A report could not be published to Kafka: {}", String.valueOf(reason));
    return new ReportsUnavailableException();
  }
}
