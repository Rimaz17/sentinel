package io.github.rimaz17.sentinel.reports;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Age as a ten-year band, the only form in which age is kept. Ninety and over is one band: very old
 * ages are rare enough to single people out.
 */
public enum AgeBand {
  AGE_0_9("0-9"),
  AGE_10_19("10-19"),
  AGE_20_29("20-29"),
  AGE_30_39("30-39"),
  AGE_40_49("40-49"),
  AGE_50_59("50-59"),
  AGE_60_69("60-69"),
  AGE_70_79("70-79"),
  AGE_80_89("80-89"),
  AGE_90_PLUS("90+");

  private final String label;

  AgeBand(String label) {
    this.label = label;
  }

  public static AgeBand ofAge(int years) {
    if (years < 0) {
      throw new IllegalArgumentException("age cannot be negative");
    }
    return years >= 90 ? AGE_90_PLUS : values()[years / 10];
  }

  public static AgeBand ofLabel(String label) {
    for (AgeBand band : values()) {
      if (band.label.equals(label)) {
        return band;
      }
    }
    throw new IllegalArgumentException("unknown age band: " + label);
  }

  @JsonValue
  public String label() {
    return label;
  }
}
