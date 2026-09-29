package io.github.rimaz17.sentinel.ingestion;

/** Kafka could not take a report, so it was not accepted. */
public class ReportsUnavailableException extends RuntimeException {

  public ReportsUnavailableException() {
    super("Reports cannot be accepted right now. Try again shortly.");
  }
}
