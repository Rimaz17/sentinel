package io.github.rimaz17.sentinel.alerts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import io.github.rimaz17.sentinel.auth.SocketAuthentication;
import java.lang.reflect.Type;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Alerts pushed over the WebSocket, to a real STOMP client, from every kind of change. */
@IntegrationTest
class AlertPushTest {

  private static final Duration PATIENCE = Duration.ofSeconds(30);

  /** Long enough for an alert that was going to arrive to have arrived. */
  private static final Duration QUIET = Duration.ofSeconds(3);

  private static final JsonMapper JSON = JsonMapper.builder().build();

  @LocalServerPort int port;
  @Autowired TestAccounts accounts;
  @Autowired JdbcTemplate jdbc;
  @Autowired MockMvc mvc;
  @Autowired AlertPush push;

  private final List<StompSession> sessions = new ArrayList<>();

  @BeforeEach
  void clear() {
    accounts.clear();
    jdbc.update("delete from alerts");
  }

  @AfterEach
  void disconnect() {
    sessions.stream().filter(StompSession::isConnected).forEach(StompSession::disconnect);
  }

  @Test
  void tellsAnInspectorTheMomentAnAlertIsRaisedInTheirDistrict() throws Exception {
    Inbox kandy = subscribed(inspector("kandy@example.org", "KDY"));

    String code = raise("KDY");

    JsonNode alert = kandy.next("RAISED").get("alert");
    assertThat(alert.get("code").asString()).isEqualTo(code);
    assertThat(alert.get("districtCode").asString()).isEqualTo("KDY");
    assertThat(alert.get("districtName").asString()).isEqualTo("Kandy");
    assertThat(alert.get("status").asString()).isEqualTo("NEW");
    assertThat(alert.get("observedCount").asInt()).isEqualTo(41);
    assertThat(alert.get("open").asBoolean()).isTrue();
    // The same shape as GET /api/alerts: times as ISO-8601 text.
    assertThat(alert.get("lastDetectedAt").asString()).matches("\\d{4}-\\d{2}-\\d{2}T.*Z");
  }

  @Test
  void neverTellsADistrictInspectorOfAnotherDistrictsAlert() throws Exception {
    Inbox kandy = subscribed(inspector("kandy@example.org", "KDY"));
    Inbox national = subscribed(inspector("national@example.org", "*"));

    String code = raise("CMB");

    assertThat(national.next("RAISED").get("alert").get("code").asString()).isEqualTo(code);
    kandy.assertNothingArrives();
  }

  @Test
  void tellsAnInspectorOfSeveralDistrictsOfEachOfThem() throws Exception {
    Inbox central = subscribed(inspector("central@example.org", "KDY", "MTL"));

    raise("MTL");
    raise("CMB");
    raise("KDY");

    assertThat(central.next("RAISED").get("alert").get("districtCode").asString()).isEqualTo("MTL");
    assertThat(central.next("RAISED").get("alert").get("districtCode").asString()).isEqualTo("KDY");
    central.assertNothingArrives();
  }

  @Test
  void tellsAnInspectorWhenAnotherMovesAnAlertOn() throws Exception {
    Inbox watching = subscribed(inspector("watching@example.org", "KDY"));
    String code = raise("KDY");
    watching.next("RAISED");
    long other = accounts.inspector("other@example.org", "a long password", "KDY");

    mvc.perform(
            post("/api/alerts/{code}/status", code)
                .with(accounts.as(other))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"ACKNOWLEDGED\"}"))
        .andExpect(status().isOk());

