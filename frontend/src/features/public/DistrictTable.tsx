import { Link } from 'react-router-dom'
import { SYMPTOM_GROUP_STYLES } from '@/features/dashboard/symptomGroups'
import { cx, tnum } from '@/styles/recipes'
import type { PublicDistrict } from './api'
import { publicDistrictPath } from './paths'
import { percentOfUsual } from './usual'

/**
 * Every district's status in words: the map's accessible counterpart, and the
 * quickest way to read it on a phone. Elevated districts come first; the one
 * chosen is inked in, as the internal dashboard marks the district in view.
 * Each district's week is given as a percentage of its own usual week, never as
 * a raw count: Colombo's usual week is several times Kandy's, so counts side by
 * side would invite exactly the comparison the detector refuses to make.
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
            <th scope="col" className="py-2xs ps-sm text-end font-medium">
              This week against its usual
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((district) => (
            <tr
              key={district.code}
              className={cx(
                'border-b border-b-ink-14',
                district.code === selected && 'bg-ink text-paper',
              )}
            >
              <th scope="row" className="pe-sm text-start font-regular">
                <Link
                  to={publicDistrictPath(district.code)}
                  aria-current={district.code === selected ? 'page' : undefined}
                  className={cx(
                    'inline-block py-xs underline',
                    district.code === selected ? 'font-medium text-paper' : 'text-ink',
                  )}
                >
                  {district.name}
                </Link>
              </th>
              <td className="py-2xs pe-sm">
                {district.status === 'ELEVATED' ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="me-[0.4rem] inline-block size-[0.55rem] bg-alert"
                    />
                    <span className="font-medium">Elevated:</span>{' '}
                    {district.elevatedGroups.map((g) => SYMPTOM_GROUP_STYLES[g].label).join(', ')}
                  </>
                ) : (
                  <span className={district.code === selected ? undefined : 'text-ink-70'}>
                    Usual
                  </span>
                )}
              </td>
              <td
                className={cx(
                  'py-2xs ps-sm text-end font-mono text-label',
                  district.code === selected ? 'text-paper' : 'text-ink-70',
                )}
              >
                {percentOfUsual(district) ?? 'No usual yet'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
