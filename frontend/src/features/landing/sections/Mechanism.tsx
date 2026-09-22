import { twoViews } from '@/assets/images'
import { Figure } from '@/components/ui/Figure'
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
      <div className="shell split split--paired split--flip">
        <div className="mechanism__body">
          <h2 id="mechanism-title" className="mechanism__title">
            An outbreak rarely announces itself at one clinic.
          </h2>
          <p className="mechanism__standfirst">
            It appears as a handful of extra patients at each of a dozen different places, and each
            of those numbers is small enough to explain away as the rainy season or a virus going
            round. Nobody on the ground has enough information to sound an alarm. Sentinel keeps the
            combined view continuously, so the rise is flagged on day three instead of day ten.
          </p>

          <dl className="mechanism__checks">
            {CHECKS.map((check) => (
              <div className="mechanism__check" key={check.term}>
                <dt className="mechanism__check-term">{check.term}</dt>
                <dd className="mechanism__check-body">{check.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Figure
          className="mechanism__figure"
          image={twoViews}
          fit="cover"
          ratio="6 / 7"
          sizes="(min-width: 84rem) 636px, (min-width: 60rem) 45vw, calc(100vw - 2rem)"
          alt="One week drawn twice. Above: patients and hospitals scattered across a grey hillside, annotated “isolated cases” and “rainy season?”. Below: the same ground as a single connected network, with a red cluster picked out and annotated “Sentinel alert”, “DBSCAN cluster” and “hidden outbreak”."
          caption="The same week, seen twice · illustration"
        />
      </div>

      {/* Full width, under both columns. Kept out of the split because it is the
          section's closing line, and inside the text column it just made that
          column taller than the figure beside it. */}
      <div className="shell">
        <p className="mechanism__limit">
          Sentinel does not diagnose anyone — it counts symptom patterns, not confirmed cases — and
          it does not decide what happens next. Every alert is investigated by a public health
          inspector, who can mark it a false alarm.
        </p>
      </div>
    </section>
  )
}
