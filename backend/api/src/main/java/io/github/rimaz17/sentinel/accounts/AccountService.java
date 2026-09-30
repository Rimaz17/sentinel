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
  static final String ONLY_INSPECTORS_HAVE_DISTRICTS = "only an inspector's account has districts";
  static final String NO_SUCH_ACCOUNT = "No account has this id.";
  static final String CANNOT_DISABLE_SELF = "You cannot disable your own account.";
  static final String ENABLE_BEFORE_LINK = "Enable this account before issuing it a new link.";

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
   *
   * @param madeInDemo whether a visitor to the public demonstration is registering, so the demo's
   *     nightly reset removes the account
   */
  @Transactional
  public Account registerDataProvider(
      String email, String displayName, String password, Facility facility, boolean madeInDemo) {
    requireAcceptable(password);
    if (accounts.existsByEmail(Account.normaliseEmail(email))) {
      throw new ApiProblem(HttpStatus.CONFLICT, EMAIL_TAKEN);
    }
    Account account =
        Account.dataProvider(
            email, displayName, passwords.encode(password), facility, clock.instant());
    if (madeInDemo) {
      account.markMadeInDemo();
    }
    return accounts.save(account);
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
   *
   * @param madeInDemo whether the demo administrator is creating it, so the demo's nightly reset
   *     removes the account
   */
  @Transactional
  public Account createInspector(
      String email, String displayName, List<String> districtEntries, boolean madeInDemo) {
    DistrictScope scope = scopeOf(districtEntries);
    if (accounts.existsByEmail(Account.normaliseEmail(email))) {
      throw new ApiProblem(HttpStatus.CONFLICT, EMAIL_TAKEN);
    }
    Account inspector = Account.inspector(email, displayName, scope, clock.instant());
    if (madeInDemo) {
      inspector.markMadeInDemo();
    }
    return accounts.save(inspector);
  }

  /**
   * An administrator's change to an account: enabling or disabling it, or changing an inspector's
   * districts. A null field is left as it is. A disabled account cannot sign in or renew a session;
   * an access token it already holds lasts out its fifteen minutes. A new scope reaches the
   * inspector's token the next time their session is renewed.
   */
  @Transactional
  public Account update(
      long accountId, Boolean enabled, List<String> districtEntries, long administratorId) {
    Account account = accounts.findWithFacilityById(accountId).orElseThrow(AccountService::noSuch);
    if (Boolean.FALSE.equals(enabled) && accountId == administratorId) {
      throw new ApiProblem(HttpStatus.CONFLICT, CANNOT_DISABLE_SELF);
    }
    if (districtEntries != null) {
      if (account.getRole() != Role.PHI) {
        throw new InvalidFieldException("districts", ONLY_INSPECTORS_HAVE_DISTRICTS);
      }
      account.setScope(scopeOf(districtEntries));
    }
    if (enabled != null) {
      account.setEnabled(enabled);
    }
    return account;
  }

  /** An account that may be sent a new activation link: it must exist and be enabled. */
  public Account requireLinkable(long accountId) {
    Account account = accounts.findWithFacilityById(accountId).orElseThrow(AccountService::noSuch);
    if (!account.isEnabled()) {
      throw new ApiProblem(HttpStatus.CONFLICT, ENABLE_BEFORE_LINK);
    }
    return account;
  }

  private static ApiProblem noSuch() {
    return new ApiProblem(HttpStatus.NOT_FOUND, NO_SUCH_ACCOUNT);
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
