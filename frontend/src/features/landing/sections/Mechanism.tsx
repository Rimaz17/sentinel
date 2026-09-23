import { twoViews } from '@/assets/images'
import { Figure } from '@/components/ui/Figure'
import { cx, sectionTitle, shell, split } from '@/styles/recipes'

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
    <section
      className="border-t border-t-ink-14 py-2xl"
      id="mechanism"
      aria-labelledby="mechanism-title"
    >
      {/* The text carries two sub-columns, so it is given the wider share. The
          outer edges stay on the shell's gutters; only the divider moves. */}
      <div className={cx(shell, split('stretch'), '[--split-a:0.88fr] [--split-b:1.12fr]')}>
        {/* Moved into the second column from xl, so the figure side alternates
            down the page while the DOM keeps heading-then-figure order for
            screen readers and for the stacked layout on a phone. */}
        <div className="grid content-start gap-lg xl:order-2">
          <h2 id="mechanism-title" className={cx(sectionTitle, 'max-w-[26ch]')}>
            An outbreak rarely announces itself at one clinic.
          </h2>

          <p className="max-w-measure text-body leading-body text-ink-70">
            It appears as a handful of extra patients at each of a dozen places, each small enough
            to explain away as the rainy season. Nobody on the ground has enough to sound an alarm.
            Sentinel keeps the combined view continuously, so the rise is flagged on day three
            instead of day ten.
          </p>

          {/* The two checks sit side by side rather than stacked: they are a pair
              of alternatives, and reading them as columns makes that legible. */}
          <dl className="grid gap-lg border-t border-t-ink-24 pt-md xl:grid-cols-2 xl:gap-xl">
            {CHECKS.map((check) => (
              <div className="grid content-start gap-2xs" key={check.term}>
                <dt className="text-section leading-snug font-medium tracking-tight">
                  {check.term}
                </dt>
                <dd className="text-body leading-body text-ink-70">{check.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Figure
          image={twoViews}
          fit="cover"
          fill
          sizes="(min-width: 84rem) 560px, (min-width: 68rem) 42vw, calc(100vw - 2rem)"
          alt="An illustration. One week drawn twice. Above: patients and hospitals scattered across a grey hillside, annotated “isolated cases” and “rainy season?”. Below: the same ground as a single connected network, with a red cluster picked out and annotated “Sentinel alert”, “DBSCAN cluster” and “hidden outbreak”."
        />
      </div>
    </section>
  )
}
