package io.github.rimaz17.sentinel.reports;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * The Kafka topics reports travel on, created as the API starts. See
 * docs/adr/0014-kafka-between-ingestion-and-storage.md.
 */
@Configuration(proxyBeanMethods = false)
public class ReportTopics {

  /**
   * Every accepted report, keyed by its district code, so each district's reports keep their order
   * on one partition.
   */
  public static final String REPORTS = "sentinel.reports";

  /** Messages the stream processor can never store, kept for a person to look at. */
  public static final String DEAD_LETTERS = "sentinel.reports.dead-letters";

  /** The consumer group that stores reports. */
  public static final String STORE_GROUP = "sentinel-report-store";

  /**
   * Room for up to six consumers to share the 25 districts. More partitions than consumers costs
   * little; fewer would cap how far storage can be spread.
   */
  public static final int PARTITIONS = 6;

  /** One copy of each message: the local stack has a single broker. */
  static final int REPLICAS = 1;

  @Bean
  NewTopic reportsTopic() {
    return TopicBuilder.name(REPORTS).partitions(PARTITIONS).replicas(REPLICAS).build();
  }

  @Bean
  NewTopic deadLettersTopic() {
    return TopicBuilder.name(DEAD_LETTERS).partitions(1).replicas(REPLICAS).build();
  }
}
