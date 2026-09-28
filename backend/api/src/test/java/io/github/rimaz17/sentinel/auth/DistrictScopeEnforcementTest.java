package io.github.rimaz17.sentinel.auth;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.in;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Scope is enforced by the server, in every query. A Kandy inspector who asks for Colombo gets 403,
 * and one who names no district gets Kandy, never the country.
 */
@IntegrationTest
class DistrictScopeEnforcementTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void storeActivityInThreeDistricts() {
    jdbc.update("delete from reports");
    jdbc.update("delete from alerts");
    for (String district : List.of("KDY", "CMB", "MTL")) {
      store(district);
      alert(district);
    }
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/api/alerts",
        "/api/reports",
        "/api/reports/locations",
        "/api/reports/weekly-counts",
        "/api/facilities"
      })
  void aKandyInspectorCannotReadColombo(String path) throws Exception {
    mvc.perform(get(path).param("district", "CMB").with(accounts.asInspector("KDY")))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.detail").value(Caller.OUT_OF_SCOPE));
  }

  @ParameterizedTest
  @ValueSource(strings = {"/api/alerts", "/api/reports", "/api/reports/locations"})
  void aKandyInspectorNamingNoDistrictSeesOnlyKandy(String path) throws Exception {
    mvc.perform(get(path).with(accounts.asInspector("KDY")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[*].districtCode", everyItem(is("KDY"))));
  }

  @Test
  void aKandyInspectorsWeeklyCountsAreKandysAlone() throws Exception {
    mvc.perform(get("/api/reports/weekly-counts").with(accounts.asInspector("KDY")))
        .andExpect(jsonPath("$.weeks[8].counts.DENGUE_LIKE").value(1));
    mvc.perform(get("/api/reports/weekly-counts").with(accounts.asInspector("*")))
        .andExpect(jsonPath("$.weeks[8].counts.DENGUE_LIKE").value(3));
  }

  @Test
  void aKandyInspectorsDistrictListHoldsOnlyKandy() throws Exception {
    mvc.perform(get("/api/districts").with(accounts.asInspector("KDY")))
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].code").value("KDY"));
  }

  @Test
  void aKandyInspectorsRegistryHoldsOnlyKandysFacilities() throws Exception {
    mvc.perform(get("/api/facilities").with(accounts.asInspector("KDY")))
        .andExpect(jsonPath("$", hasSize(109)))
        .andExpect(jsonPath("$[*].districtCode", everyItem(is("KDY"))));
  }

  @Test
  void anInspectorOfSeveralDistrictsSeesEachOfThemAndNoOther() throws Exception {
    mvc.perform(get("/api/alerts").with(accounts.asInspector("KDY", "MTL")))
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[*].districtCode", everyItem(is(in(List.of("KDY", "MTL"))))));
    mvc.perform(get("/api/districts").with(accounts.asInspector("KDY", "MTL")))
        .andExpect(jsonPath("$", hasSize(2)));
    mvc.perform(
            get("/api/alerts").param("district", "MTL").with(accounts.asInspector("KDY", "MTL")))
        .andExpect(status().isOk());
    mvc.perform(
            get("/api/alerts").param("district", "CMB").with(accounts.asInspector("KDY", "MTL")))
        .andExpect(status().isForbidden());
  }

  @Test
  void aNationalInspectorSeesEveryDistrict() throws Exception {
    mvc.perform(get("/api/alerts").with(accounts.asInspector("*")))
        .andExpect(jsonPath("$", hasSize(3)));
    mvc.perform(get("/api/districts").with(accounts.asInspector("*")))
        .andExpect(jsonPath("$", hasSize(25)));
    mvc.perform(get("/api/reports").param("district", "CMB").with(accounts.asInspector("*")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)));
  }

  private void store(String district) {
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
            new BigDecimal("7.000"),
            new BigDecimal("80.000"),
            NOW.minus(1, ChronoUnit.HOURS),
            NOW));
  }

  private void alert(String district) {
    Timestamp detected = Timestamp.from(NOW.minus(1, ChronoUnit.HOURS));
    jdbc.update(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values (?, 'DENGUE_LIKE', ?, ?, 41, 25, 5, 3.2, 3.2, 3)
        """,
        district,
        detected,
        detected);
  }
}
