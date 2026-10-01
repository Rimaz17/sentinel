import { cx, labelSm, tnum } from '@/styles/recipes'
import { SYMPTOM_GROUPS, type Facility, type LocatedReport, type SymptomGroup } from '../api/types'
import { formatCount } from '../format'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'
import { countByGroup, MAP_LIMIT } from './counts'
import { expectedWords, type MapRing, ringLabel } from './rings'

type MapKeyProps = {
  reports: LocatedReport[]
  /** All of the area's reports over the same seven days, located or not. */
  reportsInArea: number
  facilities: Facility[]
  /** The cluster rings drawn, each described here in words. */
  rings: MapRing[]
  areaName: string
  /** Groups the reader has taken off the map. */
  hidden: ReadonlySet<SymptomGroup>
  onToggle: (group: SymptomGroup) => void
}

/**
 * The map in words, and its key. A screen reader user, or anyone who cannot
 * tell the group colours apart, gets the same counts the dots show, and the
 * key says what is not drawn and why. Each cluster ring is listed in words:
 * its alert, group, what it held, the nearest facility, and what it would
 * usually have held.
 *
 * Each group can be taken off the map. Two pairs of the fixed group hues sit
 * close together (gastrointestinal and leptospirosis-like for everyone,
 * dengue-like and influenza-like with red-green colour blindness), so the key
 * gives a second way to tell them apart: show one group at a time.
 */
export function MapKey({
  reports,
  reportsInArea,
  facilities,
  rings,
  areaName,
  hidden,
  onToggle,
}: MapKeyProps) {
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

      <fieldset className="m-0 flex flex-wrap gap-x-md gap-y-3xs border-0 p-0">
        <legend className="sr-only">Show on the map</legend>
        {SYMPTOM_GROUPS.map((group) => (
          <label
            key={group}
            className="inline-flex cursor-pointer items-center gap-[0.4rem] text-small"
          >
            <input
              type="checkbox"
              checked={!hidden.has(group)}
              onChange={() => onToggle(group)}
              className="m-0 size-[0.85rem] cursor-pointer"
            />
            <span
              aria-hidden="true"
              className={cx(
                'inline-block size-[0.6rem] rounded-full',
                SYMPTOM_GROUP_STYLES[group].swatch,
              )}
            />
            {SYMPTOM_GROUP_STYLES[group].label}
            <span className={cx(labelSm, 'text-ink-70', tnum)}>{formatCount(byGroup[group])}</span>
          </label>
        ))}
        {facilities.length > 0 ? (
          <p className="inline-flex items-center gap-[0.4rem] text-small">
            <span
              aria-hidden="true"
              className="inline-block size-[0.75rem] rounded-full border-[1.5px] border-ink"
            />
            Facility
            <span className={cx(labelSm, 'text-ink-70', tnum)}>
              {formatCount(located.length)} of {formatCount(facilities.length)} located
            </span>
          </p>
        ) : null}
      </fieldset>

      {rings.length > 0 ? (
        <div className="grid gap-3xs border-t border-t-ink-14 pt-xs">
          <p className="inline-flex items-center gap-[0.4rem] text-small font-medium">
            <span
              aria-hidden="true"
              className="inline-block size-[0.75rem] rounded-full border-[1.5px] border-dashed border-alert"
            />
            {rings.length === 1 ? 'Cluster ring' : 'Cluster rings'}
            <span className={cx(labelSm, 'font-normal text-ink-70', tnum)}>
              {formatCount(rings.length)}
            </span>
          </p>
          <ul className="grid gap-3xs">
            {rings.map((ring) => (
              <li key={ring.key} className="text-small text-ink-70">
                <span className="text-ink">{ringLabel(ring)}</span>; {expectedWords(ring.cluster)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
