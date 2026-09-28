package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.web.InvalidFieldException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

  static final String UNUSABLE =
      "This link has expired or has already been used. Ask an administrator for a new one.";

  private final ActivationTokenRepository tokens;
  private final AccountService accounts;
  private final RefreshTokens refreshTokens;
  private final Clock clock;

  ActivationLinks(
      ActivationTokenRepository tokens,
      AccountService accounts,
      RefreshTokens refreshTokens,
      Clock clock) {
    this.tokens = tokens;
    this.accounts = accounts;
    this.refreshTokens = refreshTokens;
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

  /** The account an unexpired link belongs to, if that account is still enabled. */
  @Transactional(readOnly = true)
  Optional<Account> accountFor(String token) {
    return tokens
        .findByTokenHash(SecretTokens.hash(token))
        .filter(row -> row.getExpiresAt().isAfter(clock.instant()))
        .flatMap(row -> accounts.findById(row.getAccountId()))
        .filter(Account::isEnabled);
  }

  /**
   * Sets the account's password and spends the link. A password the policy refuses leaves the link
   * usable. Any session the account already had is ended, so a link used to reset a password also
   * signs out whoever was using the old one.
   */
  Account activate(String token, String password) {
    Account account =
        accountFor(token).orElseThrow(() -> new InvalidFieldException("token", UNUSABLE));
    Account activated = accounts.setPassword(account.getId(), password);
    tokens.deleteById(account.getId());
    refreshTokens.revokeAll(account.getId());
    return activated;
  }

  /** When each account's outstanding link expires, by account id; accounts with none absent. */
  @Transactional(readOnly = true)
  public Map<Long, Instant> expiryByAccount(List<Long> accountIds) {
    return tokens.findAllById(accountIds).stream()
        .collect(Collectors.toMap(ActivationToken::getAccountId, ActivationToken::getExpiresAt));
  }
}
