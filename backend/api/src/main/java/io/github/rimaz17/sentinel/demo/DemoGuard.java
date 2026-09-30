package io.github.rimaz17.sentinel.demo;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.facilities.InviteCodes;
import io.github.rimaz17.sentinel.web.ApiProblem;
import java.util.Arrays;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * What the demo administrator may not do. Its password is published, so anyone can sign in as it,
 * and nothing it does may leave the demo broken for the next visitor. It sees every page and uses
 * every form, but it may change only what visitors made: the accounts they created and the invite
 * codes it issued itself. The demo accounts, the owner's own accounts and the published invite code
 * stay as they are.
 *
 * <p>With demo mode off, or for any other administrator, nothing here refuses anything.
 */
@Component
public class DemoGuard {

  public static final String ACCOUNT_LOCKED =
      "Switched off in the demo. The demo administrator can change only the accounts visitors made,"
          + " so the demo accounts stay as they are for the next visitor.";
  public static final String CODE_LOCKED =
      "Switched off in the demo. The demo administrator can change only the invite codes it issued"
          + " itself, and never the demo's published code.";

  private final DemoProperties demo;
  private final AccountService accounts;
  private final InviteCodes inviteCodes;

  DemoGuard(DemoProperties demo, AccountService accounts, InviteCodes inviteCodes) {
    this.demo = demo;
    this.accounts = accounts;
    this.inviteCodes = inviteCodes;
  }

  /** Whether demo mode limits this account: true only for the demo administrator, in demo mode. */
  public boolean restricts(long accountId) {
    return demo.enabled()
        && accounts
            .findById(accountId)
            .map(account -> DemoAccount.ADMINISTRATOR.email().equals(account.getEmail()))
            .orElse(false);
  }

  /** Whether an account is one of the four published demo accounts, in demo mode. */
  public boolean isDemoAccount(Account account) {
    return demo.enabled()
        && Arrays.stream(DemoAccount.values())
            .anyMatch(demoAccount -> demoAccount.email().equals(account.getEmail()));
  }

  /** Whether a restricted administrator must leave this account alone. */
  public static boolean accountLocked(boolean restricted, Account account) {
    return restricted && !account.isMadeInDemo();
  }

  /**
   * Whether a restricted administrator must leave this facility's invite code alone: the demo's
   * published code, or a code someone else issued.
   *
   * @param issuerId who issued the facility's current code; null if it has none
   */
  public static boolean codeLocked(
      boolean restricted, long administratorId, String facilityCode, Long issuerId) {
    return restricted
        && (DemoAccount.FACILITY_CODE.equals(facilityCode)
            || (issuerId != null && issuerId != administratorId));
  }

  /** Refuses with 403 when the demo administrator tries to change an account it must not. */
  public void requireAccountChangeable(long administratorId, long accountId) {
    if (restricts(administratorId)
        && accounts
            .findById(accountId)
            .map(account -> accountLocked(true, account))
            .orElse(false)) {
      throw new ApiProblem(HttpStatus.FORBIDDEN, ACCOUNT_LOCKED);
    }
  }

  /** Refuses with 403 when the demo administrator tries to change a code it must not. */
  public void requireCodeChangeable(long administratorId, String facilityCode) {
    if (restricts(administratorId)
        && codeLocked(
            true, administratorId, facilityCode, inviteCodes.issuerOf(facilityCode).orElse(null))) {
      throw new ApiProblem(HttpStatus.FORBIDDEN, CODE_LOCKED);
    }
  }

  /**
   * Whether an account being made now is a visitor's: an inspector the demo administrator creates,
   * or a data provider registered with an invite code the demo administrator issued.
   *
   * @param madeBy the administrator creating the account, or the one who issued its invite code
   */
  public boolean madeInDemo(long madeBy) {
    return restricts(madeBy);
  }
}
