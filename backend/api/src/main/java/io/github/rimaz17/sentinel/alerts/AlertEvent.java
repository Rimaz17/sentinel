package io.github.rimaz17.sentinel.alerts;

/**
 * What the alert socket tells a dashboard: that an alert was raised or changed, with the alert as
 * the internal API shows it; or, with no alert, that changes may have been missed and the dashboard
 * should read its alerts afresh.
 */
record AlertEvent(Change change, AlertResponse alert) {

  enum Change {
    /** A new alert. */
    RAISED,
    /** An alert extended by the detector, or moved on or judged by an inspector. */
    UPDATED,
    /** The API may have missed changes, so the dashboard should read its alerts again. */
    RESYNC
  }

  static AlertEvent resync() {
    return new AlertEvent(Change.RESYNC, null);
  }
}
