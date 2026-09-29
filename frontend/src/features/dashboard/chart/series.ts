import type { SymptomGroup, WeeklyCounts } from '../api/types'

export type Series = {
  /** Oldest first; the last is the current seven days. */
  counts: number[]
  current: number
  /** The mean of every week before the current one: the detector's baseline weeks. */
  average: number
}

/**
 * One symptom group's weeks. The average is plain arithmetic over the eight
 * baseline weeks, the mean a detection check compares against; it is not the
 * detector's threshold, which also depends on how much those weeks vary.
 */
export function seriesFor(weekly: WeeklyCounts, group: SymptomGroup): Series {
  const counts = weekly.weeks.map((week) => week.counts[group])
  const baseline = counts.slice(0, -1)
  const average =
    baseline.length === 0 ? 0 : baseline.reduce((sum, count) => sum + count, 0) / baseline.length
  return { counts, current: counts.at(-1) ?? 0, average }
}

/**
 * Every symptom group together, week by week: the area's whole report load,
 * with the same current week and baseline average as a single group's series.
 */
export function totalSeries(weekly: WeeklyCounts): Series {
  const counts = weekly.weeks.map((week) =>
    Object.values(week.counts).reduce((sum, count) => sum + count, 0),
  )
  const baseline = counts.slice(0, -1)
  const average =
    baseline.length === 0 ? 0 : baseline.reduce((sum, count) => sum + count, 0) / baseline.length
  return { counts, current: counts.at(-1) ?? 0, average }
}

/** A top for the y axis with a little headroom, never zero. */
export function scaleMax(series: Series): number {
  return Math.max(1, ...series.counts, series.average) * 1.15
}
