package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.accounts.Account;
import io.github.rimaz17.sentinel.accounts.Role;
import io.github.rimaz17.sentinel.web.ApiProblem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Following an activation link: an inspector created by an administrator sets their first password,
 * or anyone given a new link sets a new one. This is not sign-up; without a link issued by an
 * administrator there is nothing here to use.
 */
@RestController
@RequestMapping("/api/auth")
class ActivationController {

  private final ActivationLinks links;
  private final Sessions sessions;

  ActivationController(ActivationLinks links, Sessions sessions) {
    this.links = links;
    this.sessions = sessions;
  }

  record LinkCheck(@NotBlank @Size(max = 64) String token) {

    @Override
    public String toString() {
      return "LinkCheck[token redacted]";
    }
  }

  /**
   * Whose link this is, so the page can greet them by name.
   *
   * @param activated whether the account already has a password, so this link replaces it
   */
  record LinkOwner(String email, String displayName, Role role, boolean activated) {}

  record Activation(
      @NotBlank @Size(max = 64) String token, @NotBlank @Size(max = 200) String password) {

    @Override
    public String toString() {
      return "Activation[token and password redacted]";
    }
  }

  @PostMapping("/activation/check")
  LinkOwner check(@Valid @RequestBody LinkCheck request) {
    Account account =
        links
            .accountFor(request.token())
            .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, ActivationLinks.UNUSABLE));
    return new LinkOwner(
        account.getEmail(), account.getDisplayName(), account.getRole(), account.isActivated());
  }

  /** Sets the password, spends the link, and signs its owner in. */
  @PostMapping("/activate")
  ResponseEntity<SessionResponse> activate(@Valid @RequestBody Activation request) {
    return sessions.start(links.activate(request.token(), request.password()), HttpStatus.OK);
  }
}
