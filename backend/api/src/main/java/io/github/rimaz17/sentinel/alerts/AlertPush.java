package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.auth.SocketPrincipal;
import java.time.Instant;
import java.util.List;
import java.util.function.Predicate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Component;

/**
 * Pushes alert changes to inspectors' dashboards. Scope is enforced here, on every message: each
 * connection is told only of alerts in the districts its token covers, and nothing at all once its
 * token has expired, exactly as a request would be refused.
 */
@Component
class AlertPush {

  /** Where each connection receives, as {@code /user/queue/alerts} from its own side. */
  static final String DESTINATION = "/queue/alerts";

  private final AlertService alerts;
  private final SimpMessagingTemplate messaging;
  private final SimpUserRegistry connections;

  AlertPush(AlertService alerts, SimpMessagingTemplate messaging, SimpUserRegistry connections) {
    this.alerts = alerts;
    this.messaging = messaging;
    this.connections = connections;
  }

  /** Tells every connection that covers the alert's district that it was raised or changed. */
  void changed(AlertEvent.Change change, String code) {
    alerts
        .findByCode(code)
        .ifPresent(
            alert -> {
              Instant now = alerts.now();
              List<AlertCluster> clusters =
                  alerts.clustersOf(List.of(alert)).getOrDefault(alert.getId(), List.of());
              AlertEvent event =
                  new AlertEvent(
                      change, AlertResponse.from(alert, clusters, now, alerts.publicThreshold()));
              String district = alert.getDistrict().getCode();
              send(event, connection -> connection.mayReceive(district, now));
            });
  }

  /** Tells every connection to read its alerts afresh, after changes may have gone unannounced. */
  void resynchronise() {
    Instant now = alerts.now();
    send(AlertEvent.resync(), connection -> connection.isCurrent(now));
  }

  private void send(AlertEvent event, Predicate<SocketPrincipal> to) {
    for (SimpUser user : connections.getUsers()) {
      if (user.getPrincipal() instanceof SocketPrincipal connection && to.test(connection)) {
        messaging.convertAndSendToUser(connection.getName(), DESTINATION, event);
      }
    }
  }
}
