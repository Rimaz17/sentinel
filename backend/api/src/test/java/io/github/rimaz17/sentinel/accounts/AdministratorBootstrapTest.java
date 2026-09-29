package io.github.rimaz17.sentinel.accounts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.rimaz17.sentinel.IntegrationTest;
import io.github.rimaz17.sentinel.TestAccounts;
import java.time.Clock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

@IntegrationTest
class AdministratorBootstrapTest {

  @Autowired AccountRepository accounts;
  @Autowired PasswordEncoder passwords;
  @Autowired TestAccounts testAccounts;

  @BeforeEach
  void clear() {
    testAccounts.clear();
  }

  @Test
  void createsTheAdministratorNamedInTheEnvironment() {
    bootstrap(" Admin@Example.org ", "a long admin password").run(null);

    Account admin = accounts.findByEmail("admin@example.org").orElseThrow();
    assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
    assertThat(passwords.matches("a long admin password", admin.getPasswordHash())).isTrue();
  }

  @Test
  void neverChangesAnAccountThatAlreadyExists() {
    bootstrap("admin@example.org", "a long admin password").run(null);
    bootstrap("admin@example.org", "a different password").run(null);

    Account admin = accounts.findByEmail("admin@example.org").orElseThrow();
    assertThat(passwords.matches("a long admin password", admin.getPasswordHash())).isTrue();
    assertThat(accounts.count()).isEqualTo(1);
  }

  @Test
  void createsNothingWhenNoAddressIsSet() {
    bootstrap("", "").run(null);

    assertThat(accounts.count()).isZero();
  }

  @Test
  void refusesToStartWithAShortPassword() {
    assertThatThrownBy(() -> bootstrap("admin@example.org", "short").run(null))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("SENTINEL_ADMIN_PASSWORD must be at least 12 characters");
    assertThat(accounts.count()).isZero();
  }

  private AdministratorBootstrap bootstrap(String email, String password) {
    return new AdministratorBootstrap(accounts, passwords, Clock.systemUTC(), email, password);
  }
}
