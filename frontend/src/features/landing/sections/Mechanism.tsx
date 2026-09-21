import './mechanism.css'

const CHECKS = [
  {
    term: 'Against its own history',
    body: 'For every district and every symptom group, the last 7 days are compared against that area’s own previous 8 weeks. An area more than three standard deviations above its own average raises an alert. Comparing an area against itself matters: forty dengue cases a week is ordinary for Colombo and highly unusual for Nuwara Eliya.',
  },
  {
    term: 'And against its own map',
    body: 'A second check looks for reports bunched within about two kilometres of each other, arriving from several different facilities. A tight cluster from many sources suggests a real local outbreak. A rise spread evenly across a district with no hotspot suggests a wider seasonal wave. Both matter, and the difference changes the response.',
  },
]

export function Mechanism() {
  return (
    <section className="mechanism" id="mechanism" aria-labelledby="mechanism-title">
      <div className="shell mechanism__inner">
        <div className="mechanism__lede">
          <h2 id="mechanism-title" className="mechanism__title">
            An outbreak rarely announces itself at one clinic.
          </h2>
          <p className="mechanism__standfirst">
            It appears as a handful of extra patients at each of a dozen different places, and
            each of those numbers is small enough to explain away as the rainy season or a virus
            going round. Nobody on the ground has enough information to sound an alarm. Sentinel
            keeps the combined view continuously, so the rise is flagged on day three instead of
            day ten.
          </p>
        </div>

        <dl className="mechanism__checks">
          {CHECKS.map((check) => (
            <div className="mechanism__check" key={check.term}>
              <dt className="mechanism__check-term">{check.term}</dt>
              <dd className="mechanism__check-body">{check.body}</dd>
            </div>
          ))}
        </dl>

        <p className="mechanism__limit">
          Sentinel does not diagnose anyone — it counts symptom patterns, not confirmed cases — and
          it does not decide what happens next. Every alert is investigated by a public health
          inspector, who can mark it a false alarm.
        </p>
      </div>
    </section>
  )
}
