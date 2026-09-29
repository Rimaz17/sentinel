package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Starts sessions: an access token in the body, and the refresh token in a cookie that scripts
 * cannot read, that is sent only to the API's sign-in endpoints, and never with a request started
 * by another site.
 */
@Component
class Sessions {

  static final String REFRESH_COOKIE = "sentinel_refresh";
  static final String COOKIE_PATH = "/api/auth";

  private final AccessTokens accessTokens;
  private final RefreshTokens refreshTokens;
  private final AuthProperties properties;

  Sessions(AccessTokens accessTokens, RefreshTokens refreshTokens, AuthProperties properties) {
    this.accessTokens = accessTokens;
    this.refreshTokens = refreshTokens;
    this.properties = properties;
  }

  /** A new session for an account that has just proved who it is. */
  ResponseEntity<SessionResponse> start(Account account, HttpStatus status) {
    return respond(account, refreshTokens.issue(account), status);
  }

  /** A session continued under a refresh token that has just been issued for it. */
  ResponseEntity<SessionResponse> respond(Account account, String refreshToken, HttpStatus status) {
    AccessTokens.IssuedToken access = accessTokens.issue(account);
    return ResponseEntity.status(status)
        .header(
            HttpHeaders.SET_COOKIE, cookie(refreshToken, properties.refreshTokenTtl()).toString())
        .body(
            new SessionResponse(access.value(), access.expiresAt(), AccountResponse.from(account)));
  }

  /** Tells the browser to forget its refresh token. */
  ResponseCookie expiredCookie() {
    return cookie("", Duration.ZERO);
  }

  private ResponseCookie cookie(String value, Duration maxAge) {
    return ResponseCookie.from(REFRESH_COOKIE, value)
        .httpOnly(true)
        .secure(properties.cookieSecure())
        .sameSite("Strict")
        .path(COOKIE_PATH)
        .maxAge(maxAge)
        .build();
  }
}
