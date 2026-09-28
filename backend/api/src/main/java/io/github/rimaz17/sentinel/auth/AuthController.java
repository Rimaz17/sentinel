package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.web.ApiProblem;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Signing in and out, and keeping a signed-in person signed in. */
@RestController
@RequestMapping("/api/auth")
class AuthController {

  private final SignInService signIn;
  private final RefreshTokens refreshTokens;
  private final Sessions sessions;
  private final AccountService accounts;

  AuthController(
      SignInService signIn,
      RefreshTokens refreshTokens,
      Sessions sessions,
      AccountService accounts) {
    this.signIn = signIn;
    this.refreshTokens = refreshTokens;
    this.sessions = sessions;
    this.accounts = accounts;
  }

  @PostMapping("/signin")
  ResponseEntity<SessionResponse> signIn(@Valid @RequestBody SignInRequest request) {
    return sessions.start(signIn.authenticate(request.email(), request.password()), HttpStatus.OK);
  }

  /** A new access token, and a new refresh token in place of the one presented. */
  @PostMapping("/refresh")
  ResponseEntity<SessionResponse> refresh(
      @CookieValue(name = Sessions.REFRESH_COOKIE, required = false) String token) {
    if (token == null || token.isBlank()) {
      throw new ApiProblem(HttpStatus.UNAUTHORIZED, RefreshTokens.NOT_SIGNED_IN);
    }
    RefreshTokens.Rotation rotation = refreshTokens.rotate(token);
    return sessions.respond(rotation.account(), rotation.token(), HttpStatus.OK);
  }

  /**
   * Ends this browser's session. The access token it holds stays valid until it expires, at most
   * fifteen minutes; the browser discards it.
   */
  @PostMapping("/signout")
  ResponseEntity<Void> signOut(
      @CookieValue(name = Sessions.REFRESH_COOKIE, required = false) String token) {
    if (token != null && !token.isBlank()) {
      refreshTokens.revoke(token);
    }
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, sessions.expiredCookie().toString())
        .build();
  }

  @GetMapping("/me")
  AccountResponse me(@AuthenticationPrincipal Jwt jwt) {
    Account account =
        accounts
            .findById(Long.parseLong(jwt.getSubject()))
            .filter(Account::isEnabled)
            .orElseThrow(
                () -> new ApiProblem(HttpStatus.UNAUTHORIZED, RefreshTokens.NOT_SIGNED_IN));
    return AccountResponse.from(account);
  }
}
