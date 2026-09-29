package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.rimaz17.sentinel.IntegrationTest;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@IntegrationTest
class ReportStorageTest {

  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void clear() {
    jdbc.update("delete from reports");
  }

  @Test
  void storesAnAnonymisedReport() {
    Instant reportedAt = Instant.now().minus(2, ChronoUnit.HOURS).truncatedTo(ChronoUnit.MICROS);
    UUID id = UUID.randomUUID();

    reports.record(
        new AnonymisedReport(
            id,
            facilityId("LAP0000059"),
            "AMP",
            SymptomGroup.DENGUE_LIKE,
            AgeBand.AGE_30_39,
            new BigDecimal("7.298"),
            new BigDecimal("81.691"),
            reportedAt,
            reportedAt.plusSeconds(60)));

    Map<String, Object> row = jdbc.queryForMap("select * from reports where id = ?", id);
    assertThat(row.get("district_code")).isEqualTo("AMP");
    assertThat(row.get("symptom_group")).isEqualTo("DENGUE_LIKE");
    assertThat(row.get("age_band")).isEqualTo("30-39");
    assertThat(row.get("latitude")).isEqualTo(new BigDecimal("7.298"));
    assertThat(row.get("longitude")).isEqualTo(new BigDecimal("81.691"));
  }

  @Test
  void theDatabaseRoundsLocationEvenIfGivenMorePrecision() {
    UUID id = UUID.randomUUID();
    Instant now = Instant.now();

    reports.record(
        new AnonymisedReport(
            id,
            facilityId("LAP0000059"),
            "AMP",
            SymptomGroup.INFLUENZA_LIKE,
            AgeBand.AGE_0_9,
            new BigDecimal("7.2983341"),
            new BigDecimal("81.6908412"),
            now,
            now));

    Map<String, Object> row =
        jdbc.queryForMap("select latitude, longitude from reports where id = ?", id);
    assertThat(row.get("latitude")).isEqualTo(new BigDecimal("7.298"));
    assertThat(row.get("longitude")).isEqualTo(new BigDecimal("81.691"));
  }

  @Test
  void storesAReportDeliveredTwiceOnce() {
    Instant now = Instant.now();
    AnonymisedReport report =
        new AnonymisedReport(
            UUID.randomUUID(),
            facilityId("LAP0000059"),
            "AMP",
            SymptomGroup.GASTROINTESTINAL,
            AgeBand.AGE_60_69,
            null,
            null,
            now,
            now);

    assertThat(reports.record(report)).isTrue();
    assertThat(reports.record(report)).isFalse();

    assertThat(jdbc.queryForObject("select count(*) from reports", Long.class)).isOne();
  }

  @Test
  void notesWhenItStoredAReport() {
    Instant receivedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    UUID id = UUID.randomUUID();

    reports.record(
        new AnonymisedReport(
            id,
            facilityId("LAP0000059"),
            "AMP",
            SymptomGroup.DENGUE_LIKE,
            AgeBand.AGE_20_29,
            null,
            null,
            receivedAt.minusSeconds(600),
            receivedAt));

    Instant storedAt =
        jdbc.queryForObject("select stored_at from reports where id = ?", Instant.class, id);
    assertThat(storedAt).isBetween(receivedAt, Instant.now());
  }

  @Test
  void theReportsTableHasNoColumnForIdentity() {
    assertThat(
            jdbc.queryForList(
                """
                select column_name from information_schema.columns
                where table_name = 'reports' order by ordinal_position
                """,
                String.class))
        .containsExactly(
            "id",
            "facility_id",
            "district_code",
            "symptom_group",
            "age_band",
            "latitude",
            "longitude",
            "reported_at",
            "received_at",
            "stored_at");
  }

  private long facilityId(String code) {
    return jdbc.queryForObject("select id from facilities where code = ?", Long.class, code);
  }
}
