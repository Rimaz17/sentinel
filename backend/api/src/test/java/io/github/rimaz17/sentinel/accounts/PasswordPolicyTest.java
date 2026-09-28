package io.github.rimaz17.sentinel.accounts;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

  @Test
  void acceptsTwelveCharactersOrMore() {
    assertThat(PasswordPolicy.problem("twelve chars")).isEmpty();
  }

  @Test
  void refusesFewerThanTwelve() {
    assertThat(PasswordPolicy.problem("eleven char")).contains("must be at least 12 characters");
    assertThat(PasswordPolicy.problem(null)).isPresent();
  }

  @Test
  void countsCharactersNotBytesForTheMinimum() {
    assertThat(PasswordPolicy.problem("ශ්‍රී ලංකාව ශ්‍රී")).isEmpty();
  }

  @Test
  void refusesMoreThanBcryptReads() {
    assertThat(PasswordPolicy.problem("a".repeat(72))).isEmpty();
    assertThat(PasswordPolicy.problem("a".repeat(73))).contains("must be at most 72 bytes");
    assertThat(PasswordPolicy.problem("ශ".repeat(25))).contains("must be at most 72 bytes");
  }

  @Test
  void neverRepeatsThePassword() {
    assertThat(PasswordPolicy.problem("short pw")).get().asString().doesNotContain("short pw");
  }
}
