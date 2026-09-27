package io.github.rimaz17.sentinel.alerts;

/**
 * Where an alert stands in its investigation. The detector only ever creates alerts as NEW; the
 * other states belong to inspectors, who move alerts through them from Phase 4.
 */
public enum AlertStatus {
  NEW,
  ACKNOWLEDGED,
  INVESTIGATING,
  CLOSED
}
