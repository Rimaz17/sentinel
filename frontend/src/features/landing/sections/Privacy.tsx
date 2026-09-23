import { privacyFields } from '@/assets/images'
import { Figure } from '@/components/ui/Figure'
import { caps, cx, labelSm, sectionTitle, shell, split } from '@/styles/recipes'

/**
 * What happens to each field of a report.
 *
 * Laid out as three full-width bands rather than three narrow columns. The
 * earlier version packed fifteen field names into three cramped stacks; here
 * each band gets the page's full measure and the fields run along it, which is
 * how a register of this kind actually reads.
 */
const FATES = [
  {
    verb: 'Removed entirely',
    note: 'never written, never logged',
    fields: ['Name', 'NIC number', 'Date of birth', 'Phone number', 'Home address'],
  },
  {
    verb: 'Generalised',
    note: 'kept only as a range',
    fields: ['Exact age → 10-year band', 'Exact GPS → rounded to ~100 m'],
  },
  {
    verb: 'Kept',
    note: 'everything detection needs',
    fields: ['District', 'Symptom group', 'Facility ID', 'Timestamp', 'Approximate location'],
  },
]

export function Privacy() {
  return (
    <section
      className="border-t border-t-ink-14 py-2xl"
      id="privacy"
      aria-labelledby="privacy-title"
    >
      <div className={cx(shell, 'grid gap-xl')}>
        <div className={split('center')}>
          <div className="grid content-start gap-md">
            <h2 id="privacy-title" className={cx(sectionTitle, 'max-w-[26ch]')}>
              Identity is stripped at the front door.
            </h2>
            <div className="grid max-w-measure gap-sm text-body leading-body text-ink-70">
              <p>
                Personal fields are removed in the ingestion API before anything is written to
                storage. Nothing downstream, not the database, the event stream, the backups or the
                logs, ever holds personal data.
              </p>
              <p>
                Sentinel does not diagnose anyone. It counts symptom patterns, not confirmed cases,
                and it does not decide what happens next. Every alert is investigated by a public
                health inspector, who can mark it a false alarm.
              </p>
            </div>
          </div>

          {/* The same division the register below spells out: the identifiers
              struck through, the operational fields kept. The sheet is a
              legend, not the section's subject, so it reads at less than its
              column's full width, centred so the section is not lopsided. */}
          <Figure
            className="mx-auto w-full max-w-[27rem]"
            image={privacyFields}
            sizes="(min-width: 68rem) 432px, calc(100vw - 2rem)"
            alt="An illustration. Above, five identity fields struck through: a person, an identity card, a fingerprint, a telephone and a house. Below, four fields kept: a hospital, a staff badge, a location pin and a clock."
          />
        </div>

        <dl className="grid gap-0 border-t border-t-ink">
          {FATES.map((fate) => (
            <div
              className="grid gap-xs border-b border-b-ink-14 py-md xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:items-baseline xl:gap-2xl xl:py-lg"
              key={fate.verb}
            >
              <dt className="flex flex-wrap items-baseline gap-x-sm gap-y-2xs xl:grid xl:gap-[0.15rem]">
                <span className="text-section font-medium tracking-tight">{fate.verb}</span>
                <span className={cx(labelSm, caps, 'text-ink-70')}>{fate.note}</span>
              </dt>
              {/* The fields run along the band rather than stacking into a
                  narrow column. */}
              <dd className="flex flex-wrap gap-x-0 gap-y-2xs">
                {fate.fields.map((field) => (
                  <span
                    className="border-l border-l-ink-24 px-sm text-body leading-snug text-ink-85 first:border-l-0 first:ps-0"
                    key={field}
                  >
                    {field}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <p className="max-w-measure text-body leading-body text-ink-70">
          The public view is coarser than the internal one on purpose. A dot plotted at a pharmacy’s
          exact coordinates can let someone infer which household got sick, even with no name
          attached, so the public map shows shaded districts, never individual reports.
        </p>
      </div>
    </section>
  )
}
