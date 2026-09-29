package io.github.rimaz17.sentinel.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class SocketAuthenticationTest {

  private static final SecretKey KEY = key("socket-tests-only-signing-key-0123456789abcdef");

  private final SocketAuthentication authentication =
      new SocketAuthentication(
          NimbusJwtDecoder.withSecretKey(KEY).macAlgorithm(MacAlgorithm.HS256).build());
  private final MessageChannel channel = mock(MessageChannel.class);

  @Test
  void letsAnInspectorConnectAsThisConnectionAlone() {
    Instant expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES).truncatedTo(ChronoUnit.SECONDS);
    String token = token(KEY, "PHI", List.of("KDY"), expiresAt);

    SocketPrincipal first = connect(token);
    SocketPrincipal second = connect(token);

    assertThat(first.accountId()).isEqualTo(42);
    assertThat(first.scope().includes("KDY")).isTrue();
    assertThat(first.scope().includes("CMB")).isFalse();
    assertThat(first.expiresAt()).isEqualTo(expiresAt);
    assertThat(first.getName()).isNotEqualTo(second.getName()).doesNotContain("42");
  }

  @Test
  void refusesAConnectionWithoutAToken() {
    assertRefused(frame(StompCommand.CONNECT, null, null));
  }

  @Test
  void refusesAConnectionWithAnythingButABearerToken() {
    assertRefused(frame(StompCommand.CONNECT, "Basic cGhpOnBhc3N3b3Jk", null));
  }

  @Test
  void refusesADataProviderOrAnAdministrator() {
    Instant later = Instant.now().plus(15, ChronoUnit.MINUTES);
    for (String role : List.of("DATA_PROVIDER", "ADMIN")) {
      assertRefused(frame(StompCommand.CONNECT, "Bearer " + token(KEY, role, null, later), null));
    }
  }

  @Test
  void refusesAnExpiredToken() {
    String expired = token(KEY, "PHI", List.of("*"), Instant.now().minus(2, ChronoUnit.MINUTES));

    assertRefused(frame(StompCommand.CONNECT, "Bearer " + expired, null));
  }

  @Test
  void refusesATokenSignedWithAnotherKey() {
    String forged =
        token(
            key("some-other-signing-key-0123456789abcdef-xyz"),
            "PHI",
            List.of("*"),
            Instant.now().plus(15, ChronoUnit.MINUTES));

    assertRefused(frame(StompCommand.CONNECT, "Bearer " + forged, null));
  }

  @Test
  void letsAConnectedInspectorSubscribeToTheirAlerts() {
    StompHeaderAccessor subscribe = subscribe(SocketAuthentication.ALERTS);

    assertThatCode(() -> authentication.preSend(message(subscribe), channel))
        .doesNotThrowAnyException();
  }

  @Test
  void refusesASubscriptionToAnythingElse() {
    for (String destination :
        List.of("/queue/alerts", "/queue/alerts-user123", "/topic/alerts", "/user/queue/other")) {
      assertThatThrownBy(() -> authentication.preSend(message(subscribe(destination)), channel))
          .as(destination)
          .isInstanceOf(MessageDeliveryException.class)
          .hasMessage(SocketAuthentication.ALERTS_ONLY);
    }
  }

  @Test
  void refusesASubscriptionBeforeSigningIn() {
    StompHeaderAccessor subscribe = frame(StompCommand.SUBSCRIBE, null, null);
    subscribe.setDestination(SocketAuthentication.ALERTS);

    assertThatThrownBy(() -> authentication.preSend(message(subscribe), channel))
        .isInstanceOf(MessageDeliveryException.class);
  }

  @Test
  void refusesAnythingSent() {
    StompHeaderAccessor send = frame(StompCommand.SEND, null, connected());
    send.setDestination("/queue/alerts");

    assertThatThrownBy(() -> authentication.preSend(message(send), channel))
        .isInstanceOf(MessageDeliveryException.class)
        .hasMessage(SocketAuthentication.RECEIVE_ONLY);
  }

  @Test
  void letsAHeartbeatThrough() {
    Message<byte[]> heartbeat =
        MessageBuilder.createMessage(
            new byte[0], StompHeaderAccessor.createForHeartbeat().getMessageHeaders());

    assertThat(authentication.preSend(heartbeat, channel)).isSameAs(heartbeat);
  }

  private SocketPrincipal connect(String token) {
    StompHeaderAccessor connect = frame(StompCommand.CONNECT, "Bearer " + token, null);
    authentication.preSend(message(connect), channel);
    return (SocketPrincipal) connect.getUser();
  }

  private StompHeaderAccessor subscribe(String destination) {
    StompHeaderAccessor subscribe = frame(StompCommand.SUBSCRIBE, null, connected());
    subscribe.setDestination(destination);
    return subscribe;
  }

  private SocketPrincipal connected() {
    return connect(token(KEY, "PHI", List.of("KDY"), Instant.now().plus(15, ChronoUnit.MINUTES)));
  }

  private void assertRefused(StompHeaderAccessor connect) {
    assertThatThrownBy(() -> authentication.preSend(message(connect), channel))
        .isInstanceOf(MessageDeliveryException.class)
        .hasMessage(SocketAuthentication.SIGN_IN);
    assertThat(connect.getUser()).isNull();
  }

  private static StompHeaderAccessor frame(
      StompCommand command, String authorization, SocketPrincipal user) {
    StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
    if (authorization != null) {
      accessor.setNativeHeader("Authorization", authorization);
    }
    if (user != null) {
      accessor.setUser(user);
    }
    accessor.setLeaveMutable(true);
    return accessor;
  }

  private static Message<byte[]> message(StompHeaderAccessor accessor) {
    return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
  }

  private static String token(SecretKey key, String role, List<String> districts, Instant expiry) {
    JwtClaimsSet.Builder claims =
        JwtClaimsSet.builder()
            .issuer("sentinel")
            .subject("42")
            .issuedAt(expiry.minus(15, ChronoUnit.MINUTES))
            .expiresAt(expiry)
            .claim("role", role);
    if (districts != null) {
      claims.claim("districts", districts);
    }
    return new NimbusJwtEncoder(new ImmutableSecret<>(key))
        .encode(
            JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
        .getTokenValue();
  }

  private static SecretKey key(String secret) {
    return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }
}
