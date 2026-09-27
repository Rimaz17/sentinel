package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AnonymisedReportTest {

  /**
   * The anonymised report is the only shape a report takes after ingestion. Adding a field to it is
   * a privacy decision, so this list has to be changed deliberately.
   */
  @Test
  void carriesOnlyTheFieldsThePrivacyModelKeeps() {
    assertThat(
            Arrays.stream(AnonymisedReport.class.getRecordComponents())
                .map(RecordComponent::getName))
        .containsExactly(
            "id",
            "facilityId",
            "districtCode",
            "symptomGroup",
            "ageBand",
            "latitude",
            "longitude",
            "reportedAt",
            "receivedAt");
  }
}
