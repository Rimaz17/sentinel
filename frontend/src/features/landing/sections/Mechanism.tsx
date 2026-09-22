import { twoViews } from '@/assets/images'
import { Figure } from '@/components/ui/Figure'
import './mechanism.css'

const CHECKS = [
  {
    term: 'Against its own history',
    body: 'Each district and symptom group has its last 7 days measured against its own previous 8 weeks. More than three standard deviations above that average raises an alert. Forty dengue cases a week is ordinary for Colombo and unusual for Nuwara Eliya.',
  },
  {
    term: 'And against its own map',
    body: 'A second check looks for reports bunched within about two kilometres, from several different facilities. A tight cluster from many sources suggests a local outbreak; a rise spread evenly with no hotspot suggests a seasonal wave. The difference changes the response.',
  },
]

export function Mechanism() {
  return (
    <section className="mechanism" id="mechanism" aria-labelledby="mechanism-title">
      <div className="shell split split--fill split--flip mechanism__inner">
        <div className="mechanism__body">
          <h2 id="mechanism-title" className="mechanism__title">
            An outbreak rarely announces itself at one clinic.
          </h2>

          <p className="mechanism__standfirst">
            It appears as a handful of extra patients at each of a dozen places, each small enough
            to explain away as the rainy season. Nobody on the ground has enough to sound an alarm.
            Sentinel keeps the combined view continuously, so the rise is flagged on day three
            instead of day ten.
          </p>

          {/* The two checks sit side by side rather than stacked: they are a pair
              of alternatives, and reading them as columns makes that legible. */}
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
          sizes="(min-width: 84rem) 560px, (min-width: 68rem) 42vw, calc(100vw - 2rem)"
          alt="An illustration. One week drawn twice. Above: patients and hospitals scattered across a grey hillside, annotated “isolated cases” and “rainy season?”. Below: the same ground as a single connected network, with a red cluster picked out and annotated “Sentinel alert”, “DBSCAN cluster” and “hidden outbreak”."
        />
      </div>
    </section>
  )
}
