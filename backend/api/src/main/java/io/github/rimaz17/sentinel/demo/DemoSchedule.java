package io.github.rimaz17.sentinel.demo;

import java.time.ZoneId;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

/**
 * When the demo is put in its starting state: as the API starts, so the demo accounts exist before
 * anyone can sign in, and every night at {@code sentinel.demo.reset-at}, Sri Lanka time.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnBooleanProperty("sentinel.demo.enabled")
@EnableScheduling
class DemoSchedule implements ApplicationRunner, SchedulingConfigurer {

  /** The demo's clock, as its visitors are told it: "every night at 3:00 Sri Lanka time". */
  static final ZoneId SRI_LANKA = ZoneId.of("Asia/Colombo");

  private final DemoState state;
  private final DemoProperties demo;

  DemoSchedule(DemoState state, DemoProperties demo) {
    this.state = state;
    this.demo = demo;
  }

  @Override
  public void run(ApplicationArguments args) {
    state.restore();
  }

  @Override
  public void configureTasks(ScheduledTaskRegistrar registrar) {
    String cron = "0 %d %d * * *".formatted(demo.resetAt().getMinute(), demo.resetAt().getHour());
    registrar.addCronTask(new CronTask(state::reset, new CronTrigger(cron, SRI_LANKA)));
  }
}
