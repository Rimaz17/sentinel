package io.github.rimaz17.sentinel.districts;

import io.github.rimaz17.sentinel.auth.Caller;
import io.github.rimaz17.sentinel.web.ApiProblem;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The districts with their current activity. Internal data: report counts per district are coarse,
 * but open alerts are not public until an inspector confirms them.
 */
@RestController
@RequestMapping("/api/districts")
class DistrictController {

  static final String NO_SUCH_DISTRICT = "No district has this code.";

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

  /**
   * One district. Scope is checked before anything else, so an inspector learns nothing about a
   * district outside it, not even whether the code exists: whatever they ask for, it is 403.
   */
  @GetMapping("/{code}")
  DistrictSummaryResponse one(Caller caller, @PathVariable String code) {
    String districtCode = code.toUpperCase(Locale.ROOT);
    caller.requireDistrict(districtCode);
    return districts.activity().stream()
        .filter(activity -> activity.district().getCode().equals(districtCode))
        .findFirst()
        .map(DistrictSummaryResponse::from)
        .orElseThrow(() -> new ApiProblem(HttpStatus.NOT_FOUND, NO_SUCH_DISTRICT));
  }
}
