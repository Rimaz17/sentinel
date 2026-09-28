package io.github.rimaz17.sentinel.publicview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.reports.AgeBand;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.ReportService;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The public API shows the pattern, not the individuals, and only what an inspector has confirmed
 * or what ran well past the higher threshold.
 */
@IntegrationTest
class PublicApiTest {

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;

  private long inspector;

  @BeforeEach
  void clear() {
    jdbc.update("delete from alerts");
    jdbc.update("delete from reports");
    accounts.clear();
    inspector = accounts.inspector("phi@example.org", "a long enough password", "*");
  }

  @ParameterizedTest
  @ValueSource(strings = {"/api/public/districts", "/api/public/alerts", "/api/public/trends"})
  void anyoneMayReadItWithoutSigningIn(String path) throws Exception {
    mvc.perform(get(path))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "max-age=60, public"));
  }

  @Test
  void anAlertNoInspectorHasJudgedStaysInternalBelowTheHigherThreshold() throws Exception {
    alert("KDY", 3.4, null, 1);

    mvc.perform(get("/api/public/alerts")).andExpect(jsonPath("$", hasSize(0)));
    mvc.perform(get("/api/public/districts"))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].status").value("USUAL"));
  }

  @Test
  void aConfirmedAlertIsPublishedInPlainWords() throws Exception {
    alert("KDY", 3.4, "CONFIRMED", 1);

    mvc.perform(get("/api/public/alerts"))
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].districtName").value("Kandy"))
        .andExpect(jsonPath("$[0].symptomGroup").value("DENGUE_LIKE"))
        .andExpect(jsonPath("$[0].active").value(true))
        .andExpect(jsonPath("$[0].basis").value("CONFIRMED"))
        .andExpect(
            jsonPath("$[0].headline")
                .value(
                    "Kandy district: elevated dengue-like illness activity. Follow standard"
                        + " precautions, and advice from your local MOH office or public health"
                        + " inspector."));
    mvc.perform(get("/api/public/districts"))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].status").value("ELEVATED"))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].elevatedGroups[0]").value("DENGUE_LIKE"));
  }

  @Test
  void anUnjudgedAlertPastTheHigherThresholdIsPublishedOnThatBasis() throws Exception {
    alert("CMB", 5.2, null, 1);

    mvc.perform(get("/api/public/alerts"))
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].basis").value("THRESHOLD"));
  }

  @Test
  void aFalseAlarmIsNeverPublished() throws Exception {
    alert("CMB", 6.4, "FALSE_ALARM", 1);

    mvc.perform(get("/api/public/alerts")).andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void anEndedAlertIsShownAsHistoryAfterTheActiveOnes() throws Exception {
    alert("GAL", 3.4, "CONFIRMED", 60);
    alert("KDY", 3.4, "CONFIRMED", 1);

    mvc.perform(get("/api/public/alerts"))
        .andExpect(jsonPath("$[0].districtCode").value("KDY"))
        .andExpect(jsonPath("$[1].districtCode").value("GAL"))
        .andExpect(jsonPath("$[1].active").value(false))
        .andExpect(
            jsonPath("$[1].headline")
                .value("Galle district: dengue-like illness activity is no longer elevated."));
    mvc.perform(get("/api/public/districts"))
        .andExpect(jsonPath("$[?(@.code == 'GAL')].status").value("USUAL"));
  }

  @Test
  void keepsOnlyAboutASeasonOfHistory() throws Exception {
    alert("GAL", 3.4, "CONFIRMED", 24 * 91);

    mvc.perform(get("/api/public/alerts")).andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void aPublishedAlertCarriesNoneOfTheInternalFigures() throws Exception {
    alert("KDY", 5.6, "CONFIRMED", 1);

    String body =
        mvc.perform(get("/api/public/alerts")).andReturn().getResponse().getContentAsString();
    assertThat(body)
        .doesNotContain("A-1", "zScore", "observedCount", "baseline", "threshold\"", "verdictBy")
        .doesNotContain("41")
        .doesNotContainPattern("T\\d{2}:\\d{2}");
  }

  @Test
  void nothingPublicCarriesAPositionOrAFacility() throws Exception {
    store("KDY");
    alert("KDY", 5.6, "CONFIRMED", 1);

    for (String path :
        new String[] {"/api/public/districts", "/api/public/alerts", "/api/public/trends"}) {
      String body = mvc.perform(get(path)).andReturn().getResponse().getContentAsString();
      assertThat(body)
          .as(path)
          .doesNotContain("latitude", "longitude", "7.291", "80.634", "facility", "LKY");
    }
  }

  @Test
  void listsEveryDistrictWithItsWeekOfReports() throws Exception {
    store("KDY");

    mvc.perform(get("/api/public/districts"))
        .andExpect(jsonPath("$", hasSize(25)))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].reportsLast7Days").value(1))
        .andExpect(jsonPath("$[0].openAlerts").doesNotExist());
  }

  @Test
  void setsEachDistrictsWeekAgainstItsOwnUsualWeek() throws Exception {
    // One report in each of the eight baseline weeks, and two in the current week.
    for (int weeksAgo = 1; weeksAgo <= 8; weeksAgo++) {
      store("KDY", Instant.now().minus(7L * weeksAgo, ChronoUnit.DAYS).minus(1, ChronoUnit.HOURS));
    }
    store("KDY", Instant.now().minus(1, ChronoUnit.HOURS));
    store("KDY", Instant.now().minus(2, ChronoUnit.HOURS));

    mvc.perform(get("/api/public/districts"))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].reportsLast7Days").value(2))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].usualWeek").value(1.0))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].percentOfUsual").value(200))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].status").value("USUAL"));
  }

  @Test
  void hasNoPercentageForADistrictWithNoUsualWeek() throws Exception {
    store("JAF", Instant.now().minus(1, ChronoUnit.HOURS));

    mvc.perform(get("/api/public/districts"))
        .andExpect(jsonPath("$[?(@.code == 'JAF')].reportsLast7Days").value(1))
        .andExpect(jsonPath("$[?(@.code == 'JAF')].usualWeek").value(0.0))
        .andExpect(jsonPath("$[?(@.code == 'JAF')].percentOfUsual", everyItem(nullValue())));
  }

  @Test
  void chartsNineWeeksForOneDistrictOrTheCountry() throws Exception {
    store("KDY");

    mvc.perform(get("/api/public/trends").param("district", "KDY"))
        .andExpect(jsonPath("$.districtCode").value("KDY"))
        .andExpect(jsonPath("$.weeks", hasSize(9)))
        .andExpect(jsonPath("$.weeks[8].counts.DENGUE_LIKE").value(1));
    mvc.perform(get("/api/public/trends"))
        .andExpect(jsonPath("$.districtCode").doesNotExist())
        .andExpect(jsonPath("$.weeks[8].counts.DENGUE_LIKE").value(1));
    mvc.perform(get("/api/public/trends").param("district", "kandy"))
        .andExpect(status().isBadRequest());
  }

  private void alert(String district, double peak, String verdict, int hoursAgo) {
    Instant last = Instant.now().minus(hoursAgo, ChronoUnit.HOURS);
    jdbc.update(
        """
        insert into alerts (district_code, symptom_group, status, first_detected_at,
          last_detected_at, observed_count, baseline_mean, baseline_sd, z_score, peak_z_score,
          threshold, verdict, verdict_at, verdict_by)
        values (?, 'DENGUE_LIKE', ?, ?, ?, 41, 25, 5, 3.2, ?, 3, ?, ?, ?)
        """,
        district,
        "FALSE_ALARM".equals(verdict) ? "CLOSED" : "NEW",
        Timestamp.from(last.minus(2, ChronoUnit.DAYS)),
        Timestamp.from(last),
        peak,
        verdict,
        verdict == null ? null : Timestamp.from(last),
        verdict == null ? null : inspector);
  }

  private void store(String district) {
    store(district, Instant.now().minus(1, ChronoUnit.HOURS));
  }

  private void store(String district, Instant reportedAt) {
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
            SymptomGroup.DENGUE_LIKE,
            AgeBand.AGE_30_39,
            new BigDecimal("7.291"),
            new BigDecimal("80.634"),
            reportedAt,
            Instant.now()));
  }
}
