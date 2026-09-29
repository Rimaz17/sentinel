package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestReports;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;

/** The stream processor, fed directly through the reports topic. */
@IntegrationTest
class ReportStreamTest {

  private static final Duration PATIENCE = Duration.ofSeconds(30);
  private static final TopicPartition DEAD_LETTERS =
      new TopicPartition(ReportTopics.DEAD_LETTERS, 0);

  @Autowired KafkaTemplate<String, byte[]> kafka;
  @Autowired ConsumerFactory<String, byte[]> consumers;
  @Autowired ReportMessages messages;
  @Autowired JdbcTemplate jdbc;
  @Autowired TestReports testReports;

  @BeforeEach
  void clear() {
    testReports.clear();
  }

  @Test
  void storesAReportTakenOffTheStream() throws Exception {
    AnonymisedReport report = report("KDY");

    publish(report.districtCode(), messages.write(report));

    await().atMost(PATIENCE).until(() -> isStored(report.id()));
    Map<String, Object> row = jdbc.queryForMap("select * from reports where id = ?", report.id());
    assertThat(row.get("district_code")).isEqualTo("KDY");
    assertThat(row.get("age_band")).isEqualTo("40-49");
    assertThat(row.get("stored_at")).isNotNull();
  }

  @Test
  void storesAReportDeliveredTwiceOnce() throws Exception {
    AnonymisedReport report = report("KDY");

    publish(report.districtCode(), messages.write(report));
    publish(report.districtCode(), messages.write(report));
    testReports.awaitStreamStored();

    assertThat(jdbc.queryForObject("select count(*) from reports", Long.class)).isOne();
  }

  @Test
  void setsAsideAMessageThatIsNotAReportAndCarriesOn() throws Exception {
    long deadLettersBefore = endOf(DEAD_LETTERS);
    AnonymisedReport after = report("KDY");

    publish("KDY", "not a report".getBytes(StandardCharsets.UTF_8));
    publish("KDY", messages.write(after));

    await().atMost(PATIENCE).until(() -> isStored(after.id()));
    assertThat(deadLettersFrom(deadLettersBefore))
        .extracting(message -> new String(message.value(), StandardCharsets.UTF_8))
        .containsExactly("not a report");
  }

  @Test
  void setsAsideAReportTheDatabaseRefusesAndCarriesOn() throws Exception {
    long deadLettersBefore = endOf(DEAD_LETTERS);
    AnonymisedReport noSuchDistrict = report("XXX");
    AnonymisedReport after = report("KDY");

    publish("XXX", messages.write(noSuchDistrict));
    publish("KDY", messages.write(after));

    await().atMost(PATIENCE).until(() -> isStored(after.id()));
    List<ConsumerRecord<String, byte[]>> deadLetters = deadLettersFrom(deadLettersBefore);
    assertThat(deadLetters).hasSize(1);
    assertThat(messages.read(deadLetters.get(0).value()).id()).isEqualTo(noSuchDistrict.id());
    assertThat(isStored(noSuchDistrict.id())).isFalse();
  }

  private void publish(String key, byte[] message) throws Exception {
    kafka.send(ReportTopics.REPORTS, key, message).get();
  }

  private boolean isStored(UUID id) {
    return jdbc.queryForObject("select count(*) from reports where id = ?", Long.class, id) == 1;
  }

  private long endOf(TopicPartition partition) {
    try (Consumer<String, byte[]> consumer =
        consumers.createConsumer("test-" + UUID.randomUUID(), null)) {
      return consumer.endOffsets(List.of(partition)).get(partition);
    }
  }

  /** The dead letters from an offset on, once the stream processor has handled everything. */
  private List<ConsumerRecord<String, byte[]>> deadLettersFrom(long offset) {
    testReports.awaitStreamStored();
    List<ConsumerRecord<String, byte[]>> found = new ArrayList<>();
    try (Consumer<String, byte[]> consumer =
        consumers.createConsumer("test-" + UUID.randomUUID(), null)) {
      consumer.assign(List.of(DEAD_LETTERS));
      consumer.seek(DEAD_LETTERS, offset);
      long end = consumer.endOffsets(List.of(DEAD_LETTERS)).get(DEAD_LETTERS);
      Instant giveUp = Instant.now().plus(PATIENCE);
      while (consumer.position(DEAD_LETTERS) < end && Instant.now().isBefore(giveUp)) {
        consumer.poll(Duration.ofMillis(200)).forEach(found::add);
      }
    }
    return found;
  }

  private AnonymisedReport report(String districtCode) {
    long facilityId =
        jdbc.queryForObject("select id from facilities where code = 'LKY0001016'", Long.class);
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    return new AnonymisedReport(
        UUID.randomUUID(),
        facilityId,
        districtCode,
        SymptomGroup.DENGUE_LIKE,
        AgeBand.AGE_40_49,
        null,
        null,
        now.minusSeconds(3600),
        now);
  }
}
