package io.github.rimaz17.sentinel.reports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class AgeBandTest {

  @ParameterizedTest
  @CsvSource({"0, 0-9", "9, 0-9", "10, 10-19", "37, 30-39", "89, 80-89", "90, 90+", "104, 90+"})
  void placesAnAgeInItsTenYearBand(int years, String label) {
    assertThat(AgeBand.ofAge(years).label()).isEqualTo(label);
  }

  @Test
  void refusesANegativeAge() {
    assertThatThrownBy(() -> AgeBand.ofAge(-1)).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void readsEveryBandBackFromItsLabel() {
    for (AgeBand band : AgeBand.values()) {
      assertThat(AgeBand.ofLabel(band.label())).isEqualTo(band);
    }
  }
}
