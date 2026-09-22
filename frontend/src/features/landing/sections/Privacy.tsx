import './privacy.css'

const COLUMNS = [
  {
    head: 'Removed entirely',
    items: ['Name', 'NIC number', 'Date of birth', 'Phone number', 'Home address'],
  },
  {
    head: 'Generalised',
    items: ['Exact age → 10-year band', 'Exact GPS → rounded to ~100 m'],
  },
  {
    head: 'Kept',
    items: ['District', 'Symptom group', 'Facility ID', 'Timestamp', 'Approximate location'],
  },
]

/**
 * The privacy model, stated as the record it is — a real table, because the
 * same question is asked of every field and a reader should be able to read
 * down a column.
 */
export function Privacy() {
  return (
    <section className="privacy" aria-labelledby="privacy-title">
      <div className="shell split">
        <div className="privacy__body">
          <h2 id="privacy-title" className="privacy__title">
            Identity is stripped at the front door.
          </h2>
          <p className="privacy__standfirst">
            Personal fields are removed in the ingestion API before anything is written to storage.
            Nothing downstream — the database, the event stream, the backups or the logs — ever
            holds personal data.
          </p>
          <p className="privacy__note">
            The public view is coarser than the internal one on purpose. A dot plotted at a
            pharmacy’s exact coordinates can let someone infer which household got sick, even with
            no name attached — so the public map shows shaded districts, never individual reports.
          </p>
        </div>

        <table className="privacy__table">
          <caption className="sr-only">
            What happens to each field of a report when it is submitted
          </caption>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.head} scope="col" className="privacy__head label label--sm">
                  {col.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {COLUMNS.map((col) => (
                <td key={col.head} className="privacy__cell" data-head={col.head}>
                  <ul className="privacy__list">
                    {col.items.map((item) => (
                      <li key={item} className="privacy__item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
