import { Link } from 'react-router-dom'
import { networkMap } from '@/assets/images'
import { Action } from '@/components/ui/Action'
import { Figure } from '@/components/ui/Figure'
import './entries.css'

/**
 * The three ways in.
 *
 * The public route gets the weight and the only ruled action here. The two
 * staff routes sit quietly beneath a rule. There is deliberately no inspector
 * registration link — those accounts are admin-provisioned, so offering one
 * would be a dead end dressed up as a door.
 */
export function Entries() {
  return (
    <section className="entries" aria-labelledby="entries-title">
      <div className="shell split split--fill">
        <div className="entries__body">
          <div>
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

          <div className="entries__staff">
            <h3 className="entries__staff-title label label--sm">For staff</h3>
            <ul className="entries__staff-list">
              <li className="entries__staff-item">
                <p className="entries__staff-role">Healthcare data provider</p>
                <p className="entries__staff-body">
                  Submit anonymised reports on behalf of your facility.{' '}
                  <Link to="/signin">Sign in</Link>, or{' '}
                  <Link to="/register">register with your facility’s invite code</Link>.
                </p>
              </li>
              <li className="entries__staff-item">
                <p className="entries__staff-role">Public health inspector</p>
                <p className="entries__staff-body">
                  The full internal dashboard, scoped to your district.{' '}
                  <Link to="/signin">Sign in</Link>. Inspector accounts are created by a system
                  administrator — there is no sign-up.
                </p>
              </li>
            </ul>
          </div>
        </div>

        <Figure
          className="entries__figure"
          image={networkMap}
          sizes="(min-width: 84rem) 636px, (min-width: 60rem) 45vw, calc(100vw - 2rem)"
          alt="An illustration, not live data: an outline of Sri Lanka stippled with small red marks, densest around the cities and along the coast."
        />
      </div>
    </section>
  )
}
