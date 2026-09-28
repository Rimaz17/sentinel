package io.github.rimaz17.sentinel.accounts;

import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.web.ApiProblem;
import io.github.rimaz17.sentinel.web.InvalidFieldException;
import java.time.Clock;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AccountService {

  static final String EMAIL_TAKEN = "An account already uses this email address.";

  private final AccountRepository accounts;
  private final PasswordEncoder passwords;
  private final Clock clock;

  AccountService(AccountRepository accounts, PasswordEncoder passwords, Clock clock) {
    this.accounts = accounts;
    this.passwords = passwords;
    this.clock = clock;
  }

  /** The account for an email address, however it was capitalised or spaced. */
  public Optional<Account> findByEmail(String email) {
    return accounts.findByEmail(Account.normaliseEmail(email));
  }

  /** An account with its facility loaded, so a token can name the facility. */
  public Optional<Account> findById(long id) {
    return accounts.findWithFacilityById(id);
  }

  /**
   * How many data provider accounts each facility has, by facility id. Facilities with none are
   * absent.
   */
  public Map<Long, Long> dataProviderCountsByFacility() {
    return accounts.countDataProvidersByFacility().stream()
        .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
  }

  /**
   * A data provider for a facility whose invite code the caller has already proved they hold. The
   * account is linked to that facility for good.
   */
  @Transactional
  public Account registerDataProvider(
      String email, String displayName, String password, Facility facility) {
    requireAcceptable(password);
    if (accounts.existsByEmail(Account.normaliseEmail(email))) {
      throw new ApiProblem(HttpStatus.CONFLICT, EMAIL_TAKEN);
    }
    return accounts.save(
        Account.dataProvider(
            email, displayName, passwords.encode(password), facility, clock.instant()));
  }

  private static void requireAcceptable(String password) {
    PasswordPolicy.problem(password)
        .ifPresent(
            problem -> {
              throw new InvalidFieldException("password", problem);
            });
  }
}
