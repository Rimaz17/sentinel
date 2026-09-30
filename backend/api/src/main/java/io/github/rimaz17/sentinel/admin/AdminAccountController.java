package io.github.rimaz17.sentinel.admin;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.auth.ActivationLinks;
import io.github.rimaz17.sentinel.auth.Caller;
import io.github.rimaz17.sentinel.demo.DemoGuard;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Staff accounts, for administrators. Inspectors are created here and nowhere else: there is no
 * sign-up for them. An inspector's account starts without a password, and the response carries a
 * one-time activation link's secret for the administrator to pass on.
 */
@RestController
@RequestMapping("/api/admin")
class AdminAccountController {

  private final AccountService accounts;
  private final ActivationLinks activationLinks;
  private final DemoGuard demo;

  AdminAccountController(AccountService accounts, ActivationLinks activationLinks, DemoGuard demo) {
    this.accounts = accounts;
    this.activationLinks = activationLinks;
    this.demo = demo;
  }

  /**
   * @param districts district codes such as {@code KDY}, or {@code ["*"]} for every district
   */
  record NewInspector(
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(max = 100) String displayName,
      @Size(max = 25) List<String> districts) {}

  /** A new account and the link its owner activates it with, shown this once. */
  record IssuedAccount(
      AdminAccountResponse account, String activationToken, Instant activationExpiresAt) {

    /** Logged by the web layer at trace level when it is returned, so the link is left out. */
    @Override
    public String toString() {
      return "IssuedAccount[account=" + account.id() + ", activation token redacted]";
    }
  }

  @GetMapping("/accounts")
  List<AdminAccountResponse> list(Caller.Staff admin, @RequestParam(required = false) Role role) {
    boolean restricted = demo.restricts(admin.accountId());
    List<Account> found = accounts.list(role);
    Map<Long, Instant> links =
        activationLinks.expiryByAccount(found.stream().map(Account::getId).toList());
    return found.stream()
        .map(
            account ->
                AdminAccountResponse.from(
                    account,
                    links.get(account.getId()),
                    DemoGuard.accountLocked(restricted, account)))
        .toList();
  }

  /** An inspector the demo administrator creates is a visitor's, and goes at the nightly reset. */
  @PostMapping("/inspectors")
  ResponseEntity<IssuedAccount> createInspector(
      Caller.Staff admin, @Valid @RequestBody NewInspector request) {
    Account inspector =
        accounts.createInspector(
            request.email(),
            request.displayName(),
            request.districts(),
            demo.madeInDemo(admin.accountId()));
    return issued(inspector, HttpStatus.CREATED);
  }

  /** A change to an account. Fields left out, or null, are not changed. */
  record AccountChange(Boolean enabled, @Size(max = 25) List<String> districts) {}

  @PatchMapping("/accounts/{id}")
  AdminAccountResponse update(
      Caller.Staff admin, @PathVariable long id, @Valid @RequestBody AccountChange change) {
    demo.requireAccountChangeable(admin.accountId(), id);
    Account account = accounts.update(id, change.enabled(), change.districts(), admin.accountId());
    return AdminAccountResponse.from(
        account, activationLinks.expiryByAccount(List.of(id)).get(id), false);
  }

  /**
   * A new activation link for an account, replacing any it had: how an inspector who never
   * activated gets another chance, and how anyone who has forgotten their password sets a new one.
   */
  @PostMapping("/accounts/{id}/activation")
  ResponseEntity<IssuedAccount> reissueLink(Caller.Staff admin, @PathVariable long id) {
    demo.requireAccountChangeable(admin.accountId(), id);
    return issued(accounts.requireLinkable(id), HttpStatus.OK);
  }

  private ResponseEntity<IssuedAccount> issued(Account account, HttpStatus status) {
    ActivationLinks.IssuedLink link = activationLinks.issue(account);
    return ResponseEntity.status(status)
        .cacheControl(CacheControl.noStore())
        .body(
            new IssuedAccount(
                AdminAccountResponse.from(account, link.expiresAt(), false),
                link.token(),
                link.expiresAt()));
  }
}
