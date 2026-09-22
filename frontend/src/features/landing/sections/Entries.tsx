import { Link } from 'react-router-dom'
import { networkMap } from '@/assets/images'
import { Action } from '@/components/ui/Action'
import { Figure } from '@/components/ui/Figure'
import './entries.css'

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
const STAFF = [
  {
    role: 'Healthcare data provider',
    body: (
      <>
        Submit anonymised reports on behalf of your facility. <Link to="/signin">Sign in</Link>, or{' '}
        <Link to="/register">register with your facility’s invite code</Link>.
      </>
    ),
  },
  {
    role: 'Public health inspector',
    body: (
      <>
        The full internal dashboard, scoped to your district. <Link to="/signin">Sign in</Link>.
        Inspector accounts are created by a system administrator, so there is no sign-up.
      </>
    ),
  },
]

export function Entries() {
  return (
    <section className="entries" aria-labelledby="entries-title">
      <div className="shell entries__inner">
        <div className="split split--paired">
          <div className="entries__public">
            <h2 id="entries-title" className="entries__title">
              See what is happening in your district.
            </h2>
            <p className="entries__standfirst">
              District-level status, disease trends, historical data and published alerts. No
              account, no sign-up, no interstitial.
            </p>
            <div className="entries__action">
              <Action to="/dashboard" trailing="→">
                Open the public dashboard
              </Action>
            </div>
          </div>

          <Figure
            className="entries__figure"
            image={networkMap}
            sizes="(min-width: 84rem) 636px, (min-width: 68rem) 45vw, calc(100vw - 2rem)"
            alt="An illustration, not live data: an outline of Sri Lanka stippled with small red marks, densest around the cities and along the coast."
          />
        </div>

        <div className="entries__staff">
          <h3 className="entries__staff-title label label--sm">For staff</h3>
          <ul className="entries__staff-list">
            {STAFF.map((person) => (
              <li className="entries__staff-item" key={person.role}>
                <p className="entries__staff-role">{person.role}</p>
                <p className="entries__staff-body">{person.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
