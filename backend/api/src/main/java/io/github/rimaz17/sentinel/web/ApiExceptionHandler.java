package io.github.rimaz17.sentinel.web;

import io.github.rimaz17.sentinel.ingestion.InvalidReportException;
import io.github.rimaz17.sentinel.ingestion.ReportsUnavailableException;
import io.github.rimaz17.sentinel.ingestion.UnknownFacilityException;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import tools.jackson.core.JacksonException;

/**
 * Turns failures into RFC 9457 problem responses that name the field at fault and never repeat what
 * was submitted in it. A report can carry identity fields, and an error that quoted one back would
 * carry it into the client's logs, and into ours if a response were ever logged.
 */
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

  record FieldProblem(String field, String message) {}

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    List<FieldProblem> problems =
        ex.getBindingResult().getFieldErrors().stream()
            .map(error -> new FieldProblem(error.getField(), error.getDefaultMessage()))
            .toList();
    return problem(HttpStatus.BAD_REQUEST, "The request has invalid fields.", problems);
  }

  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    // The JSON reader's own message can quote the offending value, so only its path is kept.
    List<FieldProblem> problems =
        ex.getMostSpecificCause() instanceof JacksonException jackson
                && !jackson.getPath().isEmpty()
            ? List.of(new FieldProblem(path(jackson), "has a value of the wrong type or format"))
            : List.of();
    return problem(
        HttpStatus.BAD_REQUEST, "The request body is not JSON of the expected shape.", problems);
  }

  @ExceptionHandler(InvalidReportException.class)
  ResponseEntity<Object> invalidReport(InvalidReportException ex) {
    return problem(
        HttpStatus.BAD_REQUEST,
        "The request has invalid fields.",
        List.of(new FieldProblem(ex.getField(), ex.getMessage())));
  }

  @ExceptionHandler(UnknownFacilityException.class)
  ResponseEntity<Object> unknownFacility(UnknownFacilityException ex) {
    return problem(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
  }

  @ExceptionHandler(ReportsUnavailableException.class)
  ResponseEntity<Object> reportsUnavailable(ReportsUnavailableException ex) {
    return problem(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(), List.of());
  }

  @ExceptionHandler(InvalidFieldException.class)
  ResponseEntity<Object> invalidField(InvalidFieldException ex) {
    return problem(
        HttpStatus.BAD_REQUEST,
        "The request has invalid fields.",
        List.of(new FieldProblem(ex.getField(), ex.getMessage())));
  }

  @ExceptionHandler(ApiProblem.class)
  ResponseEntity<Object> apiProblem(ApiProblem ex) {
    return problem(ex.getStatus(), ex.getMessage(), List.of());
  }

  private static String path(JacksonException ex) {
    return ex.getPath().stream()
        .map(
            reference ->
                reference.getPropertyName() != null
                    ? reference.getPropertyName()
                    : "[" + reference.getIndex() + "]")
        .collect(Collectors.joining("."));
  }

  private static ResponseEntity<Object> problem(
      HttpStatus status, String detail, List<FieldProblem> problems) {
    ProblemDetail body = ProblemDetail.forStatusAndDetail(status, detail);
    if (!problems.isEmpty()) {
      body.setProperty("errors", problems);
    }
    return ResponseEntity.status(status).body(body);
  }
}
