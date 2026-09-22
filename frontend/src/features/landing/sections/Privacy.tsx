import { privacyFields } from '@/assets/images'
import { Figure } from '@/components/ui/Figure'
import './privacy.css'

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
    <section className="privacy" id="privacy" aria-labelledby="privacy-title">
      <div className="shell privacy__inner">
        <div className="privacy__lede split split--paired">
          <div className="privacy__words">
            <h2 id="privacy-title" className="privacy__title">
              Identity is stripped at the front door.
            </h2>
            <div className="privacy__prose">
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
              struck through, the operational fields kept. */}
          <Figure
            className="privacy__figure"
            image={privacyFields}
            sizes="(min-width: 68rem) 432px, calc(100vw - 2rem)"
            alt="An illustration. Above, five identity fields struck through: a person, an identity card, a fingerprint, a telephone and a house. Below, four fields kept: a hospital, a staff badge, a location pin and a clock."
          />
        </div>

        <dl className="privacy__register">
          {FATES.map((fate) => (
            <div className="privacy__band" key={fate.verb}>
              <dt className="privacy__fate">
                <span className="privacy__verb">{fate.verb}</span>
                <span className="privacy__note label label--sm">{fate.note}</span>
              </dt>
              <dd className="privacy__fields">
                {fate.fields.map((field) => (
                  <span className="privacy__field" key={field}>
                    {field}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <p className="privacy__foot">
          The public view is coarser than the internal one on purpose. A dot plotted at a pharmacy’s
          exact coordinates can let someone infer which household got sick, even with no name
          attached, so the public map shows shaded districts, never individual reports.
        </p>
      </div>
    </section>
  )
}
