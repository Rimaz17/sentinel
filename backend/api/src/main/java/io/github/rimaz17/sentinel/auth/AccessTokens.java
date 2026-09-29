package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.Role;
import java.time.Clock;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

/**
 * Issues access tokens. A token says who the caller is and what they may reach, so a request can be
 * authorised without a lookup: the account id, its role, an inspector's districts and a data
 * provider's facility. Nothing else goes in it; a token is readable by whoever holds it.
 */
@Component
public class AccessTokens {

  static final String ISSUER = "sentinel";
  static final String ROLE_CLAIM = "role";
  static final String DISTRICTS_CLAIM = "districts";
  static final String FACILITY_CLAIM = "facility";

  private final JwtEncoder encoder;
  private final AuthProperties properties;
  private final Clock clock;

  AccessTokens(JwtEncoder encoder, AuthProperties properties, Clock clock) {
    this.encoder = encoder;
    this.properties = properties;
    this.clock = clock;
  }

  public record IssuedToken(String value, Instant expiresAt) {}

  /** A token for an account whose facility, if it has one, is already loaded. */
  public IssuedToken issue(Account account) {
    Instant now = clock.instant();
    Instant expiresAt = now.plus(properties.accessTokenTtl());
    JwtClaimsSet.Builder claims =
        JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject(String.valueOf(account.getId()))
            .issuedAt(now)
            .expiresAt(expiresAt)
            .claim(ROLE_CLAIM, account.getRole().name());
    if (account.getRole() == Role.PHI) {
      claims.claim(DISTRICTS_CLAIM, account.getScope().entries());
    }
    if (account.getRole() == Role.DATA_PROVIDER) {
      claims.claim(FACILITY_CLAIM, account.getFacility().getCode());
    }
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
    String value =
        encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    return new IssuedToken(value, expiresAt);
  }
}
