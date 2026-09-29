package io.github.rimaz17.sentinel.facilities;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface FacilityInviteCodeRepository extends JpaRepository<FacilityInviteCode, Long> {

  Optional<FacilityInviteCode> findByCodeHash(String codeHash);
}
