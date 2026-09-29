package io.github.rimaz17.sentinel.alerts;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Properties;
import org.postgresql.PGConnection;
import org.postgresql.PGNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.jdbc.autoconfigure.JdbcConnectionDetails;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

/**
 * Listens for the database's notice that an alert was raised or changed, and has it pushed. The
 * notice comes from a trigger on the alerts table (V12), whoever wrote the alert: the detector or
 * an inspector. See docs/adr/0016-alerts-pushed-over-websocket.md.
 *
 * <p>It listens on a connection of its own, outside the pool, which it holds for as long as the API
 * runs. If that connection is lost, it connects again and tells every dashboard to read its alerts
 * afresh, since a change made meanwhile was announced to no one.
 */
@Component
class AlertChangeListener implements SmartLifecycle {

  private static final Logger log = LoggerFactory.getLogger(AlertChangeListener.class);

  /** The channel the trigger announces on. */
  static final String CHANNEL = "sentinel_alert_changes";

  /** How the connection names itself to the database, so it can be found there. */
  static final String APPLICATION_NAME = "sentinel-alert-listener";

  /** How long to wait for a notice before checking the connection is still alive. */
  static final Duration WAIT = Duration.ofSeconds(10);

  /** How long to wait before connecting again after losing the connection. */
  static final Duration RECONNECT_AFTER = Duration.ofSeconds(5);

  private final JdbcConnectionDetails database;
  private final AlertPush push;

  private volatile boolean running;
  private volatile Connection connection;
  private Thread thread;

  AlertChangeListener(JdbcConnectionDetails database, AlertPush push) {
    this.database = database;
    this.push = push;
  }

  @Override
  public void start() {
    running = true;
    thread = new Thread(this::listen, "alert-change-listener");
    thread.setDaemon(true);
    thread.start();
  }

  @Override
  public void stop() {
    running = false;
    // Closing the connection wakes the thread from its wait.
    closeQuietly(connection);
    try {
      thread.join(5_000);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  @Override
  public boolean isRunning() {
    return running;
  }

  private void listen() {
    while (running) {
      try (Connection listening = connect()) {
        connection = listening;
        try (Statement statement = listening.createStatement()) {
          statement.execute("listen " + CHANNEL);
        }
        push.resynchronise();
        PGConnection notices = listening.unwrap(PGConnection.class);
        while (running) {
          PGNotification[] received = notices.getNotifications((int) WAIT.toMillis());
          if (received == null || received.length == 0) {
            if (!listening.isValid((int) WAIT.toSeconds())) {
              throw new SQLException("the connection stopped answering");
            }
            continue;
          }
          for (PGNotification notice : received) {
            handle(notice.getParameter());
          }
        }
      } catch (SQLException e) {
        if (running) {
          log.warn(
              "Stopped hearing of alert changes ({}); listening again in {} s",
              e.getMessage(),
              RECONNECT_AFTER.toSeconds());
          pause();
        }
      }
    }
  }

  /**
   * A notice reads "RAISED A-1001" or "UPDATED A-1001". One that fails is logged and passed over.
   */
  private void handle(String notice) {
    try {
      String[] parts = notice.split(" ", 2);
      push.changed(AlertEvent.Change.valueOf(parts[0]), parts[1]);
    } catch (RuntimeException e) {
      log.warn("Could not push the alert change '{}': {}", notice, e.toString());
    }
  }

  private Connection connect() throws SQLException {
    Properties properties = new Properties();
    properties.setProperty("user", database.getUsername());
    if (database.getPassword() != null) {
      properties.setProperty("password", database.getPassword());
    }
    properties.setProperty("ApplicationName", APPLICATION_NAME);
    return DriverManager.getConnection(database.getJdbcUrl(), properties);
  }

  private void pause() {
    try {
      Thread.sleep(RECONNECT_AFTER.toMillis());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      running = false;
    }
  }

  private static void closeQuietly(Connection connection) {
    if (connection == null) {
      return;
    }
    try {
      connection.close();
    } catch (SQLException e) {
      // Closing is all that was wanted.
    }
  }
}
