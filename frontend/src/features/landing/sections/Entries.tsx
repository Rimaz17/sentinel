import { Link } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import './entries.css'

/**
 * The three ways in.
 *
 * The public route is the one most visitors want, so it gets the weight and the
 * only ruled action on this part of the page. The two staff routes are set
 * quietly beneath a rule, as a small ledger of who else this is for.
 *
 * There is deliberately no PHI registration link. PHI accounts are created by
 * an administrator, so offering one would be a dead end dressed up as a door.
 */
export function Entries() {
  return (
    <section className="entries" aria-labelledby="entries-title">
      <div className="shell entries__inner">
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
    </section>
  )
}
