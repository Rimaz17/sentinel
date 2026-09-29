package io.github.rimaz17.sentinel.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface ActivationTokenRepository extends JpaRepository<ActivationToken, Long> {

  Optional<ActivationToken> findByTokenHash(String tokenHash);
}
