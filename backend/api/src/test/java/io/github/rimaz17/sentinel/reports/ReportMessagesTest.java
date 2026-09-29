package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ReportMessagesTest {

  private final ReportMessages messages = new ReportMessages();

  @Test
  void readsBackExactlyTheReportItWrote() {
    AnonymisedReport report = report(new BigDecimal("7.290"), new BigDecimal("80.634"));

    AnonymisedReport read = messages.read(messages.write(report));

    assertThat(read).isEqualTo(report);
    assertThat(read.latitude().scale()).isEqualTo(3);
  }

  @Test
  void carriesTheAnonymisedFieldsAndNothingElse() {
    JsonNode message =
        JsonMapper.builder()
            .build()
            .readTree(messages.write(report(new BigDecimal("7.291"), new BigDecimal("80.634"))));

    assertThat(message.propertyNames())
        .containsExactlyInAnyOrder(
            "id",
            "facilityId",
            "districtCode",
            "symptomGroup",
            "ageBand",
            "latitude",
            "longitude",
            "reportedAt",
            "receivedAt");
    assertThat(message.get("ageBand").asString()).isEqualTo("30-39");
  }

  @Test
  void readsAReportWithoutALocation() {
    AnonymisedReport report = report(null, null);

    assertThat(messages.read(messages.write(report))).isEqualTo(report);
  }

  @Test
  void refusesAMessageThatIsNotJson() {
    assertThatThrownBy(() -> messages.read("not json".getBytes(StandardCharsets.UTF_8)))
        .isInstanceOf(MalformedReportMessageException.class)
        .hasMessage("A report message is not JSON of an anonymised report.");
  }

  @Test
  void refusesAMessageWithNoValue() {
    assertThatThrownBy(() -> messages.read(null))
        .isInstanceOf(MalformedReportMessageException.class);
  }

  @Test
  void refusesAMessageMissingARequiredField() {
    String withoutDistrict =
        new String(
                messages.write(report(new BigDecimal("7.291"), new BigDecimal("80.634"))),
                StandardCharsets.UTF_8)
            .replace("\"districtCode\":\"KDY\",", "");

    assertThatThrownBy(() -> messages.read(withoutDistrict.getBytes(StandardCharsets.UTF_8)))
        .isInstanceOf(MalformedReportMessageException.class)
        .hasMessage("A report message is missing a required field.");
  }

  @Test
  void refusesALatitudeWithoutALongitude() {
    byte[] halfLocated = messages.write(report(new BigDecimal("7.291"), null));

    assertThatThrownBy(() -> messages.read(halfLocated))
        .isInstanceOf(MalformedReportMessageException.class);
  }

  @Test
  void neverQuotesTheMessageWhenRefusingIt() {
    assertThatThrownBy(() -> messages.read("{\"id\": \"Nimali Perera\"}".getBytes()))
        .isInstanceOf(MalformedReportMessageException.class)
        .hasNoCause()
        .message()
        .doesNotContain("Nimali");
  }

  private static AnonymisedReport report(BigDecimal latitude, BigDecimal longitude) {
    return new AnonymisedReport(
        UUID.fromString("7d1f0c2e-3a4b-4c5d-8e6f-0a1b2c3d4e5f"),
        42,
        "KDY",
        SymptomGroup.DENGUE_LIKE,
        AgeBand.AGE_30_39,
        latitude,
        longitude,
        Instant.parse("2026-09-30T04:10:00Z"),
        Instant.parse("2026-09-30T04:12:30.123456Z"));
  }
}
