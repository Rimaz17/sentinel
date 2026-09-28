package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time links an administrator passes to an inspector, who follows one to set their password.
 * Sentinel sends no email, so the administrator delivers the link themselves, as the project
 * overview describes. See the activation_tokens migration.
 */
@Service
@Transactional
public class ActivationLinks {

  /** Long enough for a link sent on a Friday to be used on a Monday. */
  static final Duration LIFETIME = Duration.ofDays(7);

  private final ActivationTokenRepository tokens;
  private final Clock clock;

  ActivationLinks(ActivationTokenRepository tokens, Clock clock) {
    this.tokens = tokens;
    this.clock = clock;
  }

  /** A link's secret, shown to the administrator this once. Only its hash is kept. */
  public record IssuedLink(String token, Instant expiresAt) {}

  /** A new link for an account, replacing any it had. */
  public IssuedLink issue(Account account) {
    Instant now = clock.instant();
    String token = SecretTokens.generate();
    ActivationToken row =
        tokens.findById(account.getId()).orElseGet(() -> new ActivationToken(account.getId()));
    row.reissue(SecretTokens.hash(token), now, now.plus(LIFETIME));
    tokens.save(row);
    return new IssuedLink(token, row.getExpiresAt());
  }

  /** When each account's outstanding link expires, by account id; accounts with none absent. */
  @Transactional(readOnly = true)
  public Map<Long, Instant> expiryByAccount(List<Long> accountIds) {
    return tokens.findAllById(accountIds).stream()
        .collect(Collectors.toMap(ActivationToken::getAccountId, ActivationToken::getExpiresAt));
  }
}
