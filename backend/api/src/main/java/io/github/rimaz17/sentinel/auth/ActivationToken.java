package io.github.rimaz17.sentinel.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** An outstanding activation link, stored by its hash. See the activation_tokens migration. */
@Entity
@Table(name = "activation_tokens")
class ActivationToken {

  @Id
  @Column(name = "account_id")
  private Long accountId;

  @Column(name = "token_hash", nullable = false, unique = true)
  private String tokenHash;

  @Column(name = "issued_at", nullable = false)
  private Instant issuedAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  protected ActivationToken() {}

  ActivationToken(long accountId) {
    this.accountId = accountId;
  }

  Long getAccountId() {
    return accountId;
  }

  Instant getExpiresAt() {
    return expiresAt;
  }

  /** Replaces whatever link the account had. */
  void reissue(String tokenHash, Instant issuedAt, Instant expiresAt) {
    this.tokenHash = tokenHash;
    this.issuedAt = issuedAt;
    this.expiresAt = expiresAt;
  }
}
