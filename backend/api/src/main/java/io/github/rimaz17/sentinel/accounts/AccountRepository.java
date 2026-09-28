package io.github.rimaz17.sentinel.accounts;

import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

interface AccountRepository extends JpaRepository<Account, Long> {

  @EntityGraph(attributePaths = "facility")
  Optional<Account> findByEmail(String email);

  @EntityGraph(attributePaths = "facility")
  Optional<Account> findWithFacilityById(long id);

  boolean existsByRole(Role role);
}
