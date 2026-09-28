package io.github.rimaz17.sentinel.accounts;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface AccountRepository extends JpaRepository<Account, Long> {

  @EntityGraph(attributePaths = "facility")
  Optional<Account> findByEmail(String email);

  @EntityGraph(attributePaths = "facility")
  Optional<Account> findWithFacilityById(long id);

  boolean existsByRole(Role role);

  boolean existsByEmail(String email);

  /** Data provider accounts per facility, as {@code [facilityId, count]}. */
  @Query(
      """
      select a.facility.id, count(a) from Account a
      where a.role = io.github.rimaz17.sentinel.accounts.Role.DATA_PROVIDER
      group by a.facility.id
      """)
  List<Object[]> countDataProvidersByFacility();
}
