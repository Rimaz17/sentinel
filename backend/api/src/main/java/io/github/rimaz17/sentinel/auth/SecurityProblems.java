package io.github.rimaz17.sentinel.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * Refusals made before a request reaches a controller, answered as RFC 9457 problem details like
 * every other error the API returns. The wording is fixed; nothing from the request is repeated.
 */
final class SecurityProblems implements AuthenticationEntryPoint, AccessDeniedHandler {

  static final String SIGN_IN = "Sign in to use this part of the API.";
  static final String TOKEN_REFUSED =
      "The access token is not valid or has expired. Renew the session or sign in again.";
  static final String NOT_PERMITTED = Caller.NOT_PERMITTED;

  @Override
  public void commence(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException {
    boolean tokenRefused = exception instanceof OAuth2AuthenticationException;
    response.setHeader(
        HttpHeaders.WWW_AUTHENTICATE, tokenRefused ? "Bearer error=\"invalid_token\"" : "Bearer");
    write(response, HttpStatus.UNAUTHORIZED, tokenRefused ? TOKEN_REFUSED : SIGN_IN);
  }

  @Override
  public void handle(
      HttpServletRequest request, HttpServletResponse response, AccessDeniedException exception)
      throws IOException {
    write(response, HttpStatus.FORBIDDEN, NOT_PERMITTED);
  }

  /** Writes a problem whose detail is one of this class's own constants. */
  static void write(HttpServletResponse response, HttpStatus status, String detail)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response
        .getWriter()
        .write(
            """
            {"type":"about:blank","title":"%s","status":%d,"detail":"%s"}"""
                .formatted(status.getReasonPhrase(), status.value(), detail));
  }
}
