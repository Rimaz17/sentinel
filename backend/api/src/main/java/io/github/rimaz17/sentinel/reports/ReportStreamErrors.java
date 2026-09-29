package io.github.rimaz17.sentinel.reports;

import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

/**
 * What the stream processor does with a report it fails to store.
 *
 * <p>A message that can never be stored, because it is not a complete report or the database
 * refuses its values, goes to the dead-letter topic at once, and the reports after it carry on.
 * Anything else, such as the database or Redis being down, is retried until it succeeds, waiting
 * longer each time up to half a minute. Reports wait in Kafka meanwhile, in order, and none is lost
 * to an outage; that is what the topic is for.
 */
@Configuration(proxyBeanMethods = false)
class ReportStreamErrors {

  static final long FIRST_RETRY_MILLIS = 500;
  static final long LONGEST_WAIT_MILLIS = 30_000;

  @Bean
  DefaultErrorHandler reportStreamErrorHandler(KafkaOperations<String, byte[]> kafka) {
    DeadLetterPublishingRecoverer deadLetters =
        new DeadLetterPublishingRecoverer(
            kafka,
            // A negative partition lets Kafka choose, so the dead-letter topic needs only one.
            (message, failure) -> new TopicPartition(ReportTopics.DEAD_LETTERS, -1));
    ExponentialBackOff backOff = new ExponentialBackOff(FIRST_RETRY_MILLIS, 2.0);
    backOff.setMaxInterval(LONGEST_WAIT_MILLIS);
    DefaultErrorHandler handler = new DefaultErrorHandler(deadLetters, backOff);
    handler.addNotRetryableExceptions(
        MalformedReportMessageException.class, DataIntegrityViolationException.class);
    return handler;
  }
}
