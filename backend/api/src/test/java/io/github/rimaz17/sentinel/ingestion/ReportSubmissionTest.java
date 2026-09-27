package io.github.rimaz17.sentinel.ingestion;

import static io.github.rimaz17.sentinel.ingestion.AnonymiserTest.submission;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ReportSubmissionTest {

  /** Frameworks log arguments by their toString, so it must hold nothing identifying. */
  @Test
  void describesItselfWithoutIdentityExactAgeOrExactLocation() {
    String text = submission().build().toString();

    assertThat(text)
        .contains("DENGUE_LIKE")
        .doesNotContain(
            "Nimali",
            "198912345678",
            "1989-04-17",
            "0771234567",
            "Temple Road",
            "37",
            "7.29",
            "80.63");
  }
}
