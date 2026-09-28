package io.github.rimaz17.sentinel.accounts;

import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AccountService {

  private final AccountRepository accounts;

  AccountService(AccountRepository accounts) {
    this.accounts = accounts;
  }

  /** The account for an email address, however it was capitalised or spaced. */
  public Optional<Account> findByEmail(String email) {
    return accounts.findByEmail(Account.normaliseEmail(email));
  }

  /** An account with its facility loaded, so a token can name the facility. */
  public Optional<Account> findById(long id) {
    return accounts.findWithFacilityById(id);
  }
}
