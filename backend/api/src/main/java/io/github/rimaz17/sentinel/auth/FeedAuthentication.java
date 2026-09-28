package io.github.rimaz17.sentinel.auth;

import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * The trusted report feed: a system submitting on behalf of many facilities, as a hospital
 * information system gateway would. It is not a person and holds no account, so it is an authority
 * of its own rather than a role. See docs/adr/0012-trusted-report-feed.md.
 */
final class FeedAuthentication extends AbstractAuthenticationToken {

  static final String AUTHORITY = "FEED";

  FeedAuthentication() {
    super(List.of(new SimpleGrantedAuthority(AUTHORITY)));
    setAuthenticated(true);
  }

  @Override
  public Object getCredentials() {
    return "";
  }

  @Override
  public Object getPrincipal() {
    return "report feed";
  }
}
