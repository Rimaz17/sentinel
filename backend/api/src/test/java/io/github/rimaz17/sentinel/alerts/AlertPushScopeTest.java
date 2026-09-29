package io.github.rimaz17.sentinel.alerts;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.github.rimaz17.sentinel.accounts.DistrictScope;
import io.github.rimaz17.sentinel.auth.SocketPrincipal;
import io.github.rimaz17.sentinel.districts.District;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;

/** Who each change is pushed to, decided per connection at the moment it is sent. */
class AlertPushScopeTest {

  private static final Instant NOW = Instant.parse("2026-09-30T08:00:00Z");

  private final AlertService alerts = mock(AlertService.class);
  private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
  private final SimpUserRegistry connections = mock(SimpUserRegistry.class);
  private final AlertPush push = new AlertPush(alerts, messaging, connections);

  @BeforeEach
  void aKandyAlert() {
    District kandy = mock(District.class);
    when(kandy.getCode()).thenReturn("KDY");
    when(kandy.getName()).thenReturn("Kandy");
    Alert alert = mock(Alert.class);
    when(alert.getDistrict()).thenReturn(kandy);
    when(alerts.findByCode("A-1001")).thenReturn(Optional.of(alert));
    when(alerts.now()).thenReturn(NOW);
    when(alerts.publicThreshold()).thenReturn(new BigDecimal("5.0"));
  }

  @Test
  void pushesToEveryLiveConnectionThatCoversTheDistrict() {
    connected(
        connection("kandy", "KDY", NOW.plus(10, ChronoUnit.MINUTES)),
        connection("national", "*", NOW.plus(10, ChronoUnit.MINUTES)));

    push.changed(AlertEvent.Change.RAISED, "A-1001");

    verify(messaging).convertAndSendToUser(eq("kandy"), eq("/queue/alerts"), any(AlertEvent.class));
    verify(messaging)
        .convertAndSendToUser(eq("national"), eq("/queue/alerts"), any(AlertEvent.class));
  }

  @Test
  void neverPushesToAConnectionForAnotherDistrict() {
    connected(connection("colombo", "CMB", NOW.plus(10, ChronoUnit.MINUTES)));

    push.changed(AlertEvent.Change.RAISED, "A-1001");

    verify(messaging, never()).convertAndSendToUser(anyString(), anyString(), any());
  }

  @Test
  void neverPushesToAConnectionWhoseTokenHasExpired() {
    connected(connection("kandy", "KDY", NOW.minus(1, ChronoUnit.SECONDS)));

    push.changed(AlertEvent.Change.RAISED, "A-1001");
    push.resynchronise();

    verify(messaging, never()).convertAndSendToUser(anyString(), anyString(), any());
  }

  @Test
  void pushesNothingForAnAlertThatNoLongerExists() {
    connected(connection("kandy", "KDY", NOW.plus(10, ChronoUnit.MINUTES)));

    push.changed(AlertEvent.Change.UPDATED, "A-9999");

    verify(messaging, never()).convertAndSendToUser(anyString(), anyString(), any());
  }

  @Test
  void asksEveryLiveConnectionToReadAgain() {
    connected(
        connection("kandy", "KDY", NOW.plus(10, ChronoUnit.MINUTES)),
        connection("colombo", "CMB", NOW.plus(10, ChronoUnit.MINUTES)));

    push.resynchronise();

    verify(messaging).convertAndSendToUser("kandy", "/queue/alerts", AlertEvent.resync());
    verify(messaging).convertAndSendToUser("colombo", "/queue/alerts", AlertEvent.resync());
  }

  private void connected(SocketPrincipal... principals) {
    Set<SimpUser> users =
        List.of(principals).stream()
            .map(
                principal -> {
                  SimpUser user = mock(SimpUser.class);
                  when(user.getPrincipal()).thenReturn(principal);
                  return user;
                })
            .collect(Collectors.toSet());
    when(connections.getUsers()).thenReturn(users);
  }

  private static SocketPrincipal connection(String name, String district, Instant expiresAt) {
    return new SocketPrincipal(name, 7, DistrictScope.of(List.of(district)), expiresAt);
  }
}
