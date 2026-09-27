package io.github.rimaz17.sentinel.reports;

/**
 * The symptom patterns Sentinel counts. Each is a syndrome, not a diagnosis: a dengue-like report
 * is a patient whose symptoms fit dengue, not a confirmed case.
 */
public enum SymptomGroup {
  DENGUE_LIKE,
  INFLUENZA_LIKE,
  GASTROINTESTINAL,
  LEPTOSPIROSIS_LIKE
}
