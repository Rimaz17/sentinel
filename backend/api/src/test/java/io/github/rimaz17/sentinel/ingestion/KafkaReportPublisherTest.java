package io.github.rimaz17.sentinel.ingestion;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.github.rimaz17.sentinel.reports.AgeBand;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.ReportMessages;
import io.github.rimaz17.sentinel.reports.ReportTopics;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.apache.kafka.common.errors.TimeoutException;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.support.SendResult;

class KafkaReportPublisherTest {

  @SuppressWarnings("unchecked")
  private final KafkaOperations<String, byte[]> kafka = mock(KafkaOperations.class);

  private final ReportMessages messages = new ReportMessages();
  private final KafkaReportPublisher publisher = new KafkaReportPublisher(kafka, messages);
  private final AnonymisedReport report =
      new AnonymisedReport(
          UUID.randomUUID(),
          7,
          "KDY",
          SymptomGroup.DENGUE_LIKE,
          AgeBand.AGE_30_39,
          null,
          null,
          Instant.parse("2026-09-30T04:00:00Z"),
          Instant.parse("2026-09-30T04:01:00Z"));

  @Test
  void publishesTheReportKeyedByItsDistrict() {
    when(kafka.send(anyString(), anyString(), any(byte[].class)))
        .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));

    assertThatCode(() -> publisher.publish(report)).doesNotThrowAnyException();

    verify(kafka).send(ReportTopics.REPORTS, "KDY", messages.write(report));
  }

  @Test
  void refusesTheReportWhenKafkaDoesNotTakeIt() {
    when(kafka.send(anyString(), anyString(), any(byte[].class)))
        .thenReturn(
            CompletableFuture.failedFuture(
                new TimeoutException("Topic sentinel.reports not present in metadata")));

    assertThatThrownBy(() -> publisher.publish(report))
        .isInstanceOf(ReportsUnavailableException.class)
        .hasMessage("Reports cannot be accepted right now. Try again shortly.");
  }

  @Test
  void refusesTheReportWhenSendingFailsAtOnce() {
    when(kafka.send(anyString(), anyString(), any(byte[].class)))
        .thenThrow(new org.apache.kafka.common.KafkaException("producer closed"));

    assertThatThrownBy(() -> publisher.publish(report))
        .isInstanceOf(ReportsUnavailableException.class);
  }
}
