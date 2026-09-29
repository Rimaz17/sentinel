package io.github.rimaz17.sentinel.facilities;

import io.github.rimaz17.sentinel.auth.Caller;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/facilities")
class FacilityController {

  private final FacilityService facilities;

  FacilityController(FacilityService facilities) {
    this.facilities = facilities;
  }

  /**
   * The registry, for an inspector's map within their districts and for the report feed, which
   * reads all of it.
   */
  @GetMapping
  List<FacilityResponse> list(
      Caller caller,
      @RequestParam(required = false) @Pattern(regexp = "[A-Z]{3}") String district) {
    return facilities.inDistricts(caller.districtsFor(district)).stream()
        .map(FacilityResponse::from)
        .toList();
  }
}
