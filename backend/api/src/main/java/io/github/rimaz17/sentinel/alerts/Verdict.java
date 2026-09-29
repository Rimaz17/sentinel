package io.github.rimaz17.sentinel.alerts;

/** An inspector's judgement of an alert, once they have investigated it. Final once given. */
public enum Verdict {
  /** A real rise. The alert is published to the public dashboard. */
  CONFIRMED,
  /** Not a real rise. The alert is closed and never published. */
  FALSE_ALARM
}
