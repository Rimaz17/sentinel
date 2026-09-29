import { useId, useState } from 'react'
import { QuietButton } from '@/components/ui/QuietButton'
import { formatCount, formatDateTime } from '@/features/dashboard/format'
import { EmptyState, LoadingRows, QueryView } from '@/features/dashboard/QueryView'
import { caps, cx, labelSm, sectionTitle, tnum } from '@/styles/recipes'
import {
  type AdminFacility,
  type IssuedCode,
  useDistrictNames,
  useFacilities,
  useIssueCode,
  useRevokeCode,
} from './api'
import { ShownOnce } from './ShownOnce'

/**
 * The facility registry, a district at a time, with each facility's invite
 * code. A code is the only way a data provider can register: it is shown once
 * when issued, delivered to the facility directly, and can be replaced or
 * revoked here. Accounts already registered with a code keep working either way.
 */
export function FacilitiesSection() {
  const [district, setDistrict] = useState('KDY')
  const [issued, setIssued] = useState<{ code: IssuedCode; facility: string } | null>(null)
  const [filter, setFilter] = useState('')
  const districtNames = useDistrictNames()
  const facilities = useFacilities(district)
  const districtId = useId()
  const filterId = useId()

  return (
    <>
      <div className="grid gap-xs">
        <h1 className={sectionTitle}>Facilities and invite codes</h1>
        <p className="max-w-measure text-body text-ink-70">
          One code per facility, shared by its staff. Give it to the facility directly, by phone or
          by hand. Issuing a new code stops the old one working for anyone who has not registered
          yet.
        </p>
      </div>

      {issued ? (
        <ShownOnce
          title="Invite code"
          value={issued.code.inviteCode}
          onDismiss={() => setIssued(null)}
        >
          For <span className="font-medium text-ink">{issued.facility}</span>,{' '}
          <span className="font-mono">{issued.code.facilityCode}</span>. Only a hash is kept, so it
          cannot be shown again; issue a new one if it is lost.
        </ShownOnce>
      ) : null}

      <div className="flex flex-wrap items-end gap-md">
        <div className="grid gap-3xs">
          <label htmlFor={districtId} className={cx(labelSm, caps, 'text-ink-70')}>
            District
          </label>
          <select
            id={districtId}
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="border border-ink-24 bg-paper-raised px-xs py-2xs text-small"
          >
            {(districtNames.data ?? [{ code: 'KDY', name: 'Kandy' }]).map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3xs">
          <label htmlFor={filterId} className={cx(labelSm, caps, 'text-ink-70')}>
            Name contains
          </label>
          <input
            id={filterId}
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="border border-ink-24 bg-paper-raised px-xs py-2xs text-small"
          />
        </div>
      </div>

      <QueryView
        query={facilities}
        what="facilities"
        loading={<LoadingRows label="Loading facilities" rows={6} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState title="No facilities in this district.">Choose another district.</EmptyState>
        }
      >
        {(list) => {
          const shown = list.filter((facility) =>
            facility.name.toLowerCase().includes(filter.trim().toLowerCase()),
          )
          const withCodes = list.filter((facility) => facility.inviteIssuedAt !== null).length
          return (
            <div className="grid gap-xs">
              <p className={cx(labelSm, 'text-ink-70')}>
                {formatCount(list.length)} facilities · {formatCount(withCodes)} with a code
                {shown.length < list.length ? ` · ${formatCount(shown.length)} shown` : ''}
              </p>
              <ul className="border-t border-t-ink">
                {shown.map((facility) => (
                  <li key={facility.code}>
                    <FacilityRow
                      facility={facility}
                      onIssued={(code) => setIssued({ code, facility: facility.name })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        }}
      </QueryView>
    </>
  )
}

function FacilityRow({
  facility,
  onIssued,
}: {
  facility: AdminFacility
  onIssued: (code: IssuedCode) => void
}) {
  const issue = useIssueCode()
  const revoke = useRevokeCode()
  const failed = issue.error ?? revoke.error
  const busy = issue.isPending || revoke.isPending

  return (
    <article
      aria-label={facility.name}
      className="grid gap-x-md gap-y-2xs border-b border-b-ink-14 py-xs md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div className="grid gap-3xs">
        <p className="text-small font-medium">{facility.name}</p>
        <p className={cx(labelSm, 'text-ink-70', tnum)}>
          {facility.institutionType} · {facility.code} ·{' '}
          {facility.inviteIssuedAt
            ? `code issued ${formatDateTime(facility.inviteIssuedAt)}`
            : 'no code'}{' '}
          ·{' '}
          {facility.dataProviderAccounts === 1
            ? '1 account'
            : `${formatCount(facility.dataProviderAccounts)} accounts`}
        </p>
        {failed ? (
          <p role="alert" className={cx(labelSm, 'text-ink')}>
            {failed.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-md gap-y-3xs">
        <QuietButton
          onClick={() => issue.mutate(facility.code, { onSuccess: onIssued })}
          disabled={busy}
        >
          {facility.inviteIssuedAt ? 'Issue a new code' : 'Issue a code'}
        </QuietButton>
        {facility.inviteIssuedAt ? (
          <QuietButton onClick={() => revoke.mutate(facility.code)} disabled={busy}>
            Revoke
          </QuietButton>
        ) : null}
      </div>
    </article>
  )
}
