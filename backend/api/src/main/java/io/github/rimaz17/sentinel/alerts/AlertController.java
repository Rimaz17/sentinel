package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.auth.Caller;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Alerts raised by the detector. Internal data: inspectors only, within their districts. */
@RestController
@RequestMapping("/api/alerts")
class AlertController {

  private final AlertService alerts;

  AlertController(AlertService alerts) {
    this.alerts = alerts;
  }

  /** One district, which must be in the caller's scope, or every district the caller covers. */
  @GetMapping
  List<AlertResponse> recent(
      Caller caller,
      @RequestParam(defaultValue = "50") @Min(1) @Max(200) int limit,
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    List<Alert> found = alerts.recent(caller.districtsFor(district), limit);
    Instant now = alerts.now();
    return found.stream().map(alert -> AlertResponse.from(alert, now)).toList();
  }
}
