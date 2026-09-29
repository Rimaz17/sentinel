package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.auth.SocketAuthentication;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * The WebSocket that pushes alerts to inspectors' dashboards: STOMP over a plain WebSocket at
 * {@value #ENDPOINT}, with an in-memory broker holding one queue per connection. See
 * docs/adr/0016-alerts-pushed-over-websocket.md.
 *
 * <p>Only pages served from the API's own origin may open it, which through the dashboard's proxy
 * is every page that should. The broker has no application destinations: browsers only ever
 * receive.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebSocketMessageBroker
class AlertSocketConfiguration implements WebSocketMessageBrokerConfigurer {

  static final String ENDPOINT = "/api/ws";

  /**
   * Each side says it is alive every ten seconds, so a connection that died without closing, a
   * laptop lid shut, is noticed and dropped within about half a minute.
   */
  static final long[] HEARTBEAT_MILLIS = {10_000, 10_000};

  private final SocketAuthentication authentication;
  private final TaskScheduler heartbeats;

  AlertSocketConfiguration(
      SocketAuthentication authentication,
      @Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler heartbeats) {
    this.authentication = authentication;
    this.heartbeats = heartbeats;
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    registry.addEndpoint(ENDPOINT);
  }

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    registry
        .enableSimpleBroker("/queue")
        .setHeartbeatValue(HEARTBEAT_MILLIS)
        .setTaskScheduler(heartbeats);
    registry.setUserDestinationPrefix("/user");
  }

  @Override
  public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(authentication);
  }
}
