package io.github.rimaz17.sentinel.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record SignInRequest(
    @NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {

  /** Frameworks log arguments by their toString, so the password is never part of it. */
  @Override
  public String toString() {
    return "SignInRequest[password redacted]";
  }
}
