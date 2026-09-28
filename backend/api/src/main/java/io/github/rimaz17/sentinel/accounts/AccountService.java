package io.github.rimaz17.sentinel.accounts;

import io.github.rimaz17.sentinel.districts.District;
import io.github.rimaz17.sentinel.districts.DistrictService;
import io.github.rimaz17.sentinel.facilities.Facility;
import io.github.rimaz17.sentinel.web.ApiProblem;
import io.github.rimaz17.sentinel.web.InvalidFieldException;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AccountService {

  static final String EMAIL_TAKEN = "An account already uses this email address.";
  static final String SCOPE_REQUIRED = "must name at least one district, or * for every district";
  static final String SCOPE_WILDCARD_ALONE = "must be * alone, or district codes without *";
  static final String SCOPE_UNKNOWN = "must be district codes such as KDY";

  private final AccountRepository accounts;
  private final PasswordEncoder passwords;
  private final DistrictService districts;
  private final Clock clock;

  AccountService(
      AccountRepository accounts,
      PasswordEncoder passwords,
      DistrictService districts,
      Clock clock) {
    this.accounts = accounts;
    this.passwords = passwords;
    this.districts = districts;
    this.clock = clock;
  }

  /** Every account, or those with one role, grouped by role and then by name. */
  public List<Account> list(Role role) {
    return role == null
        ? accounts.findAllByOrderByRoleAscDisplayNameAsc()
        : accounts.findByRoleOrderByDisplayNameAsc(role);
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

  /** Sets an account's password, after checking it against the policy. */
  @Transactional
  public Account setPassword(long accountId, String password) {
    requireAcceptable(password);
    Account account = accounts.findWithFacilityById(accountId).orElseThrow();
    account.setPasswordHash(passwords.encode(password));
    return account;
  }

  /**
   * An inspector created by an administrator, covering the given districts or, with {@code *},
   * every district. They have no password until they follow their activation link.
   */
  @Transactional
  public Account createInspector(String email, String displayName, List<String> districtEntries) {
    DistrictScope scope = scopeOf(districtEntries);
    if (accounts.existsByEmail(Account.normaliseEmail(email))) {
      throw new ApiProblem(HttpStatus.CONFLICT, EMAIL_TAKEN);
    }
    return accounts.save(Account.inspector(email, displayName, scope, clock.instant()));
  }

  /** A scope from an administrator's list, every entry checked against the 25 districts. */
  private DistrictScope scopeOf(List<String> entries) {
    if (entries == null || entries.isEmpty()) {
      throw new InvalidFieldException("districts", SCOPE_REQUIRED);
    }
    if (entries.contains(DistrictScope.EVERY_DISTRICT)) {
      if (entries.size() > 1) {
        throw new InvalidFieldException("districts", SCOPE_WILDCARD_ALONE);
      }
      return DistrictScope.NATIONAL;
    }
    Set<String> known = districts.all().stream().map(District::getCode).collect(Collectors.toSet());
    if (!known.containsAll(entries)) {
      throw new InvalidFieldException("districts", SCOPE_UNKNOWN);
    }
    return DistrictScope.of(entries);
  }

  private static void requireAcceptable(String password) {
    PasswordPolicy.problem(password)
        .ifPresent(
            problem -> {
              throw new InvalidFieldException("password", problem);
            });
  }
}
