package io.github.rimaz17.sentinel.alerts;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.rimaz17.sentinel.IntegrationTest;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.postgresql.PGConnection;
import org.postgresql.PGNotification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** The database's own notice that an alert was raised or changed, as the migration defines it. */
@IntegrationTest
class AlertChangeNotificationTest {

  @Autowired JdbcTemplate jdbc;
  @Autowired DataSource dataSource;
  @Autowired TransactionTemplate transactions;

  /** The channel the migration announces on. */
  private static final String CHANNEL = "sentinel_alert_changes";

  private Connection listening;

  @BeforeEach
  void listen() throws Exception {
    jdbc.update("delete from alerts");
    listening = dataSource.getConnection();
    try (Statement statement = listening.createStatement()) {
      statement.execute("listen " + CHANNEL);
    }
  }

  @AfterEach
  void stopListening() throws Exception {
    // The connection goes back to the pool, which must not keep listening on it.
    try (Statement statement = listening.createStatement()) {
      statement.execute("unlisten *");
    }
    listening.close();
  }

  @Test
  void announcesANewAlertByItsCode() throws Exception {
    String code = insert();

    assertThat(notices()).containsExactly("RAISED " + code);
  }

  @Test
  void announcesAChangeToAnAlert() throws Exception {
    String code = insert();
    notices();

    jdbc.update("update alerts set status = 'ACKNOWLEDGED' where code = ?", code);

    assertThat(notices()).containsExactly("UPDATED " + code);
  }

  @Test
  void saysNothingOfAnUpdateThatChangesNothing() throws Exception {
    String code = insert();
    notices();

    jdbc.update("update alerts set status = status where code = ?", code);

    assertThat(notices()).isEmpty();
  }

  @Test
  void saysNothingOfAnAlertWhoseTransactionRolledBack() throws Exception {
    transactions.executeWithoutResult(
        status -> {
          insert();
          status.setRollbackOnly();
        });

    assertThat(notices()).isEmpty();
  }

  private String insert() {
    return jdbc.queryForObject(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values ('KDY', 'DENGUE_LIKE', now(), now(), 41, 25, 5, 3.2, 3.2, 3)
        returning code
        """,
        String.class);
  }

  /** Everything announced so far, waiting briefly for anything on its way. */
  private List<String> notices() throws Exception {
    List<String> found = new ArrayList<>();
    PGNotification[] notifications = listening.unwrap(PGConnection.class).getNotifications(500);
    if (notifications != null) {
      for (PGNotification notification : notifications) {
        found.add(notification.getParameter());
      }
    }
    return found;
  }
}
