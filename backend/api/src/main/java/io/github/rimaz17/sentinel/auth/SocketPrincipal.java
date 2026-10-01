package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.DistrictScope;
import java.security.Principal;
import java.time.Instant;

/**
 * Who is on the other end of one WebSocket connection, as their access token said when they
 * connected. Every connection has a name of its own, so a message can go to exactly one; and it
 * keeps the token's expiry, so nothing reaches it once the token would be refused anywhere else.
 *
 * @param name unique to this connection, never the account's
 * @param scope the districts the inspector covered when the token was issued
 * @param expiresAt when the token stops being accepted
 */
public record SocketPrincipal(String name, long accountId, DistrictScope scope, Instant expiresAt)
    implements Principal {

  @Override
  public String getName() {
    return name;
  }

  /** Whether the token is still accepted at {@code now}. */
  public boolean isCurrent(Instant now) {
    return now.isBefore(expiresAt);
  }

  /** Whether this connection may be told of an alert in the district at {@code now}. */
  public boolean mayReceive(String districtCode, Instant now) {
    return isCurrent(now) && scope.includes(districtCode);
  }
}
