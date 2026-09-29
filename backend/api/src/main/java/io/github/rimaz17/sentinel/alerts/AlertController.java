package io.github.rimaz17.sentinel.alerts;

import io.github.rimaz17.sentinel.auth.Caller;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    return found.stream().map(this::respond).toList();
  }

  record StatusChange(@NotNull AlertStatus status) {}

  record VerdictChange(@NotNull Verdict verdict) {}

  /** Moves an alert on: acknowledged, then investigating, then closed. Never back. */
  @PostMapping("/{code}/status")
  AlertResponse move(
      Caller.Staff caller, @PathVariable String code, @Valid @RequestBody StatusChange change) {
    inScope(caller, code);
    return respond(alerts.moveTo(code, change.status()));
  }

  /** Confirms an alert, which publishes it, or marks it a false alarm, which closes it. */
  @PostMapping("/{code}/verdict")
  AlertResponse judge(
      Caller.Staff caller, @PathVariable String code, @Valid @RequestBody VerdictChange change) {
    inScope(caller, code);
    return respond(alerts.judge(code, change.verdict(), caller.accountId()));
  }

  /** Refuses an alert in a district outside the inspector's scope, as 403. */
  private void inScope(Caller caller, String code) {
    caller.requireDistrict(alerts.find(code).getDistrict().getCode());
  }

  private AlertResponse respond(Alert alert) {
    return AlertResponse.from(alert, alerts.now(), alerts.publicThreshold());
  }
}
