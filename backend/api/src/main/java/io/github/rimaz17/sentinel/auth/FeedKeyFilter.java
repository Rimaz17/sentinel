package io.github.rimaz17.sentinel.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Recognises the report feed by the key in its {@value #HEADER} header. With no key configured the
 * feed is switched off and every key is refused. A wrong key is refused at once rather than treated
 * as anonymous, so a misconfigured simulator fails loudly.
 */
final class FeedKeyFilter extends OncePerRequestFilter {

  static final String HEADER = "X-Feed-Key";
  static final String REFUSED =
      "The feed key is not recognised, or the report feed is switched off.";

  private final byte[] key;

  FeedKeyFilter(String key) {
    this.key = key == null ? new byte[0] : key.getBytes(StandardCharsets.UTF_8);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String presented = request.getHeader(HEADER);
    if (presented == null) {
      chain.doFilter(request, response);
      return;
    }
    // Compared in constant time, so the response time says nothing about how much matched.
    boolean matches =
        key.length > 0 && MessageDigest.isEqual(key, presented.getBytes(StandardCharsets.UTF_8));
    if (!matches) {
      SecurityProblems.write(response, HttpStatus.UNAUTHORIZED, REFUSED);
      return;
    }
    SecurityContextHolder.getContext().setAuthentication(new FeedAuthentication());
    try {
      chain.doFilter(request, response);
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
