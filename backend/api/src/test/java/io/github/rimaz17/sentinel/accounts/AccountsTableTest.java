package io.github.rimaz17.sentinel.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/** The accounts table and the rules the migration holds every row to. */
@IntegrationTest
class AccountsTableTest {

  @Autowired AccountRepository accounts;
  @Autowired JdbcTemplate jdbc;
  @Autowired TestAccounts testAccounts;

  @BeforeEach
  void clear() {
    testAccounts.clear();
  }

  @Test
  void storesAnInspectorsScopeAndReadsItBack() {
    accounts.save(
        Account.inspector(
            " Nimal.Silva@Example.org ",
            "Nimal Silva",
            DistrictScope.of(List.of("MTL", "KDY")),
            Instant.now()));

    Account stored = accounts.findByEmail("nimal.silva@example.org").orElseThrow();
    assertThat(stored.getRole()).isEqualTo(Role.PHI);
    assertThat(stored.getScope().entries()).containsExactly("KDY", "MTL");
    assertThat(stored.isActivated()).isFalse();
    assertThat(stored.isEnabled()).isTrue();
  }

  @Test
  void storesNationalReachAsTheWildcard() {
    accounts.save(
        Account.inspector(
            "national@example.org", "National", DistrictScope.NATIONAL, Instant.now()));

    assertThat(jdbc.queryForObject("select districts::text from accounts", String.class))
        .isEqualTo("{*}");
  }

  @Test
  void refusesAnInspectorWithNoScope() {
    assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into accounts (email, display_name, role, districts, created_at)
                    values ('phi@example.org', 'PHI', 'PHI', '{}', now())
                    """))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void refusesADataProviderWithoutAFacility() {
    assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into accounts (email, display_name, password_hash, role, created_at)
                    values ('clinic@example.org', 'Clinic', 'x', 'DATA_PROVIDER', now())
                    """))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void refusesAFacilityOnAnyoneButADataProvider() {
    assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into accounts (email, display_name, role, facility_id, districts,
                      created_at)
                    values ('phi@example.org', 'PHI', 'PHI',
                      (select id from facilities where code = 'LKY0001016'), '{KDY}', now())
                    """))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void refusesAnEmailWithCapitals() {
    assertThatThrownBy(
            () ->
                jdbc.update(
                    """
                    insert into accounts (email, display_name, password_hash, role, created_at)
                    values ('Admin@example.org', 'Admin', 'x', 'ADMIN', now())
                    """))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
