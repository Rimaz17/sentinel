package io.github.rimaz17.sentinel.ingestion;

/**
 * A report that is well formed but cannot be accepted. The message describes the rule, never the
 * submitted value.
 */
public class InvalidReportException extends RuntimeException {

  private final String field;

  InvalidReportException(String field, String message) {
    super(message);
    this.field = field;
  }

  public String getField() {
    return field;
  }
}
