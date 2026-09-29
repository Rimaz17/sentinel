package io.github.rimaz17.sentinel.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Limits the two kinds of request worth abusing. Guessing passwords, invite codes or activation
 * links is limited per client address; submitting reports is limited per data provider account,
 * which is the identity that matters there. The report feed is one trusted caller doing bulk work
 * and is not limited. Refresh is not limited either: its token is 256 random bits.
 */
final class RateLimitFilter extends OncePerRequestFilter {

  static final String SLOW_DOWN = "Too many requests. Wait a minute and try again.";

  private static final Set<String> GUESSABLE =
      Set.of(
          "/api/auth/signin",
          "/api/auth/register",
          "/api/auth/invite-codes/check",
          "/api/auth/activation/check",
          "/api/auth/activate");

  private static final String INGESTION = "/api/ingestion/reports";

  private final RateLimiter limiter;
  private final int authPerMinute;
  private final int ingestionPerMinute;

  RateLimitFilter(RateLimiter limiter, int authPerMinute, int ingestionPerMinute) {
    this.limiter = limiter;
    this.authPerMinute = authPerMinute;
    this.ingestionPerMinute = ingestionPerMinute;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    long retryAfter = retryAfter(request);
    if (retryAfter > 0) {
      response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter));
      SecurityProblems.write(response, HttpStatus.TOO_MANY_REQUESTS, SLOW_DOWN);
      return;
    }
    chain.doFilter(request, response);
  }

  private long retryAfter(HttpServletRequest request) {
    if (!"POST".equals(request.getMethod())) {
      return 0;
    }
    String path = request.getRequestURI();
    if (GUESSABLE.contains(path)) {
      // The address the connection came from. Headers such as X-Forwarded-For are not trusted,
      // because anyone can set them; behind a proxy this is the proxy's address.
      return limiter.acquire("auth:" + request.getRemoteAddr(), authPerMinute);
    }
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (INGESTION.equals(path) && authentication instanceof JwtAuthenticationToken token) {
      return limiter.acquire("ingest:" + token.getToken().getSubject(), ingestionPerMinute);
    }
    return 0;
  }
}
