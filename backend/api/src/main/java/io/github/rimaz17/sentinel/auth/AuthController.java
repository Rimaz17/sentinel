package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.web.ApiProblem;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.WebUtils;

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
  ResponseEntity<SessionResponse> refresh(HttpServletRequest request) {
    String token = refreshToken(request);
    if (token == null) {
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
  ResponseEntity<Void> signOut(HttpServletRequest request) {
    String token = refreshToken(request);
    if (token != null) {
      refreshTokens.revoke(token);
    }
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, sessions.expiredCookie().toString())
        .build();
  }

  /**
   * The refresh token from its cookie, or null. Read here rather than bound as a method argument,
   * because the web layer logs a handler's arguments at trace level and the token would be among
   * them.
   */
  private static String refreshToken(HttpServletRequest request) {
    Cookie cookie = WebUtils.getCookie(request, Sessions.REFRESH_COOKIE);
    return cookie == null || cookie.getValue().isBlank() ? null : cookie.getValue();
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
