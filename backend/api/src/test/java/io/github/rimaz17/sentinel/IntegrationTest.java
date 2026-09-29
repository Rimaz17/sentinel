package io.github.rimaz17.sentinel;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

/**
 * The full application against a real PostgreSQL. Every test class carrying this shares one
 * application context, and so one database container.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(
    properties = {
      "sentinel.auth.jwt-secret=integration-tests-only-signing-key-0123456789",
      "sentinel.feed.key=" + TestAccounts.FEED_KEY,
      // Tests sign in far more often than a person does; RateLimitTest sets its own limits.
      "sentinel.rate-limit.auth-per-minute=100000",
      "sentinel.rate-limit.ingestion-per-minute=100000"
    })
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestAccounts.class, TestReports.class})
public @interface IntegrationTest {}
