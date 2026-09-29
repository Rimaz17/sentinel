package io.github.rimaz17.sentinel;

import static org.awaitility.Awaitility.await;

import io.github.rimaz17.sentinel.reports.ReportTopics;
import java.time.Duration;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.admin.ListOffsetsResult.ListOffsetsResultInfo;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaAdmin;

/**
 * Reports for integration tests. Storage happens after ingestion replies, on the stream processor's
 * own threads, so a test that clears the reports first waits for every report already on the stream
 * to be stored: otherwise one published by the test before would land in this one.
 */
@TestComponent
public class TestReports {

  private static final Duration PATIENCE = Duration.ofSeconds(30);

  private final JdbcTemplate jdbc;
  private final KafkaAdmin kafkaAdmin;

  TestReports(JdbcTemplate jdbc, KafkaAdmin kafkaAdmin) {
    this.jdbc = jdbc;
    this.kafkaAdmin = kafkaAdmin;
  }

  /** Waits for the stream to be stored, then removes every stored report. */
  public void clear() {
    awaitStreamStored();
    jdbc.update("delete from reports");
  }

  /** Waits until the stream processor has handled every message on the reports topic. */
  public void awaitStreamStored() {
    await().atMost(PATIENCE).until(() -> unhandledMessages() == 0);
  }

  private long unhandledMessages() throws Exception {
    try (Admin admin = Admin.create(kafkaAdmin.getConfigurationProperties())) {
      Map<TopicPartition, OffsetSpec> latest =
          IntStream.range(0, ReportTopics.PARTITIONS)
              .mapToObj(partition -> new TopicPartition(ReportTopics.REPORTS, partition))
              .collect(Collectors.toMap(partition -> partition, partition -> OffsetSpec.latest()));
      Map<TopicPartition, ListOffsetsResultInfo> ends = admin.listOffsets(latest).all().get();
      Map<TopicPartition, OffsetAndMetadata> handled =
          admin
              .listConsumerGroupOffsets(ReportTopics.STORE_GROUP)
              .partitionsToOffsetAndMetadata()
              .get();
      long unhandled = 0;
      for (Map.Entry<TopicPartition, ListOffsetsResultInfo> end : ends.entrySet()) {
        OffsetAndMetadata done = handled.get(end.getKey());
        unhandled += end.getValue().offset() - (done == null ? 0 : done.offset());
      }
      return unhandled;
    }
  }
}
