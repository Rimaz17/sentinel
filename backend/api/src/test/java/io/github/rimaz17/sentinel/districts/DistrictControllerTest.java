package io.github.rimaz17.sentinel.districts;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.TestReports;
import io.github.rimaz17.sentinel.reports.AgeBand;
import io.github.rimaz17.sentinel.reports.AnonymisedReport;
import io.github.rimaz17.sentinel.reports.ReportService;
import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class DistrictControllerTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired TestAccounts testAccounts;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;
  @Autowired TestReports testReports;

  @BeforeEach
  void storeActivity() {
    testReports.clear();
    jdbc.update("delete from alerts");
    store("LKY0001016", "KDY", 1);
    store("LKY0001016", "KDY", 6 * 24);
    // Eight days ago: outside the seven days the list counts.
    store("LKY0001016", "KDY", 8 * 24);
    store("LCB0000018", "CMB", 3);

    alert("KDY", "NEW", 2);
    alert("KDY", "CLOSED", 2);
    // Last detected two days ago: the episode has ended.
    alert("CMB", "NEW", 48);
  }

  @Test
  void listsAllTwentyFiveDistrictsAlphabetically() throws Exception {
    mvc.perform(get("/api/districts").with(testAccounts.asInspector("*")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(25)))
        .andExpect(jsonPath("$[0].name").value("Ampara"))
        .andExpect(jsonPath("$[24].name").value("Vavuniya"));
  }

  @Test
  void describesEachDistrict() throws Exception {
    mvc.perform(get("/api/districts").with(testAccounts.asInspector("*")))
        .andExpect(jsonPath("$[?(@.code == 'NEL')].name").value("Nuwara Eliya"))
        .andExpect(jsonPath("$[?(@.code == 'NEL')].province").value("Central"));
  }

  @Test
  void countsEachDistrictsReportsOverTheLastSevenDays() throws Exception {
    mvc.perform(get("/api/districts").with(testAccounts.asInspector("*")))
        .andExpect(jsonPath("$[?(@.code == 'KDY')].reportsLast7Days").value(2))
        .andExpect(jsonPath("$[?(@.code == 'CMB')].reportsLast7Days").value(1))
        .andExpect(jsonPath("$[?(@.code == 'JAF')].reportsLast7Days").value(0));
  }

  @Test
  void countsOnlyOpenAlerts() throws Exception {
    mvc.perform(get("/api/districts").with(testAccounts.asInspector("*")))
        // One open; the closed one does not count.
        .andExpect(jsonPath("$[?(@.code == 'KDY')].openAlerts").value(1))
        // Its only alert was last detected outside the 24-hour episode gap.
        .andExpect(jsonPath("$[?(@.code == 'CMB')].openAlerts").value(0))
        .andExpect(jsonPath("$[?(@.code == 'JAF')].openAlerts").value(0));
  }

  private void store(String facilityCode, String district, int hoursAgo) {
    long facilityId =
        jdbc.queryForObject("select id from facilities where code = ?", Long.class, facilityCode);
    reports.record(
        new AnonymisedReport(
            UUID.randomUUID(),
            facilityId,
            district,
            SymptomGroup.DENGUE_LIKE,
            AgeBand.AGE_30_39,
            null,
            null,
            NOW.minus(hoursAgo, ChronoUnit.HOURS),
            NOW));
  }

  private void alert(String district, String status, int hoursAgo) {
    Timestamp detected = Timestamp.from(NOW.minus(hoursAgo, ChronoUnit.HOURS));
    jdbc.update(
        """
        insert into alerts (district_code, symptom_group, status, first_detected_at,
          last_detected_at, observed_count, baseline_mean, baseline_sd, z_score, peak_z_score,
          threshold)
        values (?, 'DENGUE_LIKE', ?, ?, ?, 41, 25, 5, 3.2, 3.2, 3)
        """,
        district,
        status,
        detected,
        detected);
  }
}
