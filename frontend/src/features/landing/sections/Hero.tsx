import { Action } from '@/components/ui/Action'
import './hero.css'

/**
 * The first viewport.
 *
 * The metadata rail states the shape of the system in three measured lines —
 * how much it covers, what it compares, and where the line sits. It is set at
 * the headline's lower baseline rather than above it, because a label stacked
 * over a title is a kicker and the headline carries its own weight.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__inner shell">
        <div className="hero__lede">
          <h1 id="hero-title" className="hero__title">
            Early warning for the outbreak no single clinic can see.
          </h1>

          <p className="hero__standfirst">
            Sentinel gathers anonymised symptom reports from hospitals, clinics and pharmacies
            across Sri Lanka, learns what a normal week looks like for each district, and raises an
            alert when an area moves well outside that range.
          </p>

          <div className="hero__actions">
            <Action to="/dashboard" trailing="→">
              View the public dashboard
            </Action>
            <Action to="#mechanism" variant="quiet" trailing="↓">
              How detection works
            </Action>
          </div>
        </div>

        <div className="hero__rail">
          <dl className="hero__readout">
            <div className="hero__readout-row">
              <dt className="label label--sm">Coverage</dt>
              <dd className="label label--sm hero__readout-value tnum">
                25 districts · 1,505 facilities
              </dd>
            </div>
            <div className="hero__readout-row">
              <dt className="label label--sm">Window</dt>
              <dd className="label label--sm hero__readout-value tnum">
                last 7 days against 8 weeks
              </dd>
            </div>
            <div className="hero__readout-row">
              <dt className="label label--sm">Threshold</dt>
              <dd className="label label--sm hero__readout-value">
                {/* The single accent on the page. It marks the one measurement
                    the whole system turns on, and nothing else. */}
                <span className="label__value tnum">3σ</span>
                <span className="hero__readout-note"> above the area’s own average</span>
              </dd>
            </div>
          </dl>

          <p className="hero__simulated label label--sm">
            All case data simulated · demonstration system
          </p>
        </div>
      </div>
    </section>
  )
}
