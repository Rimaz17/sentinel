import { Action } from '@/components/ui/Action'
import type { Plate } from '../plate/plates'
import './hero.css'

type HeroProps = { plate: Plate }

/**
 * The first viewport.
 *
 * The metadata rail is a readout of whichever plate is showing, which is why it
 * sits at the headline's lower baseline rather than above it — it belongs to
 * the drawing below, not to the sentence above.
 */
export function Hero({ plate }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__inner shell">
        <div className="hero__lede">
          <h1 id="hero-title" className="hero__title">
            Early warning for the outbreak no single clinic can see.
          </h1>

          <p className="hero__standfirst">
            Sentinel gathers anonymised symptom reports from hospitals, clinics and pharmacies
            across Sri Lanka, learns what a normal week looks like for each district, and raises
            an alert when an area moves well outside that range.
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
              <dt className="label label--sm">Plate</dt>
              <dd className="label label--sm hero__readout-value">
                <span className="tnum">{plate.ordinal}</span> — {plate.name}
              </dd>
            </div>
            <div className="hero__readout-row">
              <dt className="label label--sm">Coverage</dt>
              <dd className="label label--sm hero__readout-value tnum">
                25 districts · 1,505 facilities
              </dd>
            </div>
            <div className="hero__readout-row">
              <dt className="label label--sm">{plate.readout.label}</dt>
              <dd className="label label--sm hero__readout-value">
                {/* The single accent on the page. It marks the measurement the
                    active plate exists to show, and nothing else. */}
                <span className="label__value tnum">{plate.readout.value}</span>
                <span className="hero__readout-note tnum"> {plate.readout.note}</span>
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
