package io.github.rimaz17.sentinel.districts;

import io.github.rimaz17.sentinel.auth.Caller;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The districts with their current activity. Internal data: report counts per district are coarse,
 * but open alerts are not public until an inspector confirms them.
 */
@RestController
@RequestMapping("/api/districts")
class DistrictController {

  private final DistrictService districts;

  DistrictController(DistrictService districts) {
    this.districts = districts;
  }

  /** The districts the caller covers, with their activity: all 25 for a national inspector. */
  @GetMapping
  List<DistrictSummaryResponse> list(Caller caller) {
    return districts.activity().stream()
        .filter(activity -> caller.scope().includes(activity.district().getCode()))
        .map(DistrictSummaryResponse::from)
        .toList();
  }
}
