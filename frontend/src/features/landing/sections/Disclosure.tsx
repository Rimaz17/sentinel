import './disclosure.css'

const LIMITATIONS = [
  {
    term: 'Simulated data',
    body: 'Every case report in this system is generated. A real deployment would require Ministry of Health integration and ethical approval.',
  },
  {
    term: 'Shared invite codes',
    body: 'One code per facility means a leaked code could be reused. A production system would add per-user verification; here it is a deliberate trade-off.',
  },
  {
    term: 'Facility data is from 2022',
    body: 'The registry is derived from a published Ministry of Health institution dataset. Some facilities may since have opened, closed or been renamed.',
  },
  {
    term: 'Detection assumes a stable baseline',
    body: 'If a prior year contained a real epidemic, that inflates “normal” and reduces future sensitivity. Periodic recalibration would be needed.',
  },
]

/**
 * What this system cannot do.
 *
 * Kept on the landing page rather than tucked into a documentation page,
 * because the honesty is a feature of the project and reads as one only when a
 * visitor meets it before they are asked to trust anything.
 */
export function Disclosure() {
  return (
    <section className="disclosure" aria-labelledby="disclosure-title">
      <div className="shell disclosure__inner">
        <div className="disclosure__lede">
          <h2 id="disclosure-title" className="disclosure__title">
            What this demonstration does not do.
          </h2>
          <p className="disclosure__standfirst">
            Sentinel is a working system running on simulated data. These limitations are documented
            on purpose rather than left for a reader to discover.
          </p>
        </div>

        <dl className="disclosure__list">
          {LIMITATIONS.map((item) => (
            <div className="disclosure__item" key={item.term}>
              <dt className="disclosure__term label label--sm">{item.term}</dt>
              <dd className="disclosure__body">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
