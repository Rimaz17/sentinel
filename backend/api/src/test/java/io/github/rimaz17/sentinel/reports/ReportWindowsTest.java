package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestReports;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

/** The live seven-day counts, kept in Redis and rebuilt from storage when Redis loses them. */
@IntegrationTest
class ReportWindowsTest {

  private static final List<String> KANDY_AND_COLOMBO = List.of("KDY", "CMB");

  @Autowired ReportService reports;
  @Autowired ReportWindows windows;
  @Autowired StringRedisTemplate redis;
  @Autowired JdbcTemplate jdbc;
  @Autowired TestReports testReports;

  @BeforeEach
  void clear() {
    testReports.clear();
  }

  @Test
  void countsEachDistrictsReportsOverTheSevenDaysUpToNow() {
    Instant now = Instant.now();
    record("KDY", SymptomGroup.DENGUE_LIKE, now.minus(1, ChronoUnit.HOURS));
    record("KDY", SymptomGroup.INFLUENZA_LIKE, now.minus(Duration.ofDays(7).minusMinutes(5)));
    record("CMB", SymptomGroup.GASTROINTESTINAL, now.minus(3, ChronoUnit.DAYS));
    // Too old for the window, though stored.
    record("KDY", SymptomGroup.DENGUE_LIKE, now.minus(Duration.ofDays(7).plusMinutes(5)));

    assertThat(reports.countsLast7Days(List.of("KDY", "CMB", "JAF")))
        .containsEntry("KDY", 2L)
        .containsEntry("CMB", 1L)
        .containsEntry("JAF", 0L);
  }

  @Test
  void neverAddsAReportTooOldForTheWindow() {
    Instant now = Instant.now();
    record("KDY", SymptomGroup.DENGUE_LIKE, now.minus(Duration.ofDays(7).plusMinutes(5)));

    assertThat(redis.hasKey(ReportWindows.key("KDY", SymptomGroup.DENGUE_LIKE))).isFalse();
  }

  @Test
  void countsAReportRecordedTwiceOnce() {
    AnonymisedReport report =
        report("KDY", SymptomGroup.DENGUE_LIKE, Instant.now().minus(1, ChronoUnit.HOURS));

    reports.record(report);
    reports.record(report);

    assertThat(reports.countsLast7Days(KANDY_AND_COLOMBO)).containsEntry("KDY", 1L);
  }

  @Test
  void rebuildsTheWindowsFromStorageWhenRedisHasLostThem() {
    Instant now = Instant.now();
    record("KDY", SymptomGroup.DENGUE_LIKE, now.minus(1, ChronoUnit.HOURS));
    record("KDY", SymptomGroup.LEPTOSPIROSIS_LIKE, now.minus(2, ChronoUnit.DAYS));
    record("CMB", SymptomGroup.DENGUE_LIKE, now.minus(6, ChronoUnit.DAYS));
    record("CMB", SymptomGroup.DENGUE_LIKE, now.minus(9, ChronoUnit.DAYS));
    assertThat(reports.countsLast7Days(KANDY_AND_COLOMBO))
        .containsEntry("KDY", 2L)
        .containsEntry("CMB", 1L);

    testReports.emptyRedis();

    assertThat(reports.countsLast7Days(KANDY_AND_COLOMBO))
        .containsEntry("KDY", 2L)
        .containsEntry("CMB", 1L);
    assertThat(redis.hasKey(ReportWindows.COMPLETE)).isTrue();
  }

  @Test
  void keepsCountingReportsStoredWhileTheWindowsAreIncomplete() {
    testReports.emptyRedis();
    record("KDY", SymptomGroup.DENGUE_LIKE, Instant.now().minus(1, ChronoUnit.HOURS));

    assertThat(reports.countsLast7Days(KANDY_AND_COLOMBO)).containsEntry("KDY", 1L);

    record("KDY", SymptomGroup.DENGUE_LIKE, Instant.now().minus(2, ChronoUnit.HOURS));

    assertThat(reports.countsLast7Days(KANDY_AND_COLOMBO)).containsEntry("KDY", 2L);
  }

  @Test
  void dropsReportsThatHaveAgedOutOfAWindowWhenTheNextArrives() {
    Instant now = Instant.now();
    String key = ReportWindows.key("KDY", SymptomGroup.DENGUE_LIKE);
    windows.add(entry(now.minus(1, ChronoUnit.HOURS)), now);
    windows.add(entry(now.minus(2, ChronoUnit.HOURS)), now);
    assertThat(redis.opsForZSet().size(key)).isEqualTo(2);

    Instant eightDaysOn = now.plus(8, ChronoUnit.DAYS);
    windows.add(entry(eightDaysOn.minus(1, ChronoUnit.HOURS)), eightDaysOn);

    assertThat(redis.opsForZSet().size(key)).isOne();
  }

  @Test
  void countsAReportAtTheStartOfTheWindowButNotOneAtItsEnd() {
    Instant from = Instant.parse("2026-09-23T10:00:00Z");
    Instant to = from.plus(7, ChronoUnit.DAYS);
    windows.add(entry(from), to);
    windows.add(entry(to), to);
    windows.rebuild(List.of());

    assertThat(windows.counts(List.of("KDY"), from, to))
        .hasValueSatisfying(counts -> assertThat(counts).containsEntry("KDY", 1L));
  }

  @Test
  void saysTheWindowsAreIncompleteUntilRebuilt() {
    testReports.emptyRedis();
    Instant now = Instant.now();

    assertThat(windows.counts(List.of("KDY"), now.minus(7, ChronoUnit.DAYS), now)).isEmpty();
  }

  private void record(String district, SymptomGroup group, Instant reportedAt) {
    reports.record(report(district, group, reportedAt));
  }

  private AnonymisedReport report(String district, SymptomGroup group, Instant reportedAt) {
    long facilityId =
        jdbc.queryForObject(
            "select id from facilities where district_code = ? order by code limit 1",
            Long.class,
            district);
    return new AnonymisedReport(
        UUID.randomUUID(),
        facilityId,
        district,
        group,
        AgeBand.AGE_20_29,
        null,
        null,
        reportedAt,
        Instant.now());
  }

  private static WindowEntry entry(Instant reportedAt) {
    return new WindowEntry(UUID.randomUUID(), "KDY", SymptomGroup.DENGUE_LIKE, reportedAt);
  }
}
