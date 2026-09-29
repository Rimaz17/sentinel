package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** A refresh token, stored by its hash. See the refresh_tokens migration. */
@Entity
@Table(name = "refresh_tokens")
class RefreshToken {

  enum RevokedReason {
    ROTATED,
    SIGNED_OUT,
    REUSED,
    ACCOUNT_CHANGED
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "account_id", nullable = false)
  private Account account;

  @Column(name = "token_hash", nullable = false, unique = true)
  private String tokenHash;

  @Column(name = "issued_at", nullable = false)
  private Instant issuedAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "revoked_reason")
  private RevokedReason revokedReason;

  protected RefreshToken() {}

  RefreshToken(Account account, String tokenHash, Instant issuedAt, Instant expiresAt) {
    this.account = account;
    this.tokenHash = tokenHash;
    this.issuedAt = issuedAt;
    this.expiresAt = expiresAt;
  }

  Account getAccount() {
    return account;
  }

  Instant getExpiresAt() {
    return expiresAt;
  }

  Instant getRevokedAt() {
    return revokedAt;
  }

  RevokedReason getRevokedReason() {
    return revokedReason;
  }

  boolean isRevoked() {
    return revokedAt != null;
  }

  void revoke(RevokedReason reason, Instant now) {
    if (revokedAt == null) {
      revokedAt = now;
      revokedReason = reason;
    }
  }
}
