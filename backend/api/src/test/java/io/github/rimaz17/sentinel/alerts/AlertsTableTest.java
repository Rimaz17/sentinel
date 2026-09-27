package io.github.rimaz17.sentinel.alerts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.rimaz17.sentinel.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/** The alerts table the detector writes to, as the migration defines it. */
@IntegrationTest
class AlertsTableTest {

  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void clear() {
    jdbc.update("delete from alerts");
  }

  @Test
  void numbersAlertsAndStartsThemAsNew() {
    insert("KDY", "DENGUE_LIKE", 3.2);
    insert("CMB", "INFLUENZA_LIKE", 3.5);

    assertThat(jdbc.queryForList("select code from alerts order by id", String.class))
        .allMatch(code -> code.matches("A-[0-9]{4,}"))
        .doesNotHaveDuplicates();
    assertThat(jdbc.queryForList("select distinct status from alerts", String.class))
        .containsExactly("NEW");
  }

  @Test
  void refusesAnUnknownSymptomGroup() {
    assertThatThrownBy(() -> insert("KDY", "CHOLERA", 3.2))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void refusesAPeakBelowTheCurrentScore() {
    assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into alerts (district_code, symptom_group, first_detected_at,
                      last_detected_at, observed_count, baseline_mean, baseline_sd, z_score,
                      peak_z_score, threshold)
                    values ('KDY', 'DENGUE_LIKE', now(), now(), 41, 25, 5, 3.2, 3.1, 3)
                    """))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private void insert(String district, String group, double z) {
    jdbc.update(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values (?, ?, now(), now(), 41, 25, 5, ?, ?, 3)
        """,
        district,
        group,
        z,
        z);
  }
}
