import { Panel } from '@/components/ui/Panel'
import { QuietButton } from '@/components/ui/QuietButton'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { caps, cx, labelSm } from '@/styles/recipes'
import { type Demo, resetTime } from './api'

/**
 * The demo facility's invite code, below the registration form. A facility's
 * code is shared by all its staff, so this one code serves every visitor, and
 * registering with it is the same two steps a real facility's staff take.
 *
 * Accounts registered here can be seen by anyone signed in as the demo
 * administrator, so the panel asks for made-up details.
 */
export function DemoInvitePanel({
  demo,
  onUse,
}: {
  demo: Demo
  /** Fills the code into the form; left out once the code has been accepted. */
  onUse?: (code: string) => void
}) {
  return (
    <Panel labelledBy="demo-invite-heading" className="gap-md md:p-lg">
      <div className="flex flex-wrap items-start justify-between gap-x-lg gap-y-sm">
        <div className="grid gap-2xs">
          <h2
            id="demo-invite-heading"
            className="text-section leading-snug font-medium tracking-tight"
          >
            Demo invite code
          </h2>
          <p className="max-w-measure text-small text-ink-70">
            Sentinel is a demonstration, so here is a facility’s code to register with, as its staff
            would with theirs. Accounts registered with it are removed every night at{' '}
            {resetTime(demo)} Sri Lanka time.
          </p>
        </div>
        <SimulatedNotice />
      </div>
      <div className="grid gap-x-lg gap-y-md border-t border-t-ink pt-md md:grid-cols-2">
        <div className="grid content-start gap-xs">
          <dl className="grid gap-2xs">
            <div className="grid gap-3xs">
              <dt className={cx(labelSm, caps, 'text-ink-70')}>Invite code</dt>
              <dd className="font-mono text-body">{demo.invite.code}</dd>
            </div>
            <div className="grid gap-3xs">
              <dt className={cx(labelSm, caps, 'text-ink-70')}>Facility</dt>
              <dd className="text-small">{demo.invite.facilityName}, Colombo</dd>
            </div>
          </dl>
          {onUse ? (
            <div>
              <QuietButton onClick={() => onUse(demo.invite.code)}>Use this code</QuietButton>
            </div>
          ) : null}
        </div>
        <p className="max-w-measure-narrow text-small font-medium">
          Use a made-up name and email address, not your own. Anyone signed in as the demo
          administrator can see the accounts registered here until they are removed.
        </p>
      </div>
    </Panel>
  )
}
