import { dengueVector } from '@/assets/images'
import { Action } from '@/components/ui/Action'
import { Figure } from '@/components/ui/Figure'
import './hero.css'

/** The three measurements the whole system turns on. */
const FACTS = [
  { term: 'Coverage', value: '25 districts · 1,505 facilities' },
  { term: 'Window', value: 'last 7 days against 8 weeks' },
  { term: 'Threshold', value: '3σ', note: 'above the area’s own average' },
]

/**
 * The first viewport: the sentence on the left, the vector on the right, and
 * the measurements ruled across the foot of both.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="shell">
        <div className="split split--paired">
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

          <Figure
            className="hero__figure"
            image={dengueVector}
            priority
            sizes="(min-width: 84rem) 636px, (min-width: 60rem) 45vw, calc(100vw - 2rem)"
            alt="An illustration: a single-line ink drawing of a mosquito, the dengue vector."
          />
        </div>

        <dl className="hero__strip">
          {FACTS.map((fact) => (
            <div className="hero__fact" key={fact.term}>
              <dt className="label label--sm">{fact.term}</dt>
              <dd className="hero__fact-value label label--sm">
                {fact.note ? (
                  <>
                    {/* The single accent on the page. */}
                    <span className="label__value tnum">{fact.value}</span>{' '}
                    <span className="hero__fact-note">{fact.note}</span>
                  </>
                ) : (
                  <span className="tnum">{fact.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="hero__simulated label label--sm">
          All case data simulated · demonstration system
        </p>
      </div>
    </section>
  )
}
