package io.github.rimaz17.sentinel.reports;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.TestReports;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Report positions for the internal map's dots. */
@IntegrationTest
class LocatedReportsTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired TestAccounts testAccounts;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;
  @Autowired TestReports testReports;

  @BeforeEach
  void storeReports() {
    testReports.clear();
    store("KDY", Duration.ofHours(2), true);
    store("KDY", Duration.ofDays(3), true);
    store("KDY", Duration.ofHours(1), false);
    store("CMB", Duration.ofHours(3), true);
    // Ten days ago: outside the default week, inside a fortnight.
    store("KDY", Duration.ofDays(10), true);
  }

  @Test
  void listsLocatedReportsFromTheLastWeekNewestFirst() throws Exception {
    mvc.perform(get("/api/reports/locations").with(testAccounts.asInspector("*")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(3)))
        .andExpect(jsonPath("$[*].latitude", everyItem(notNullValue())))
        .andExpect(jsonPath("$[*].longitude", everyItem(notNullValue())))
        .andExpect(jsonPath("$[0].reportedAt").value(NOW.minus(Duration.ofHours(2)).toString()))
        .andExpect(jsonPath("$[1].districtCode").value("CMB"));
  }

  @Test
  void describesEachDotWithItsFacilityAndGroup() throws Exception {
    mvc.perform(
            get("/api/reports/locations")
                .with(testAccounts.asInspector("*"))
                .param("district", "CMB"))
        .andExpect(jsonPath("$[0].facilityCode").isNotEmpty())
        .andExpect(jsonPath("$[0].symptomGroup").value("DENGUE_LIKE"))
        .andExpect(jsonPath("$[0].ageBand").value("30-39"))
        .andExpect(jsonPath("$[0].latitude").value(6.927))
        .andExpect(jsonPath("$[0].longitude").value(79.861));
  }

  @Test
  void widensTheWindowOnRequest() throws Exception {
    mvc.perform(
            get("/api/reports/locations").with(testAccounts.asInspector("*")).param("days", "14"))
        .andExpect(jsonPath("$", hasSize(4)));
  }

  @Test
  void filtersByDistrict() throws Exception {
    mvc.perform(
            get("/api/reports/locations")
                .with(testAccounts.asInspector("*"))
                .param("district", "KDY"))
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[*].districtCode", everyItem(is("KDY"))));
  }

  @Test
  void refusesAWindowOutsideOneToSixtyThreeDays() throws Exception {
    mvc.perform(
            get("/api/reports/locations").with(testAccounts.asInspector("*")).param("days", "0"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            get("/api/reports/locations").with(testAccounts.asInspector("*")).param("days", "64"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void refusesAMalformedDistrictCode() throws Exception {
    mvc.perform(
            get("/api/reports/locations")
                .with(testAccounts.asInspector("*"))
                .param("district", "K"))
        .andExpect(status().isBadRequest());
  }

  private void store(String district, Duration ago, boolean located) {
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
            located ? new BigDecimal("6.927") : null,
            located ? new BigDecimal("79.861") : null,
            NOW.minus(ago),
            NOW));
  }
}
