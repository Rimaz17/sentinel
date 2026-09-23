import { Link } from 'react-router-dom'
import { networkMap } from '@/assets/images'
import { Action } from '@/components/ui/Action'
import { Figure } from '@/components/ui/Figure'
import { caps, cx, labelSm, sectionTitle, shell, split } from '@/styles/recipes'

/**
 * The three ways in.
 *
 * The public route takes the top of the section beside the map. The two staff
 * routes then get a full-width row of their own, side by side under a single
 * rule: crammed into the corner of the public column they read as an
 * afterthought bolted on, which is what made this section look disorganised.
 *
 * There is deliberately no inspector registration link. Those accounts are
 * admin-provisioned, so offering one would be a dead end dressed up as a door.
 */
/* Inline links in the staff copy keep a visible underline, in ink, at the
   font's own thickness rather than the 1px the base layer sets. */
const inlineLink = 'text-ink underline decoration-ink-40 decoration-auto'

const STAFF = [
  {
    role: 'Healthcare data provider',
    body: (
      <>
        Submit anonymised reports on behalf of your facility.{' '}
        <Link to="/signin" className={inlineLink}>
          Sign in
        </Link>
        , or{' '}
        <Link to="/register" className={inlineLink}>
          register with your facility’s invite code
        </Link>
        .
      </>
    ),
  },
  {
    role: 'Public health inspector',
    body: (
      <>
        The full internal dashboard, scoped to your district.{' '}
        <Link to="/signin" className={inlineLink}>
          Sign in
        </Link>
        . Inspector accounts are created by a system administrator, so there is no sign-up.
      </>
    ),
  },
]

export function Entries() {
  return (
    <section className="border-t border-t-ink-14 py-2xl" aria-labelledby="entries-title">
      <div className={cx(shell, 'grid gap-xl')}>
        <div className={split('center')}>
          <div className="self-center">
            <h2 id="entries-title" className={cx(sectionTitle, 'max-w-[26ch]')}>
              See what is happening in your district.
            </h2>
            <p className="mt-md max-w-[46ch] text-body leading-body text-ink-70">
              District-level status, disease trends, historical data and published alerts. No
              account, no sign-up, no interstitial.
            </p>
            <div className="mt-lg">
              <Action to="/dashboard" trailing="→">
                Open the public dashboard
              </Action>
            </div>
          </div>

          <Figure
            image={networkMap}
            sizes="(min-width: 84rem) 636px, (min-width: 68rem) 45vw, calc(100vw - 2rem)"
            alt="An illustration, not live data: an outline of Sri Lanka stippled with small red marks, densest around the cities and along the coast."
          />
        </div>

        {/* Staff: its own row, clearly separated and given room. */}
        <div className="border-t border-t-ink pt-md">
          <h3 className={cx(labelSm, caps, 'text-ink-70')}>For staff</h3>
          <ul className="mt-md grid gap-lg xl:grid-cols-2 xl:gap-2xl">
            {STAFF.map((person) => (
              <li key={person.role}>
                <p className="text-section font-medium tracking-tight">{person.role}</p>
                <p className="mt-2xs max-w-[52ch] text-body leading-body text-ink-70">
                  {person.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
