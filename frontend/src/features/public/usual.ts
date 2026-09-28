import { formatCount, formatDecimal } from '@/features/dashboard/format'
import type { PublicDistrict } from './api'

/*
 * A district's week against its own usual week. Deliberately neutral: a
 * percentage, never "higher" or "unusual". Whether a rise is worth telling the
 * public about is decided by published alerts alone, so these words never
 * pre-empt an inspector.
 */

/** "104%", or null when the district has no usual week to compare with. */
export function percentOfUsual(district: PublicDistrict): string | null {
  return district.percentOfUsual === null ? null : `${formatCount(district.percentOfUsual)}%`
}

/** The same comparison in a sentence, with the counts behind it. */
export function weekAgainstUsual(district: PublicDistrict): string {
  const reports = `${formatCount(district.reportsLast7Days)} ${district.reportsLast7Days === 1 ? 'report' : 'reports'} in the last 7 days`
  const percent = percentOfUsual(district)
  return percent === null
    ? `${reports}, with no usual week yet to compare them with.`
    : `${reports}, ${percent} of its usual week of ${formatDecimal(district.usualWeek)}.`
}
