package io.github.rimaz17.sentinel.web;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.rimaz17.sentinel.ingestion.ReportsUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

class ApiExceptionHandlerTest {

  private final ApiExceptionHandler handler = new ApiExceptionHandler();

  @Test
  void answersAReportKafkaCouldNotTakeWith503() {
    ResponseEntity<Object> response = handler.reportsUnavailable(new ReportsUnavailableException());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    assertThat(((ProblemDetail) response.getBody()).getDetail())
        .isEqualTo("Reports cannot be accepted right now. Try again shortly.");
  }

  @Test
  void answersAStoreThatCannotBeReachedWith503() {
    ResponseEntity<Object> response =
        handler.storeUnavailable(new RedisConnectionFailureException("Unable to connect to Redis"));

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    assertThat(((ProblemDetail) response.getBody()).getDetail())
        .isEqualTo(ApiExceptionHandler.FIGURES_UNAVAILABLE)
        .doesNotContain("Redis");
  }

  @Test
  void answersAStoreThatDidNotAnswerInTimeWith503() {
    ResponseEntity<Object> response =
        handler.storeUnavailable(new QueryTimeoutException("Redis command timed out"));

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
  }
}
