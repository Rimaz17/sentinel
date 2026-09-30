import { useId, useState } from 'react'
import { Panel, PanelHeading } from '@/components/ui/Panel'
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
import { SwitchedOff } from './AccountsSection'
import { ShownOnce } from './ShownOnce'

/**
 * The facility registry, a district at a time, with each facility's invite
 * code. A code is the only way a data provider can register: it is shown once
 * when issued, delivered to the facility directly, and can be replaced or
 * revoked here. Accounts already registered with a code keep working either way.
 *
 * Two sheet panels: the title and the district and name filters on the left,
 * held in view from 68rem while the list beside them scrolls, and the
 * district's facilities on the right.
 */
export function FacilitiesSection() {
  const [district, setDistrict] = useState('KDY')
  const [issued, setIssued] = useState<{ code: IssuedCode; facility: string } | null>(null)
  const [filter, setFilter] = useState('')
  const districtNames = useDistrictNames()
  const facilities = useFacilities(district)
  const districtId = useId()
  const filterId = useId()
  const options = districtNames.data ?? [{ code: 'KDY', name: 'Kandy' }]
  const districtName = options.find((option) => option.code === district)?.name ?? district

  return (
    <div className="grid gap-md xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:items-start">
      <Panel as="div" className="gap-md md:p-lg xl:sticky xl:top-md">
        <div className="grid gap-xs">
          <h1 className={sectionTitle}>Facilities and invite codes</h1>
          <p className="max-w-measure text-body text-ink-70">
            One code per facility, shared by its staff. Give it to the facility directly, by phone
            or by hand. Issuing a new code stops the old one working for anyone who has not
            registered yet.
          </p>
        </div>
        <div className="grid gap-sm border-t border-t-ink-14 pt-md">
          <div className="grid gap-3xs">
            <label htmlFor={districtId} className={cx(labelSm, caps, 'text-ink-70')}>
              District
            </label>
            <select
              id={districtId}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              className="h-[2.75rem] w-full max-w-field-lg rounded-control border border-ink-24 bg-paper-raised px-xs text-body"
            >
              {options.map((option) => (
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
              className="h-[2.75rem] w-full max-w-field-lg rounded-control border border-ink-24 bg-paper-raised px-xs text-body"
            />
          </div>
        </div>
      </Panel>

      <div className="grid min-w-0 content-start gap-md">
        {issued ? (
          <ShownOnce
            key={issued.code.inviteCode}
            title="Invite code"
            value={issued.code.inviteCode}
            onDismiss={() => setIssued(null)}
          >
            For <span className="font-medium text-ink">{issued.facility}</span>,{' '}
            <span className="font-mono">{issued.code.facilityCode}</span>. Only a hash is kept, so
            it cannot be shown again; issue a new one if it is lost.
          </ShownOnce>
        ) : null}
        <Panel labelledBy="facilities-heading">
          <PanelHeading
            id="facilities-heading"
            aside={
              facilities.data ? (
                <span className={cx(labelSm, 'text-ink-70')}>
                  {formatCount(facilities.data.length)} facilities ·{' '}
                  {formatCount(
                    facilities.data.filter((facility) => facility.inviteIssuedAt !== null).length,
                  )}{' '}
                  with a code
                </span>
              ) : null
            }
          >
            Facilities in {districtName}
          </PanelHeading>
          <QueryView
            query={facilities}
            what="facilities"
            loading={<LoadingRows label="Loading facilities" rows={6} />}
            isEmpty={(list) => list.length === 0}
            empty={
              <EmptyState title="No facilities in this district.">
                Choose another district.
              </EmptyState>
            }
          >
            {(list) => {
              const wanted = filter.trim().toLowerCase()
              const shown = list.filter((facility) => facility.name.toLowerCase().includes(wanted))
              return shown.length === 0 ? (
                <p className="border-t border-t-ink pt-sm text-small text-ink-70">
                  No facility in {districtName} has a name containing “{filter.trim()}”.
                </p>
              ) : (
                <div className="grid gap-2xs">
                  {shown.length < list.length ? (
                    <p className={cx(labelSm, 'text-ink-70')}>
                      {formatCount(shown.length)} of {formatCount(list.length)} shown
                    </p>
                  ) : null}
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
        </Panel>
      </div>
    </div>
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
      className="grid gap-x-md gap-y-xs border-b border-b-ink-14 py-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div className="grid gap-3xs">
        <h3 className="text-body font-medium">{facility.name}</h3>
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
      <div className="flex flex-wrap items-baseline gap-x-md gap-y-3xs md:justify-end">
        {facility.lockedInDemo ? <SwitchedOff /> : null}
        <QuietButton
          onClick={() => issue.mutate(facility.code, { onSuccess: onIssued })}
          disabled={busy || facility.lockedInDemo}
        >
          {facility.inviteIssuedAt ? 'Issue a new code' : 'Issue a code'}
        </QuietButton>
        {facility.inviteIssuedAt ? (
          <QuietButton
            onClick={() => revoke.mutate(facility.code)}
            disabled={busy || facility.lockedInDemo}
          >
            Revoke
          </QuietButton>
        ) : null}
      </div>
    </article>
  )
}
