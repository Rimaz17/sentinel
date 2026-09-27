import { dengueVector } from '@/assets/images'
import { Action } from '@/components/ui/Action'
import { Figure } from '@/components/ui/Figure'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { caps, cx, labelSm, shell, split, tnum } from '@/styles/recipes'

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
    <section className="pt-[clamp(2rem,1.4rem_+_2.6vw,3.5rem)] pb-2xl" aria-labelledby="hero-title">
      <div className={shell}>
        <div className={split('center')}>
          {/* The headline sizes itself against this column, not the viewport. */}
          <div className="@container/lede min-w-0">
            {/* Single column: the column is the viewport, so vw is the honest
                unit, with a slope chosen to meet the two-column value at the
                xl breakpoint so the headline does not jump as the layout
                reflows. Two columns: sized against its own column, so the ratio
                of column width to type size stays fixed and the headline keeps
                its line breaks. */}
            <h1
              id="hero-title"
              className="-mt-[0.12em] max-w-[22ch] text-[length:clamp(2.5rem,4.5vw,4rem)] leading-display font-medium tracking-display text-balance xl:text-[length:clamp(2.5rem,10.4cqw,5rem)]"
            >
              Find it on day three, not day ten.
            </h1>

            <p className="mt-md max-w-[46ch] text-body-lg leading-snug text-ink-70">
              Sentinel gathers anonymised symptom reports from hospitals, clinics and pharmacies
              across Sri Lanka, learns what a normal week looks like for each district, and raises
              an alert when an area moves well outside that range.
            </p>

            <div className="mt-lg flex flex-wrap items-center gap-x-lg gap-y-md">
              <Action to="/dashboard" trailing="→">
                View the public dashboard
              </Action>
              <Action to="#mechanism" variant="quiet" trailing="↓">
                How detection works
              </Action>
            </div>
          </div>

          <Figure
            image={dengueVector}
            priority
            sizes="(min-width: 84rem) 636px, (min-width: 60rem) 45vw, calc(100vw - 2rem)"
            alt="An illustration: a single-line ink drawing of a mosquito, the dengue vector."
          />
        </div>

        {/* The measurement strip, ruled across the foot of both columns. */}
        <dl className="mt-xl grid gap-0 border-t border-t-ink md:grid-cols-3 md:border-b md:border-b-ink-14">
          {FACTS.map((fact) => (
            <div
              className="grid gap-[0.2rem] border-b border-b-ink-14 py-sm md:border-s md:border-b-0 md:border-s-ink-14 md:px-md md:first:border-s-0 md:first:ps-0"
              key={fact.term}
            >
              <dt className={cx(labelSm, caps, 'text-ink-70')}>{fact.term}</dt>
              {/* Values carry units and proper nouns, so they keep their own
                  case. Uppercasing them turns 3σ into 3Σ. */}
              <dd className={cx(labelSm, 'tracking-[0.05em] text-ink-85')}>
                {fact.note ? (
                  <>
                    {/* The single accent on the page. */}
                    <span className={cx(tnum, 'text-ochre')}>{fact.value}</span>{' '}
                    <span className="text-ink-70">{fact.note}</span>
                  </>
                ) : (
                  <span className={tnum}>{fact.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <SimulatedNotice className="mt-md" />
      </div>
    </section>
  )
}
