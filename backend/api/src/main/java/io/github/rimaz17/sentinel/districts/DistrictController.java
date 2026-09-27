package io.github.rimaz17.sentinel.districts;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The 25 districts with their current activity. Internal data: report counts per district are
 * coarse, but open alerts are not published until an inspector confirms them (Phase 4).
 */
@RestController
@RequestMapping("/api/districts")
class DistrictController {

  private final DistrictService districts;

  DistrictController(DistrictService districts) {
    this.districts = districts;
  }

  @GetMapping
  List<DistrictSummaryResponse> list() {
    return districts.activity().stream().map(DistrictSummaryResponse::from).toList();
  }
}
