package io.github.rimaz17.sentinel.alerts;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class AlertControllerTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void storeAlerts() {
    jdbc.update("delete from alerts");
    // Inserted out of order: listing is by last detection, not by when the row was written.
    insert("CMB", "INFLUENZA_LIKE", "NEW", 30, 3.4);
    insert("KDY", "DENGUE_LIKE", "NEW", 2, 5.2);
    insert("KDY", "GASTROINTESTINAL", "CLOSED", 1, 3.1);
    insert("GAL", "LEPTOSPIROSIS_LIKE", "NEW", 10, 3.3);
  }

  @Test
  void listsTheMostRecentlyDetectedFirst() throws Exception {
    mvc.perform(get("/api/alerts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(4)))
        .andExpect(jsonPath("$[0].symptomGroup").value("GASTROINTESTINAL"))
        .andExpect(jsonPath("$[1].symptomGroup").value("DENGUE_LIKE"))
        .andExpect(jsonPath("$[2].symptomGroup").value("LEPTOSPIROSIS_LIKE"))
        .andExpect(jsonPath("$[3].symptomGroup").value("INFLUENZA_LIKE"));
  }

  @Test
  void describesEachAlertInTheDetectorsOwnFigures() throws Exception {
    mvc.perform(get("/api/alerts").param("district", "KDY").param("limit", "2"))
        .andExpect(jsonPath("$[1].code").value(matchesPattern("A-\\d{4,}")))
        .andExpect(jsonPath("$[1].districtCode").value("KDY"))
        .andExpect(jsonPath("$[1].districtName").value("Kandy"))
        .andExpect(jsonPath("$[1].status").value("NEW"))
        .andExpect(jsonPath("$[1].firstDetectedAt").value(hoursAgo(5).toString()))
        .andExpect(jsonPath("$[1].lastDetectedAt").value(hoursAgo(2).toString()))
        .andExpect(jsonPath("$[1].observedCount").value(41))
        .andExpect(jsonPath("$[1].baselineMean").value(25.0))
        .andExpect(jsonPath("$[1].baselineSd").value(5.0))
        .andExpect(jsonPath("$[1].zScore").value(5.2))
        .andExpect(jsonPath("$[1].peakZScore").value(5.2))
        .andExpect(jsonPath("$[1].threshold").value(3.0));
  }

  @Test
  void marksAnAlertOpenWhileTheDetectorCouldStillExtendIt() throws Exception {
    mvc.perform(get("/api/alerts"))
        // Detected two hours ago and ten hours ago: within the 24-hour episode gap.
        .andExpect(jsonPath("$[1].open").value(true))
        .andExpect(jsonPath("$[2].open").value(true))
        // Last detected thirty hours ago: the next detection would raise a new alert.
        .andExpect(jsonPath("$[3].open").value(false));
  }

  @Test
  void neverCountsAClosedAlertAsOpen() throws Exception {
    mvc.perform(get("/api/alerts"))
        .andExpect(jsonPath("$[0].status").value("CLOSED"))
        .andExpect(jsonPath("$[0].open").value(false));
  }

  @Test
  void filtersByDistrict() throws Exception {
    mvc.perform(get("/api/alerts").param("district", "KDY"))
        .andExpect(jsonPath("$", hasSize(2)))
        .andExpect(jsonPath("$[0].districtCode").value("KDY"))
        .andExpect(jsonPath("$[1].districtCode").value("KDY"));
  }

  @Test
  void honoursTheLimit() throws Exception {
    mvc.perform(get("/api/alerts").param("limit", "1")).andExpect(jsonPath("$", hasSize(1)));
  }

  @Test
  void returnsAnEmptyListWhenThereAreNoAlerts() throws Exception {
    mvc.perform(get("/api/alerts").param("district", "JAF"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void refusesALimitOutsideOneToTwoHundred() throws Exception {
    mvc.perform(get("/api/alerts").param("limit", "0")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/alerts").param("limit", "201")).andExpect(status().isBadRequest());
  }

  @Test
  void refusesAMalformedDistrictCode() throws Exception {
    mvc.perform(get("/api/alerts").param("district", "kdy")).andExpect(status().isBadRequest());
  }

  private static Instant hoursAgo(int hours) {
    return NOW.minus(hours, ChronoUnit.HOURS);
  }

  private void insert(String district, String group, String status, int hoursAgo, double z) {
    jdbc.update(
        """
        insert into alerts (district_code, symptom_group, status, first_detected_at,
          last_detected_at, observed_count, baseline_mean, baseline_sd, z_score, peak_z_score,
          threshold)
        values (?, ?, ?, ?, ?, 41, 25, 5, ?, ?, 3)
        """,
        district,
        group,
        status,
        Timestamp.from(hoursAgo(hoursAgo + 3)),
        Timestamp.from(hoursAgo(hoursAgo)),
        z,
        z);
  }
}
