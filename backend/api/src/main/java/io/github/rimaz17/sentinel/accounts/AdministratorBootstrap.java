package io.github.rimaz17.sentinel.accounts;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provisions the system administrator at setup. There is no sign-up for administrators or
 * inspectors, so the first administrator comes from the environment: on startup, if the address in
 * {@code SENTINEL_ADMIN_EMAIL} holds no account, one is created with the password in {@code
 * SENTINEL_ADMIN_PASSWORD}. An existing account is never changed, so the variables can stay set.
 */
@Component
class AdministratorBootstrap implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(AdministratorBootstrap.class);

  private final AccountRepository accounts;
  private final PasswordEncoder passwords;
  private final Clock clock;
  private final String email;
  private final String password;

  AdministratorBootstrap(
      AccountRepository accounts,
      PasswordEncoder passwords,
      Clock clock,
      @Value("${sentinel.admin.email:}") String email,
      @Value("${sentinel.admin.password:}") String password) {
    this.accounts = accounts;
    this.passwords = passwords;
    this.clock = clock;
    this.email = email;
    this.password = password;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (email.isBlank()) {
      if (!accounts.existsByRole(Role.ADMIN)) {
        log.info(
            "No administrator account exists. Set SENTINEL_ADMIN_EMAIL and"
                + " SENTINEL_ADMIN_PASSWORD to create one at startup.");
      }
      return;
    }
    if (accounts.findByEmail(Account.normaliseEmail(email)).isPresent()) {
      return;
    }
    PasswordPolicy.problem(password)
        .ifPresent(
            problem -> {
              throw new IllegalStateException("SENTINEL_ADMIN_PASSWORD " + problem);
            });
    accounts.save(
        Account.administrator(email, "Administrator", passwords.encode(password), clock.instant()));
    log.info("Created the administrator account named in SENTINEL_ADMIN_EMAIL.");
  }
}
