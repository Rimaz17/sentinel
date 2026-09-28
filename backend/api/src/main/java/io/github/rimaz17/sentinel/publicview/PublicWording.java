package io.github.rimaz17.sentinel.publicview;

import io.github.rimaz17.sentinel.reports.SymptomGroup;
import java.util.Map;

/**
 * The public register: plain and calm. Internally an alert reads "A-1001, 41 reports, 3.2σ above
 * baseline"; publicly it reads "Kandy district: elevated dengue-like illness activity. Follow
 * standard precautions." No figure that describes the detector's workings is ever in it.
 */
final class PublicWording {

  private static final Map<SymptomGroup, String> ILLNESS =
      Map.of(
          SymptomGroup.DENGUE_LIKE, "dengue-like illness",
          SymptomGroup.INFLUENZA_LIKE, "influenza-like illness",
          SymptomGroup.GASTROINTESTINAL, "gastrointestinal illness",
          SymptomGroup.LEPTOSPIROSIS_LIKE, "leptospirosis-like illness");

  private PublicWording() {}

  static String illness(SymptomGroup group) {
    return ILLNESS.get(group);
  }

  static String headline(String districtName, SymptomGroup group, boolean active) {
    return active
        ? "%s district: elevated %s activity. Follow standard precautions."
            .formatted(districtName, illness(group))
        : "%s district: %s activity is no longer elevated.".formatted(districtName, illness(group));
  }
}
