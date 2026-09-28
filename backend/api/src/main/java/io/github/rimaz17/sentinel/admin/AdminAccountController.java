package io.github.rimaz17.sentinel.admin;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.AccountService;
import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.auth.ActivationLinks;
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

  AdminAccountController(AccountService accounts, ActivationLinks activationLinks) {
    this.accounts = accounts;
    this.activationLinks = activationLinks;
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
      AdminAccountResponse account, String activationToken, Instant activationExpiresAt) {}

  @GetMapping("/accounts")
  List<AdminAccountResponse> list(@RequestParam(required = false) Role role) {
    List<Account> found = accounts.list(role);
    Map<Long, Instant> links =
        activationLinks.expiryByAccount(found.stream().map(Account::getId).toList());
    return found.stream()
        .map(account -> AdminAccountResponse.from(account, links.get(account.getId())))
        .toList();
  }

  @PostMapping("/inspectors")
  ResponseEntity<IssuedAccount> createInspector(@Valid @RequestBody NewInspector request) {
    Account inspector =
        accounts.createInspector(request.email(), request.displayName(), request.districts());
    return issued(inspector, HttpStatus.CREATED);
  }

  private ResponseEntity<IssuedAccount> issued(Account account, HttpStatus status) {
    ActivationLinks.IssuedLink link = activationLinks.issue(account);
    return ResponseEntity.status(status)
        .cacheControl(CacheControl.noStore())
        .body(
            new IssuedAccount(
                AdminAccountResponse.from(account, link.expiresAt()),
                link.token(),
                link.expiresAt()));
  }
}
