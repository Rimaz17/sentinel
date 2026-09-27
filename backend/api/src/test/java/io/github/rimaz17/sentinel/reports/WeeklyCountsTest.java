package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Weekly counts for the per-area chart, bucketed exactly as the detector buckets them. */
@IntegrationTest
class WeeklyCountsTest {

  private static final Instant END = Instant.parse("2026-09-28T10:00:00Z");
  private static final Duration WEEK = Duration.ofDays(7);

  @Autowired MockMvc mvc;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void clear() {
    jdbc.update("delete from reports");
  }

  @Test
  void returnsNineWeeksOldestFirstEndingAtTheGivenMoment() {
    List<WeekCounts> weeks = reports.weeklyCounts("KDY", END, 9);

    assertThat(weeks).hasSize(9);
    assertThat(weeks.get(8).end()).isEqualTo(END);
    assertThat(weeks.get(8).start()).isEqualTo(END.minus(WEEK));
    assertThat(weeks.get(0).start()).isEqualTo(END.minus(WEEK.multipliedBy(9)));
    for (int i = 1; i < 9; i++) {
      assertThat(weeks.get(i).start()).isEqualTo(weeks.get(i - 1).end());
    }
  }

  @Test
  void fillsEveryGroupWithZeroWhenThereAreNoReports() {
    List<WeekCounts> weeks = reports.weeklyCounts("KDY", END, 9);

    assertThat(weeks)
        .allSatisfy(
            week ->
                assertThat(week.counts())
                    .containsOnlyKeys(SymptomGroup.values())
                    .allSatisfy((group, count) -> assertThat(count).isZero()));
  }

  @Test
  void putsEachReportInItsWeekAndGroup() {
    store("KDY", SymptomGroup.DENGUE_LIKE, END.minus(Duration.ofHours(1)));
    store("KDY", SymptomGroup.DENGUE_LIKE, END.minus(Duration.ofDays(6)));
    store("KDY", SymptomGroup.INFLUENZA_LIKE, END.minus(Duration.ofDays(8)));
    store("KDY", SymptomGroup.GASTROINTESTINAL, END.minus(Duration.ofDays(62)));

    List<WeekCounts> weeks = reports.weeklyCounts("KDY", END, 9);

    assertThat(weeks.get(8).counts().get(SymptomGroup.DENGUE_LIKE)).isEqualTo(2);
    assertThat(weeks.get(7).counts().get(SymptomGroup.INFLUENZA_LIKE)).isEqualTo(1);
    assertThat(weeks.get(0).counts().get(SymptomGroup.GASTROINTESTINAL)).isEqualTo(1);
  }

  @Test
  void treatsEachWeekAsIncludingItsStartAndExcludingItsEnd() {
    // Exactly seven days before the end: the first moment of the current week.
    store("KDY", SymptomGroup.DENGUE_LIKE, END.minus(WEEK));
    // Exactly at the end: not yet counted.
    store("KDY", SymptomGroup.DENGUE_LIKE, END);
    // Exactly nine weeks before the end: the first moment of the oldest week.
    store("KDY", SymptomGroup.DENGUE_LIKE, END.minus(WEEK.multipliedBy(9)));

    List<WeekCounts> weeks = reports.weeklyCounts("KDY", END, 9);

    assertThat(weeks.get(8).counts().get(SymptomGroup.DENGUE_LIKE)).isEqualTo(1);
    assertThat(weeks.get(7).counts().get(SymptomGroup.DENGUE_LIKE)).isZero();
    assertThat(weeks.get(0).counts().get(SymptomGroup.DENGUE_LIKE)).isEqualTo(1);
  }

  @Test
  void countsOneDistrictOrTheWholeCountry() {
    store("KDY", SymptomGroup.DENGUE_LIKE, END.minus(Duration.ofHours(1)));
    store("CMB", SymptomGroup.DENGUE_LIKE, END.minus(Duration.ofHours(2)));

    assertThat(reports.weeklyCounts("KDY", END, 9).get(8).counts().get(SymptomGroup.DENGUE_LIKE))
        .isEqualTo(1);
    assertThat(reports.weeklyCounts(null, END, 9).get(8).counts().get(SymptomGroup.DENGUE_LIKE))
        .isEqualTo(2);
  }

  @Test
  void servesTheLastNineWeeksUpToNow() throws Exception {
    Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    store("KDY", SymptomGroup.DENGUE_LIKE, now.minus(Duration.ofMinutes(5)));

    mvc.perform(get("/api/reports/weekly-counts").param("district", "KDY"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.districtCode").value("KDY"))
        .andExpect(jsonPath("$.asOf").isNotEmpty())
        .andExpect(jsonPath("$.weeks", hasSize(9)))
        .andExpect(jsonPath("$.weeks[8].counts.DENGUE_LIKE").value(1))
        .andExpect(jsonPath("$.weeks[8].counts.LEPTOSPIROSIS_LIKE").value(0))
        .andExpect(jsonPath("$.weeks[0].counts.DENGUE_LIKE").value(0));
  }

  @Test
  void servesTheWholeCountryWithoutADistrict() throws Exception {
    mvc.perform(get("/api/reports/weekly-counts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.districtCode").doesNotExist())
        .andExpect(jsonPath("$.weeks", hasSize(9)));
  }

  @Test
  void refusesAMalformedDistrictCode() throws Exception {
    mvc.perform(get("/api/reports/weekly-counts").param("district", "Kandy"))
        .andExpect(status().isBadRequest());
  }

  private void store(String district, SymptomGroup group, Instant reportedAt) {
    long facilityId =
        jdbc.queryForObject(
            "select id from facilities where district_code = ? order by code limit 1",
            Long.class,
            district);
    reports.record(
        new AnonymisedReport(
            UUID.randomUUID(),
            facilityId,
            district,
            group,
            AgeBand.AGE_30_39,
            null,
            null,
            reportedAt,
            reportedAt));
  }
}
