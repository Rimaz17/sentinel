package io.github.rimaz17.sentinel.web;

import org.springframework.http.HttpStatus;

/**
 * A request refused for a reason the caller should read. The message is shown to them as the
 * problem's detail, so it is written for people and never repeats anything they submitted.
 */
public class ApiProblem extends RuntimeException {

  private final HttpStatus status;

  public ApiProblem(HttpStatus status, String detail) {
    super(detail);
    this.status = status;
  }

  public HttpStatus getStatus() {
    return status;
  }
}
