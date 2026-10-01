import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
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
          <dl className="grid max-w-field-lg gap-xs rounded-control border border-ink-08 bg-paper-raised px-xs py-xs">
            <div className="grid gap-[0.125rem]">
              <dt className="text-label text-ink-70">Invite code</dt>
              <dd className="text-body font-medium">{demo.invite.code}</dd>
            </div>
            <div className="grid gap-[0.125rem]">
              <dt className="text-label text-ink-70">Facility</dt>
              <dd className="text-small font-medium">{demo.invite.facilityName}, Colombo</dd>
            </div>
          </dl>
          {onUse ? (
            <div>
              <Button onClick={() => onUse(demo.invite.code)}>Use this code</Button>
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
