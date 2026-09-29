package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.web.ApiProblem;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** Checks an email address and password against the accounts. */
@Service
class SignInService {

  static final String FAILED = "The email address or password is not right.";
  static final String DISABLED = "This account has been disabled. Contact an administrator.";

  private final AccountService accounts;
  private final PasswordEncoder passwords;

  /**
   * Compared against when no account matches, so an unknown address takes as long to refuse as a
   * wrong password and the timing does not reveal which addresses hold accounts.
   */
  private final String decoyHash;

  SignInService(AccountService accounts, PasswordEncoder passwords) {
    this.accounts = accounts;
    this.passwords = passwords;
    this.decoyHash = passwords.encode("no account has this password");
  }

  /**
   * The account these credentials belong to. An unknown address, a wrong password and an inspector
   * who has not yet set a password are refused alike; a disabled account is named as such only to
   * someone who knows its password.
   */
  Account authenticate(String email, String password) {
    Optional<Account> found = accounts.findByEmail(email);
    String hash =
        found.filter(Account::isActivated).map(Account::getPasswordHash).orElse(decoyHash);
    boolean matches = passwords.matches(password, hash);
    Account account =
        found
            .filter(Account::isActivated)
            .filter(candidate -> matches)
            .orElseThrow(() -> new ApiProblem(HttpStatus.UNAUTHORIZED, FAILED));
    if (!account.isEnabled()) {
      throw new ApiProblem(HttpStatus.FORBIDDEN, DISABLED);
    }
    return account;
  }
}
