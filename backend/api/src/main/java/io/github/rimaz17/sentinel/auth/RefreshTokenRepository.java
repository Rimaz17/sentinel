package io.github.rimaz17.sentinel.auth;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

  @EntityGraph(attributePaths = {"account", "account.facility"})
  Optional<RefreshToken> findByTokenHash(String tokenHash);

  List<RefreshToken> findByAccountIdAndRevokedAtIsNull(long accountId);

  /** Tokens past their expiry are useless even for detecting reuse, so they are dropped. */
  @Modifying
  @Query("delete from RefreshToken t where t.account.id = :accountId and t.expiresAt < :now")
  void deleteExpired(long accountId, Instant now);
}
