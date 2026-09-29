package io.github.rimaz17.sentinel.ingestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.TestReports;
import io.github.rimaz17.sentinel.reports.ReportTopics;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.test.web.servlet.MockMvc;

/** What ingestion puts on the reports topic, read straight off it. */
@IntegrationTest
class IngestionStreamTest {

  private static final String NAME = "Nimali Perera";
  private static final String NIC = "198912345678";
  private static final String DATE_OF_BIRTH = "1989-04-17";
  private static final String PHONE = "0771234567";
  private static final String ADDRESS = "12 Temple Road, Kandy";

  private static final List<TopicPartition> PARTITIONS =
      IntStream.range(0, ReportTopics.PARTITIONS)
          .mapToObj(partition -> new TopicPartition(ReportTopics.REPORTS, partition))
          .toList();

  @Autowired MockMvc mvc;
  @Autowired ConsumerFactory<String, byte[]> consumers;
  @Autowired TestReports testReports;

  @BeforeEach
  void clear() {
    testReports.clear();
  }

  @Test
  void publishesTheAnonymisedReportKeyedByItsDistrict() throws Exception {
    try (Consumer<String, byte[]> consumer =
        consumers.createConsumer("test-" + UUID.randomUUID(), null)) {
      consumer.assign(PARTITIONS);
      consumer.seekToEnd(PARTITIONS);
      PARTITIONS.forEach(consumer::position);

      String reportId = submit();

      ConsumerRecord<String, byte[]> message = find(consumer, reportId);
      assertThat(message.key()).isEqualTo("KDY");
      assertThat(new String(message.value(), StandardCharsets.UTF_8))
          .contains("\"districtCode\":\"KDY\"", "\"ageBand\":\"30-39\"", "\"latitude\":7.291")
          .doesNotContain(NAME, NIC, DATE_OF_BIRTH, PHONE, ADDRESS)
          .doesNotContain("7.2912345", "80.6337499", "\"age\"");
    }
  }

  private String submit() throws Exception {
    String body =
        mvc.perform(
                post("/api/ingestion/reports")
                    .header(TestAccounts.FEED_KEY_HEADER, TestAccounts.FEED_KEY)
                    .header("X-Facility-Code", "LKY0001016")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(report()))
            .andExpect(status().isAccepted())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return body.replaceAll(".*\"reportId\":\"([^\"]+)\".*", "$1");
  }

  private static ConsumerRecord<String, byte[]> find(
      Consumer<String, byte[]> consumer, String reportId) {
    Instant giveUp = Instant.now().plusSeconds(30);
    while (Instant.now().isBefore(giveUp)) {
      for (ConsumerRecord<String, byte[]> message : consumer.poll(Duration.ofMillis(200))) {
        if (new String(message.value(), StandardCharsets.UTF_8).contains(reportId)) {
          return message;
        }
      }
    }
    throw new AssertionError("The report never appeared on the reports topic");
  }

  private static String report() {
    OffsetDateTime reportedAt =
        OffsetDateTime.now(ZoneOffset.ofHoursMinutes(5, 30))
            .minusHours(2)
            .truncatedTo(ChronoUnit.SECONDS);
    return """
        {
          "symptomGroup": "DENGUE_LIKE",
          "reportedAt": "%s",
          "age": 37,
          "latitude": 7.2912345,
          "longitude": 80.6337499,
          "patientName": "%s",
          "nicNumber": "%s",
          "dateOfBirth": "%s",
          "phoneNumber": "%s",
          "homeAddress": "%s"
        }
        """
        .formatted(reportedAt, NAME, NIC, DATE_OF_BIRTH, PHONE, ADDRESS);
  }
}
