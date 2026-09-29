package io.github.rimaz17.sentinel.alerts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.auth.Caller;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Inspectors move alerts through their investigation and give each a verdict. */
@IntegrationTest
class AlertReviewTest {

  private static final String PASSWORD = "a long enough password";

  @Autowired MockMvc mvc;
  @Autowired TestAccounts accounts;
  @Autowired JdbcTemplate jdbc;

  private long kandyInspector;
  private String kandyAlert;
  private String colomboAlert;

  @BeforeEach
  void storeAlerts() {
    jdbc.update("delete from alerts");
    accounts.clear();
    kandyInspector = accounts.inspector("kandy@example.org", PASSWORD, "KDY");
    kandyAlert = insert("KDY", 3.4);
    colomboAlert = insert("CMB", 3.4);
  }

  @Test
  void movesAnAlertForwardThroughItsInvestigation() throws Exception {
    move(kandyAlert, "ACKNOWLEDGED").andExpect(status().isOk());
    move(kandyAlert, "INVESTIGATING").andExpect(status().isOk());
    move(kandyAlert, "CLOSED")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"))
        .andExpect(jsonPath("$.open").value(false));
  }

  @Test
  void mayStepOverAStatusButNeverGoesBack() throws Exception {
    move(kandyAlert, "INVESTIGATING").andExpect(status().isOk());

    move(kandyAlert, "ACKNOWLEDGED")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.detail").value(AlertService.FORWARD_ONLY));
    move(kandyAlert, "INVESTIGATING").andExpect(status().isConflict());
    move(kandyAlert, "NEW").andExpect(status().isConflict());
  }

  @Test
  void aKandyInspectorCannotTouchAColomboAlert() throws Exception {
    move(colomboAlert, "ACKNOWLEDGED")
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.detail").value(Caller.OUT_OF_SCOPE));
    judge(colomboAlert, "FALSE_ALARM").andExpect(status().isForbidden());

    assertThat(column(colomboAlert, "status")).isEqualTo("NEW");
    assertThat(column(colomboAlert, "verdict")).isNull();
  }

  @Test
  void confirmingPublishesTheAlertAndRecordsWhoConfirmedIt() throws Exception {
    judge(kandyAlert, "CONFIRMED")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.verdict").value("CONFIRMED"))
        .andExpect(jsonPath("$.verdictAt").isNotEmpty())
        .andExpect(jsonPath("$.published").value(true))
        .andExpect(jsonPath("$.status").value("NEW"));

    assertThat(column(kandyAlert, "verdict_by")).isEqualTo(String.valueOf(kandyInspector));
  }

  @Test
  void aFalseAlarmIsClosedAndNeverPublishedHoweverHighItRan() throws Exception {
    String high = insert("KDY", 6.1);

    judge(high, "FALSE_ALARM")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"))
        .andExpect(jsonPath("$.published").value(false));
  }

  @Test
  void aVerdictIsFinal() throws Exception {
    judge(kandyAlert, "CONFIRMED").andExpect(status().isOk());

    judge(kandyAlert, "FALSE_ALARM")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.detail").value(AlertService.ALREADY_JUDGED));
  }

  @Test
  void aClosedAlertTakesNoVerdict() throws Exception {
    move(kandyAlert, "CLOSED");

    judge(kandyAlert, "CONFIRMED").andExpect(status().isConflict());
  }

  @Test
  void anUnjudgedAlertIsPublishedOnlyAboveTheHigherThreshold() throws Exception {
    String high = insert("KDY", 5.2);

    mvc.perform(get("/api/alerts").with(accounts.as(kandyInspector)))
        .andExpect(jsonPath("$[?(@.code == '%s')].published".formatted(high)).value(true))
        .andExpect(jsonPath("$[?(@.code == '%s')].published".formatted(kandyAlert)).value(false));
  }

  @Test
  void saysSoWhenNoAlertHasTheCode() throws Exception {
    move("A-999999", "ACKNOWLEDGED").andExpect(status().isNotFound());
  }

  @Test
  void onlyAnInspectorReviewsAlerts() throws Exception {
    long provider = accounts.dataProvider("clinic@example.org", PASSWORD, "LKY0001016");

    mvc.perform(
            post("/api/alerts/" + kandyAlert + "/verdict")
                .with(accounts.as(provider))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"verdict\": \"CONFIRMED\"}"))
        .andExpect(status().isForbidden());
    assertThat(column(kandyAlert, "verdict")).isNull();
  }

  @Test
  void refusesAnUnknownStatus() throws Exception {
    move(kandyAlert, "RESOLVED").andExpect(status().isBadRequest());
  }

  private ResultActions move(String code, String target) throws Exception {
    return mvc.perform(
        post("/api/alerts/" + code + "/status")
            .with(accounts.as(kandyInspector))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"status\": \"%s\"}".formatted(target)));
  }

  private ResultActions judge(String code, String verdict) throws Exception {
    return mvc.perform(
        post("/api/alerts/" + code + "/verdict")
            .with(accounts.as(kandyInspector))
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"verdict\": \"%s\"}".formatted(verdict)));
  }

  private String column(String code, String name) {
    return jdbc.queryForObject(
        "select " + name + "::text from alerts where code = ?", String.class, code);
  }

  private String insert(String district, double peak) {
    return jdbc.queryForObject(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values (?, 'DENGUE_LIKE', now() - interval '3 hours', now() - interval '1 hour',
          41, 25, 5, 3.2, ?, 3)
        returning code
        """,
        String.class,
        district,
        peak);
  }
}
