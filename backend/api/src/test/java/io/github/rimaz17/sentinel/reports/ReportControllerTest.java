package io.github.rimaz17.sentinel.reports;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class ReportControllerTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired TestAccounts testAccounts;
  @Autowired ReportService reports;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void storeReports() {
    jdbc.update("delete from reports");
    // Stored out of order, and received in a different order from when they were reported, as a
    // backfill would be.
    store("LKY0001016", "KDY", SymptomGroup.DENGUE_LIKE, 30);
    store("LCB0000018", "CMB", SymptomGroup.INFLUENZA_LIKE, 10);
    store("LKY0001016", "KDY", SymptomGroup.GASTROINTESTINAL, 20);
  }

  @Test
  void listsTheMostRecentlyReportedFirst() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(3)))
        .andExpect(jsonPath("$[0].symptomGroup").value("INFLUENZA_LIKE"))
        .andExpect(jsonPath("$[1].symptomGroup").value("GASTROINTESTINAL"))
        .andExpect(jsonPath("$[2].symptomGroup").value("DENGUE_LIKE"));
  }

  @Test
  void describesEachReport() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("limit", "1"))
        .andExpect(jsonPath("$[0].id").isNotEmpty())
        .andExpect(jsonPath("$[0].facilityCode").value("LCB0000018"))
        .andExpect(jsonPath("$[0].districtCode").value("CMB"))
        .andExpect(jsonPath("$[0].ageBand").value("30-39"))
        .andExpect(jsonPath("$[0].latitude").value(6.927))
        .andExpect(jsonPath("$[0].longitude").value(79.861))
        .andExpect(jsonPath("$[0].reportedAt").value(NOW.minus(10, ChronoUnit.MINUTES).toString()))
        .andExpect(jsonPath("$[0].receivedAt").value(NOW.toString()));
  }

  @Test
  void honoursTheLimit() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("limit", "2"))
        .andExpect(jsonPath("$", hasSize(2)));
  }

  @Test
  void filtersByDistrict() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("district", "KDY"))
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[0].symptomGroup").value("GASTROINTESTINAL"))
        .andExpect(jsonPath("$[1].symptomGroup").value("DENGUE_LIKE"));
  }

  @Test
  void returnsAnEmptyListWhenThereIsNothingToShow() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("district", "JAF"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void refusesALimitOutsideOneToFiveHundred() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("limit", "0"))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("limit", "501"))
        .andExpect(status().isBadRequest());
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("limit", "many"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void refusesAMalformedDistrictCode() throws Exception {
    mvc.perform(get("/api/reports").with(testAccounts.asInspector("*")).param("district", "Kandy"))
        .andExpect(status().isBadRequest());
  }

  private void store(String facilityCode, String district, SymptomGroup group, int minutesAgo) {
    long facilityId =
        jdbc.queryForObject("select id from facilities where code = ?", Long.class, facilityCode);
    reports.record(
        new AnonymisedReport(
            UUID.randomUUID(),
            facilityId,
            district,
            group,
            AgeBand.AGE_30_39,
            new BigDecimal("6.927"),
            new BigDecimal("79.861"),
            NOW.minus(minutesAgo, ChronoUnit.MINUTES),
            NOW));
  }
}