    JsonNode alert = watching.next("UPDATED").get("alert");
    assertThat(alert.get("code").asString()).isEqualTo(code);
    assertThat(alert.get("status").asString()).isEqualTo("ACKNOWLEDGED");
  }

  @Test
  void tellsAnInspectorWhenTheDetectorExtendsAnAlert() throws Exception {
    Inbox kandy = subscribed(inspector("kandy@example.org", "KDY"));
    String code = raise("KDY");
    kandy.next("RAISED");

    jdbc.update(
        "update alerts set observed_count = 55, last_detected_at = now() where code = ?", code);

    assertThat(kandy.next("UPDATED").get("alert").get("observedCount").asInt()).isEqualTo(55);
  }

  @Test
  void refusesAConnectionWithoutAnInspectorsToken() throws Exception {
    long provider = accounts.dataProvider("clinic@example.org", "a long password", "LKY0001016");
    long admin = accounts.admin("admin@example.org", "a long password");

    for (String authorization :
        new String[] {
          null, "Bearer not-a-token", accounts.bearer(provider), accounts.bearer(admin)
        }) {
      Inbox inbox = new Inbox();
      assertThatThrownBy(() -> connect(authorization, inbox))
          .as(String.valueOf(authorization))
          .isInstanceOf(ExecutionException.class);
      assertThat(inbox.errors.poll(PATIENCE.toSeconds(), TimeUnit.SECONDS))
          .isEqualTo(SocketAuthentication.SIGN_IN);
    }
  }

  @Test
  void endsAConnectionThatSubscribesToAnythingElse() throws Exception {
    Inbox inbox = new Inbox();
    StompSession session = connect(inspector("kandy@example.org", "KDY"), inbox);

    session.subscribe("/queue/alerts", inbox);

    assertThat(inbox.errors.poll(PATIENCE.toSeconds(), TimeUnit.SECONDS))
        .isEqualTo(SocketAuthentication.ALERTS_ONLY);
    await().atMost(PATIENCE).until(() -> !session.isConnected());
  }

  @Test
  void tellsEveryDashboardToReadAgainOnceItHearsTheDatabaseAgain() throws Exception {
    Inbox kandy = subscribed(inspector("kandy@example.org", "KDY"));

    jdbc.queryForList(
        "select pg_terminate_backend(pid) from pg_stat_activity where application_name = ?",
        AlertChangeListener.APPLICATION_NAME);

    kandy.next("RESYNC");
    String code = raise("KDY");
    assertThat(kandy.next("RAISED").get("alert").get("code").asString()).isEqualTo(code);
  }

  /** A stored inspector's Authorization header. */
  private String inspector(String email, String... districts) {
    return accounts.bearer(accounts.inspector(email, "a long password", districts));
  }

  /** Raises an alert as the detector does, straight into the table. */
  private String raise(String district) {
    return jdbc.queryForObject(
        """
        insert into alerts (district_code, symptom_group, first_detected_at, last_detected_at,
          observed_count, baseline_mean, baseline_sd, z_score, peak_z_score, threshold)
        values (?, 'DENGUE_LIKE', now(), now(), 41, 25, 5, 3.2, 3.2, 3)
        returning code
        """,
        String.class,
        district);
  }

  /**
   * Connects, subscribes to the alert queue, and waits until the subscription is live: the broker
   * confirms nothing, so a resync is pushed until one arrives.
   */
  private Inbox subscribed(String authorization) throws Exception {
    Inbox inbox = new Inbox();
    connect(authorization, inbox).subscribe(SocketAuthentication.ALERTS, inbox);
    await()
        .atMost(PATIENCE)
        .until(
            () -> {
              push.resynchronise();
              return inbox.events.poll(200, TimeUnit.MILLISECONDS) != null;
            });
    // Resyncs sent before the last one arrived may still be on their way.
    Thread.sleep(300);
    inbox.events.clear();
    return inbox;
  }

  private StompSession connect(String authorization, Inbox inbox) throws Exception {
    WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
    StompHeaders headers = new StompHeaders();
    if (authorization != null) {
      headers.add("Authorization", authorization);
    }
    StompSession session =
        client
            .connectAsync(
                "ws://localhost:" + port + AlertSocketConfiguration.ENDPOINT,
                new WebSocketHttpHeaders(),
                headers,
                inbox)
            .get(PATIENCE.toSeconds(), TimeUnit.SECONDS);
    sessions.add(session);
    return session;
  }

  /** Collects a connection's alert events, and the ERROR frames that end it. */
  private static final class Inbox extends StompSessionHandlerAdapter implements StompFrameHandler {

    final BlockingQueue<JsonNode> events = new LinkedBlockingQueue<>();
    final BlockingQueue<String> errors = new LinkedBlockingQueue<>();

    @Override
    public Type getPayloadType(StompHeaders headers) {
      return byte[].class;
    }

    @Override
    public void handleFrame(StompHeaders headers, Object payload) {
      if (headers.getDestination() == null) {
        errors.add(String.valueOf(headers.getFirst("message")));
      } else {
        events.add(JSON.readTree((byte[]) payload));
      }
    }

    /** The next event of the given change, passing over resyncs unless one is wanted. */
    JsonNode next(String change) throws InterruptedException {
      Instant giveUp = Instant.now().plus(PATIENCE);
      while (Instant.now().isBefore(giveUp)) {
        JsonNode event = events.poll(200, TimeUnit.MILLISECONDS);
        if (event != null
            && (change.equals(event.get("change").asString())
                || !"RESYNC".equals(event.get("change").asString()))) {
          assertThat(event.get("change").asString()).isEqualTo(change);
          return event;
        }
      }
      throw new AssertionError("No " + change + " event arrived");
    }

    /** Nothing but resyncs arrives for a while. */
    void assertNothingArrives() throws InterruptedException {
      Instant until = Instant.now().plus(QUIET);
      while (Instant.now().isBefore(until)) {
        JsonNode event = events.poll(200, TimeUnit.MILLISECONDS);
        if (event != null) {
          assertThat(event.get("change").asString()).as(event.toString()).isEqualTo("RESYNC");
        }
      }
    }
  }
}
