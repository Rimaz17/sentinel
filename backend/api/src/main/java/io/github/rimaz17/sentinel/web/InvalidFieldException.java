package io.github.rimaz17.sentinel.web;

/**
 * A field that is well formed but cannot be accepted, answered as a 400 naming the field. The
 * message describes the rule, never the submitted value: the field may be a password.
 */
public class InvalidFieldException extends RuntimeException {

  private final String field;

  public InvalidFieldException(String field, String message) {
    super(message);
    this.field = field;
  }

  public String getField() {
    return field;
  }
}
