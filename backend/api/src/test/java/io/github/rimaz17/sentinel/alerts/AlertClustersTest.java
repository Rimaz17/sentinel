package io.github.rimaz17.sentinel.alerts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** The geographic check's clusters, as the detector stores them and inspectors read them. */
@IntegrationTest
class AlertClustersTest {

  private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

  @Autowired MockMvc mvc;
  @Autowired TestAccounts testAccounts;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void clear() {
    jdbc.update("delete from alerts");
  }

  @Test
  void listsEachAlertsClustersMostReportsFirstWithTheNearestFacility() throws Exception {
    String code = alert("CMB", NOW);
    cluster(code, 6.931, 79.861, 6, 3, "LCB0000158");
    cluster(code, 6.923, 79.918, 17, 7, "LCB0000117");

    mvc.perform(get("/api/alerts").with(testAccounts.asInspector("*")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].clustersCheckedAt").value(NOW.toString()))
        .andExpect(jsonPath("$[0].clusters", hasSize(2)))
        .andExpect(jsonPath("$[0].clusters[0].latitude").value(6.923))
        .andExpect(jsonPath("$[0].clusters[0].longitude").value(79.918))
        .andExpect(jsonPath("$[0].clusters[0].radiusMetres").value(2000))
        .andExpect(jsonPath("$[0].clusters[0].reportCount").value(17))
        .andExpect(jsonPath("$[0].clusters[0].facilityCount").value(7))
        .andExpect(jsonPath("$[0].clusters[0].expectedCount").value(3.37))
        .andExpect(jsonPath("$[0].clusters[0].nearestFacilityCode").value("LCB0000117"))
        .andExpect(
            jsonPath("$[0].clusters[0].nearestFacilityName")
                .value("Infectious Diseases Hospital, Angoda"))
        .andExpect(jsonPath("$[0].clusters[1].reportCount").value(6));
  }

  @Test
  void tellsAnAlertNeverCheckedFromOneCheckedThatFoundNothing() throws Exception {
    alert("KDY", null);
    alert("GAL", NOW);

    mvc.perform(get("/api/alerts").with(testAccounts.asInspector("*")))
        .andExpect(
            jsonPath("$[?(@.districtCode == 'KDY')].clustersCheckedAt")
                .value(contains(nullValue())))
        .andExpect(jsonPath("$[?(@.districtCode == 'KDY')].clusters[*]", hasSize(0)))
        .andExpect(
            jsonPath("$[?(@.districtCode == 'GAL')].clustersCheckedAt").value(NOW.toString()))
        .andExpect(jsonPath("$[?(@.districtCode == 'GAL')].clusters[*]", hasSize(0)));
  }

  @Test
  void aDistrictInspectorNeverSeesAnotherDistrictsClusters() throws Exception {
    cluster(alert("CMB", NOW), 6.923, 79.918, 17, 7, "LCB0000117");
    cluster(alert("KDY", NOW), 7.291, 80.634, 9, 4, null);

    String body =
        mvc.perform(get("/api/alerts").with(testAccounts.asInspector("KDY")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].clusters[0].latitude").value(7.291))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).doesNotContain("6.923", "79.918", "LCB0000117", "Angoda");

    mvc.perform(get("/api/alerts").with(testAccounts.asInspector("KDY")).param("district", "CMB"))
        .andExpect(status().isForbidden());
  }

  @Test
  void anAlertsClustersGoWithIt() {
    String code = alert("CMB", NOW);
    cluster(code, 6.923, 79.918, 17, 7, "LCB0000117");

    jdbc.update("delete from alerts where code = ?", code);

    assertThat(jdbc.queryForObject("select count(*) from alert_clusters", Integer.class)).isZero();
  }

  @Test
  void refusesAClusterWithMoreFacilitiesThanReports() {
    String code = alert("CMB", NOW);

    assertThatThrownBy(() -> cluster(code, 6.923, 79.918, 2, 3, null))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void refusesAClusterCentredOffTheIsland() {
    String code = alert("CMB", NOW);

    assertThatThrownBy(() -> cluster(code, 12.0, 79.918, 17, 7, null))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private String alert(String district, Instant checkedAt) {
    return jdbc.queryForObject(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold,
          clusters_checked_at)
        values (?, 'DENGUE_LIKE', ?, ?, 41, 25, 5, 3.2, 3.2, 3, ?)
        returning code
        """,
        String.class,
        district,
        Timestamp.from(NOW.minus(3, ChronoUnit.HOURS)),
        Timestamp.from(NOW),
        checkedAt == null ? null : Timestamp.from(checkedAt));
  }

  private void cluster(
      String code,
      double latitude,
      double longitude,
      int reports,
      int facilities,
      String nearestFacility) {
    jdbc.update(
        """
        insert into alert_clusters (alert_id, latitude, longitude, radius_metres, report_count,
          facility_count, expected_count, nearest_facility_id)
        values ((select id from alerts where code = ?), ?, ?, 2000, ?, ?, 3.37,
          (select id from facilities where code = ?))
        """,
        code,
        latitude,
        longitude,
        reports,
        facilities,
        nearestFacility);
  }
}
