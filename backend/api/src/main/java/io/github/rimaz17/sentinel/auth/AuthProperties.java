package io.github.rimaz17.sentinel.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Sign-in settings, from the environment.
 *
 * @param jwtSecret the key access tokens are signed with; at least 32 bytes, never committed
 * @param accessTokenTtl how long an access token is accepted; short, because it cannot be revoked
 * @param refreshTokenTtl how long a refresh token lasts unused; each use replaces it with a new
 *     one, so an inspector who keeps working stays signed in through a long shift
 * @param cookieSecure whether the refresh cookie is sent over HTTPS only; browsers treat localhost
 *     as secure, so this can stay on for local development
 */
@ConfigurationProperties("sentinel.auth")
public record AuthProperties(
    String jwtSecret,
    @DefaultValue("15m") Duration accessTokenTtl,
    @DefaultValue("12h") Duration refreshTokenTtl,
    @DefaultValue("true") boolean cookieSecure) {

  static final int MIN_SECRET_BYTES = 32;

  public AuthProperties {
    if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
      throw new IllegalStateException(
          "Set SENTINEL_JWT_SECRET to a random value of at least 32 bytes,"
              + " for example the output of: openssl rand -base64 48");
    }
  }

  byte[] secretBytes() {
    return jwtSecret.getBytes(StandardCharsets.UTF_8);
  }
}
