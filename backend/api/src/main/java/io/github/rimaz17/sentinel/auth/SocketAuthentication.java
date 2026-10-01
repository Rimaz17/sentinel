package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Role;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Checks every frame a browser sends over the alert WebSocket.
 *
 * <p>A browser cannot put a token on the WebSocket handshake itself, so the handshake is open and
 * the STOMP CONNECT frame that follows carries the access token instead, in an {@code
 * Authorization} header, as a request would. Only an inspector's token is accepted. After that the
 * connection may subscribe to its own alert queue and nothing else, and may never send: the push
 * only ever runs from the API to the browser. Anything refused ends the connection with a STOMP
 * ERROR frame that says why.
 */
@Component
public class SocketAuthentication implements ChannelInterceptor {

  /** The one destination a connection may subscribe to: its own queue of alert changes. */
  public static final String ALERTS = "/user/queue/alerts";

  public static final String SIGN_IN = "Sign in as an inspector to receive alerts.";
  public static final String ALERTS_ONLY = "The only subscription on offer is " + ALERTS + ".";
  public static final String RECEIVE_ONLY =
      "Nothing may be sent on this connection; it only receives.";

  private static final String BEARER = "Bearer ";

  private final JwtDecoder tokens;

  SocketAuthentication(JwtDecoder tokens) {
    this.tokens = tokens;
  }

  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor stomp =
        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
    if (stomp == null || stomp.getCommand() == null) {
      // A heartbeat, which carries nothing.
      return message;
    }
    switch (stomp.getCommand()) {
      case CONNECT, STOMP ->
          stomp.setUser(authenticate(stomp.getFirstNativeHeader(HttpHeaders.AUTHORIZATION)));
      case SUBSCRIBE -> {
        if (!(stomp.getUser() instanceof SocketPrincipal)
            || !ALERTS.equals(stomp.getDestination())) {
          throw new MessageDeliveryException(ALERTS_ONLY);
        }
      }
      case SEND -> throw new MessageDeliveryException(RECEIVE_ONLY);
      default -> {
        // UNSUBSCRIBE, DISCONNECT and acknowledgements need no permission.
      }
    }
    return message;
  }

  private SocketPrincipal authenticate(String authorization) {
    if (authorization == null || !authorization.startsWith(BEARER)) {
      throw new MessageDeliveryException(SIGN_IN);
    }
    Jwt jwt;
    try {
      jwt = tokens.decode(authorization.substring(BEARER.length()));
    } catch (JwtException e) {
      // Expired, forged or malformed: the decoder's reason is not passed on.
      throw new MessageDeliveryException(SIGN_IN);
    }
    Caller.Staff staff = Caller.Staff.from(jwt);
    if (staff.role() != Role.PHI) {
      throw new MessageDeliveryException(SIGN_IN);
    }
    return new SocketPrincipal(
        UUID.randomUUID().toString(), staff.accountId(), staff.scope(), jwt.getExpiresAt());
  }
}
