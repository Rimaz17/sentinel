import { Link } from 'react-router-dom'
import { formatCount } from '@/features/dashboard/format'
import { SYMPTOM_GROUP_STYLES } from '@/features/dashboard/symptomGroups'
import { cx, tnum } from '@/styles/recipes'
import type { PublicDistrict } from './api'
import { publicDistrictPath } from './paths'

/**
 * Every district's status in words: the map's accessible counterpart, and the
 * quickest way to read it on a phone. Elevated districts come first.
 */
export function DistrictTable({
  districts,
  selected,
}: {
  districts: PublicDistrict[]
  selected: string | null
}) {
  const ordered = [...districts].sort(
    (a, b) => Number(b.status === 'ELEVATED') - Number(a.status === 'ELEVATED'),
  )
  return (
    <div className="overflow-x-auto">
      <table className={cx('w-full border-collapse text-small', tnum)}>
        <caption className="sr-only">Status of each district, elevated districts first</caption>
        <thead>
          <tr className="border-b border-b-ink">
            <th scope="col" className="py-2xs pe-sm text-start font-medium">
              District
            </th>
            <th scope="col" className="py-2xs pe-sm text-start font-medium">
              Status
            </th>
            <th scope="col" className="py-2xs ps-sm text-end font-medium whitespace-nowrap">
              Reports · 7 days
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((district) => (
            <tr
              key={district.code}
              aria-current={district.code === selected ? 'true' : undefined}
              className={cx('border-b border-b-ink-14', district.code === selected && 'bg-ink-04')}
            >
              <th scope="row" className="py-2xs pe-sm text-start font-regular">
                <Link to={publicDistrictPath(district.code)} className="text-ink underline">
                  {district.name}
                </Link>
              </th>
              <td className="py-2xs pe-sm">
                {district.status === 'ELEVATED' ? (
                  <span className="inline-flex flex-wrap items-center gap-x-[0.4rem]">
                    <span aria-hidden="true" className="inline-block size-[0.55rem] bg-alert" />
                    <span className="font-medium">Elevated:</span>{' '}
                    {district.elevatedGroups.map((g) => SYMPTOM_GROUP_STYLES[g].label).join(', ')}
                  </span>
                ) : (
                  <span className="text-ink-70">Usual</span>
                )}
              </td>
              <td className="py-2xs ps-sm text-end font-mono text-label">
                {formatCount(district.reportsLast7Days)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
