import { type FormEvent, useEffect, useId, useState } from 'react'
import { SkipLink } from '@/components/layout/SkipLink'
import { SubmitButton } from '@/components/ui/Action'
import { Field, FormError } from '@/components/ui/Field'
import { SYMPTOM_GROUPS, type SymptomGroup } from '@/features/dashboard/api/types'
import { formatDateTime } from '@/features/dashboard/format'
import { SYMPTOM_GROUP_STYLES } from '@/features/dashboard/symptomGroups'
import { StaffHeader } from '@/features/auth/AccountBar'
import { useAccount } from '@/features/auth/session'
import { ApiError, apiRequest } from '@/lib/api/client'
import { caps, cx, labelSm, sectionTitle, shell, split } from '@/styles/recipes'

/** POST /api/ingestion/reports */
type Receipt = { reportId: string; receivedAt: string }

type Submitted = { id: string; group: SymptomGroup; reportedAt: string; receivedAt: string }

/** The current moment as a datetime-local input's value, in the browser's own time. */
function nowForInput(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

/**
 * Report submission for a data provider. The form asks only for what Sentinel
 * keeps, plus the patient's age, which the API turns into a ten-year band. It
 * never asks for a name, NIC number, date of birth, phone number or address,
 * and the facility is the one the account belongs to, not a field anyone can
 * change.
 */
export function SubmitPage() {
  const account = useAccount()
  const facility = account.facility
  const [submitted, setSubmitted] = useState<Submitted[]>([])

  useEffect(() => {
    document.title = 'Submit a report · Sentinel'
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <StaffHeader section="Report submission" account={account} />
      <main id="main" className={cx(shell, split(), 'flex-1 content-start py-xl')}>
        <div className="grid content-start gap-lg">
          <div className="grid gap-xs">
            <h1 className={sectionTitle}>Submit a report</h1>
            {facility ? (
              <p className="text-body text-ink-70">
                For <span className="font-medium text-ink">{facility.name}</span>{' '}
                <span className={cx(labelSm, 'text-ink-70')}>{facility.code}</span>. Your account
                belongs to this facility, so every report you submit counts as its own.
              </p>
            ) : null}
          </div>
          <ReportForm onSubmitted={(report) => setSubmitted((earlier) => [report, ...earlier])} />
        </div>
        <aside
          aria-labelledby="submitted-heading"
          className="grid content-start gap-sm border-t border-t-ink pt-md"
        >
          <h2 id="submitted-heading" className="text-section font-medium tracking-tight">
            Submitted this session
          </h2>
          {submitted.length === 0 ? (
            <p className="max-w-measure-narrow text-small text-ink-70">
              Nothing yet. Each report you submit is listed here until you leave the page, so you
              can see it arrived.
            </p>
          ) : (
            <ol className="border-t border-t-ink-14">
              {submitted.map((report) => (
                <li key={report.id} className="grid gap-3xs border-b border-b-ink-14 py-xs">
                  <p className="text-small font-medium">
                    {SYMPTOM_GROUP_STYLES[report.group].label}
                  </p>
                  <p className={cx(labelSm, 'text-ink-70')}>
                    Presented {formatDateTime(report.reportedAt)} · received{' '}
                    {formatDateTime(report.receivedAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </main>
    </div>
  )
}

function ReportForm({ onSubmitted }: { onSubmitted: (report: Submitted) => void }) {
  const [group, setGroup] = useState<SymptomGroup | null>(null)
  const [presented, setPresented] = useState(nowForInput)
  const [age, setAge] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [missingGroup, setMissingGroup] = useState(false)
  const [missingAge, setMissingAge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const groupLegendId = useId()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setConfirmation(null)
    setError(null)
    setMissingGroup(group === null)
    setMissingAge(age === '')
    if (group === null || age === '') {
      return
    }
    setBusy(true)
    const reportedAt = new Date(presented).toISOString()
    try {
      const receipt = await apiRequest<Receipt>('/ingestion/reports', {
        method: 'POST',
        body: {
          symptomGroup: group,
          reportedAt,
          age: Number(age),
          latitude: latitude === '' ? null : Number(latitude),
          longitude: longitude === '' ? null : Number(longitude),
        },
      })
      onSubmitted({ id: receipt.reportId, group, reportedAt, receivedAt: receipt.receivedAt })
      setConfirmation(`${SYMPTOM_GROUP_STYLES[group].label} report received.`)
      setGroup(null)
      setAge('')
      setLatitude('')
      setLongitude('')
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught : new ApiError(0, 'Could not submit the report.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const locationProblem = error?.problemWith('locationComplete')
  const unplaced = error?.fieldProblems.length === 0 ? error.message : null

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="grid gap-md border-t border-t-ink pt-md"
      noValidate
    >
      <fieldset
        className="m-0 grid gap-2xs border-0 p-0"
        aria-describedby={missingGroup ? `${groupLegendId}-error` : undefined}
      >
        <legend id={groupLegendId} className={cx(labelSm, caps, 'mb-3xs text-ink-70')}>
          Symptom group
        </legend>
        <div className="grid gap-x-md gap-y-2xs md:grid-cols-2">
          {SYMPTOM_GROUPS.map((option) => (
            <label
              key={option}
              className="inline-flex cursor-pointer items-center gap-xs text-body"
            >
              <input
                type="radio"
                name="symptomGroup"
                value={option}
                checked={group === option}
                onChange={() => setGroup(option)}
                className="m-0 size-[1rem] cursor-pointer"
              />
              <span
                aria-hidden="true"
                className={cx('inline-block size-[0.6rem]', SYMPTOM_GROUP_STYLES[option].swatch)}
              />
              {SYMPTOM_GROUP_STYLES[option].label}
            </label>
          ))}
        </div>
        {missingGroup ? (
          <p
            id={`${groupLegendId}-error`}
            className="border-l-2 border-l-ink ps-2xs text-small font-medium"
          >
            Choose the symptom group the patient’s symptoms fit.
          </p>
        ) : null}
      </fieldset>

      <Field
        label="When the patient presented"
        type="datetime-local"
        name="reportedAt"
        width="code"
        required
        value={presented}
        onChange={(event) => setPresented(event.target.value)}
        error={error?.problemWith('reportedAt')}
      />
      <Field
        label="Age in years"
        type="number"
        name="age"
        width="sm"
        inputMode="numeric"
        min={0}
        max={130}
        hint="Kept only as a ten-year band, such as 30 to 39."
        value={age}
        onChange={(event) => setAge(event.target.value)}
        required
        error={missingAge ? 'Enter the patient’s age in years.' : error?.problemWith('age')}
      />
      <fieldset className="m-0 grid gap-xs border-0 p-0">
        <legend className={cx(labelSm, caps, 'mb-3xs text-ink-70')}>
          Where the patient lives, if known
        </legend>
        <p className="text-small text-ink-70">
          Decimal degrees. Rounded to about 100 m before it is stored, and never shown to the
          public.
        </p>
        <div className="grid gap-sm md:grid-cols-[repeat(2,minmax(0,var(--container-field-code)))]">
          <Field
            label="Latitude"
            type="number"
            name="latitude"
            width="code"
            inputMode="decimal"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            error={error?.problemWith('latitude') ?? locationProblem}
          />
          <Field
            label="Longitude"
            type="number"
            name="longitude"
            width="code"
            inputMode="decimal"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            error={error?.problemWith('longitude')}
          />
        </div>
      </fieldset>

      <p className="text-small text-ink-70">
        Sentinel never asks for a patient’s name, NIC number, date of birth, phone number or
        address.
      </p>
      {unplaced ? <FormError>{unplaced}</FormError> : null}
      {confirmation ? (
        <p role="status" className="border-t border-t-ink pt-xs text-small font-medium">
          {confirmation}
        </p>
      ) : null}
      <div>
        <SubmitButton busy={busy}>{busy ? 'Submitting' : 'Submit report'}</SubmitButton>
      </div>
    </form>
  )
}
