package io.github.rimaz17.sentinel.districts;

/**
 * A district as the dashboard's district list shows it: how many reports it has had over the last
 * seven days, and how many of its alerts are open.
 */
record DistrictSummaryResponse(
    String code, String name, String province, long reportsLast7Days, long openAlerts) {

  static DistrictSummaryResponse from(DistrictActivity activity) {
    District district = activity.district();
    return new DistrictSummaryResponse(
        district.getCode(),
        district.getName(),
        district.getProvince(),
        activity.reportsLast7Days(),
        activity.openAlerts());
  }
}
