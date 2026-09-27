import { cx, labelSm, tnum } from '@/styles/recipes'
import { SYMPTOM_GROUPS, type Facility, type LocatedReport } from '../api/types'
import { formatCount } from '../format'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'
import { countByGroup, MAP_LIMIT } from './counts'

type MapKeyProps = {
  reports: LocatedReport[]
  /** All of the area's reports over the same seven days, located or not. */
  reportsInArea: number
  facilities: Facility[]
  areaName: string
}

/**
 * The map in words, and its key. A screen reader user, or anyone who cannot
 * tell the group colours apart, gets the same counts the dots show, and the
 * key says what is not drawn and why.
 */
export function MapKey({ reports, reportsInArea, facilities, areaName }: MapKeyProps) {
  const byGroup = countByGroup(reports)
  const unlocated = Math.max(0, reportsInArea - reports.length)
  const located = facilities.filter((facility) => facility.latitude !== null)

  return (
    <div className="grid gap-xs">
      <p className="text-small text-ink-70">
        <span className="font-medium text-ink">
          {formatCount(reports.length)} {reports.length === 1 ? 'report' : 'reports'}
        </span>{' '}
        with a location from the last 7 days, {areaName}.
        {unlocated > 0 ? ` ${formatCount(unlocated)} more have no location and are not drawn.` : ''}
        {reports.length >= MAP_LIMIT ? ` Only the newest ${formatCount(MAP_LIMIT)} are drawn.` : ''}
      </p>

      <ul aria-label="Map key" className="flex flex-wrap gap-x-md gap-y-3xs">
        {SYMPTOM_GROUPS.map((group) => (
          <li key={group} className="inline-flex items-center gap-[0.4rem] text-small">
            <span
              aria-hidden="true"
              className={cx(
                'inline-block size-[0.6rem] rounded-full',
                SYMPTOM_GROUP_STYLES[group].swatch,
              )}
            />
            {SYMPTOM_GROUP_STYLES[group].label}
            <span className={cx(labelSm, 'text-ink-70', tnum)}>{formatCount(byGroup[group])}</span>
          </li>
        ))}
        {facilities.length > 0 ? (
          <li className="inline-flex items-center gap-[0.4rem] text-small">
            <span
              aria-hidden="true"
              className="inline-block size-[0.75rem] rounded-full border-[1.5px] border-ink"
            />
            Facility
            <span className={cx(labelSm, 'text-ink-70', tnum)}>
              {formatCount(located.length)} of {formatCount(facilities.length)} located
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
