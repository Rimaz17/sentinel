package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.auth.RefreshToken.RevokedReason;
import io.github.rimaz17.sentinel.web.ApiProblem;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues, rotates and revokes refresh tokens. See the refresh_tokens migration for why only hashes
 * are stored and how reuse is detected.
 */
@Service
@Transactional
class RefreshTokens {

  static final String NOT_SIGNED_IN = "Not signed in, or the session has ended. Sign in again.";

  /**
   * How long a token that was just replaced may be presented again without alarm. Two tabs of the
   * dashboard refreshing at the same moment both send the same cookie; the second is refused, but
   * it is not treated as theft.
   */
  static final Duration REUSE_GRACE = Duration.ofSeconds(60);

  private final RefreshTokenRepository tokens;
  private final AuthProperties properties;
  private final Clock clock;

  RefreshTokens(RefreshTokenRepository tokens, AuthProperties properties, Clock clock) {
    this.tokens = tokens;
    this.properties = properties;
    this.clock = clock;
  }

  /** A token and the account it now belongs to. */
  record Rotation(Account account, String token) {}

  /** A new token for an account that has just proved who it is. */
  String issue(Account account) {
    Instant now = clock.instant();
    tokens.deleteExpired(account.getId(), now);
    String token = SecretTokens.generate();
    tokens.save(
        new RefreshToken(
            account, SecretTokens.hash(token), now, now.plus(properties.refreshTokenTtl())));
    return token;
  }

  /**
   * Exchanges a token for a new one. Refused if the token is unknown, expired, revoked or belongs
   * to a disabled account. A token replaced longer ago than {@link #REUSE_GRACE} is a copy in
   * someone else's hands, and every token its account holds is revoked. That revocation must
   * outlive the refusal, so the refusal does not roll it back.
   */
  @Transactional(noRollbackFor = ApiProblem.class)
  Rotation rotate(String token) {
    Instant now = clock.instant();
    RefreshToken current =
        tokens.findByTokenHash(SecretTokens.hash(token)).orElseThrow(RefreshTokens::notSignedIn);
    Account account = current.getAccount();
    if (current.isRevoked()) {
      if (current.getRevokedReason() == RevokedReason.ROTATED
          && current.getRevokedAt().plus(REUSE_GRACE).isBefore(now)) {
        revokeAll(account.getId(), RevokedReason.REUSED);
      }
      throw notSignedIn();
    }
    if (!current.getExpiresAt().isAfter(now) || !account.isEnabled()) {
      throw notSignedIn();
    }
    current.revoke(RevokedReason.ROTATED, now);
    return new Rotation(account, issue(account));
  }

  /** Ends the session a token belongs to. An unknown token is ignored. */
  void revoke(String token) {
    tokens
        .findByTokenHash(SecretTokens.hash(token))
        .ifPresent(found -> found.revoke(RevokedReason.SIGNED_OUT, clock.instant()));
  }

  /** Ends every session an account holds, because the account itself has changed. */
  void revokeAll(long accountId) {
    revokeAll(accountId, RevokedReason.ACCOUNT_CHANGED);
  }

  private void revokeAll(long accountId, RevokedReason reason) {
    Instant now = clock.instant();
    tokens.findByAccountIdAndRevokedAtIsNull(accountId).forEach(t -> t.revoke(reason, now));
  }

  private static ApiProblem notSignedIn() {
    return new ApiProblem(HttpStatus.UNAUTHORIZED, NOT_SIGNED_IN);
  }
}
