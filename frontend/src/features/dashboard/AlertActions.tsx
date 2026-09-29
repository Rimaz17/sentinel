import { useState } from 'react'
import { QuietButton } from '@/components/ui/QuietButton'
import { cx, labelSm } from '@/styles/recipes'
import { type AlertAction, useAlertAction } from './api/queries'
import type { Alert, AlertStatus, Verdict } from './api/types'

/** The step after each status, in the words of the button that takes it. */
const NEXT_STEP: Partial<Record<AlertStatus, { status: AlertStatus; label: string }>> = {
  NEW: { status: 'ACKNOWLEDGED', label: 'Acknowledge' },
  ACKNOWLEDGED: { status: 'INVESTIGATING', label: 'Start investigating' },
}

const VERDICTS: Record<Verdict, { label: string; question: string; yes: string }> = {
  CONFIRMED: {
    label: 'Confirm',
    question: 'Confirm this rise as real? It will be published on the public dashboard.',
    yes: 'Yes, confirm and publish',
  },
  FALSE_ALARM: {
    label: 'Mark a false alarm',
    question: 'Mark this a false alarm? The alert will be closed and never published.',
    yes: 'Yes, mark a false alarm',
  },
}

/**
 * What an inspector can do with an alert. Moving it on takes one click. A
 * verdict is final and one of them publishes the alert to the public, so it
 * asks once more, in place, before it is sent. A closed alert has nothing left
 * to do.
 */
export function AlertActions({ alert }: { alert: Alert }) {
  const action = useAlertAction(alert.code)
  const [asking, setAsking] = useState<Verdict | null>(null)

  if (alert.status === 'CLOSED') {
    return null
  }

  function act(next: AlertAction) {
    setAsking(null)
    action.mutate(next)
  }

  const next = NEXT_STEP[alert.status]
  const busy = action.isPending

  return (
    <div className="grid gap-2xs pt-3xs">
      {asking ? (
        <div className="grid gap-2xs border-l-2 border-l-ink ps-xs">
          <p className="text-small">{VERDICTS[asking].question}</p>
          <div className="flex flex-wrap gap-x-md gap-y-3xs">
            <QuietButton onClick={() => act({ verdict: asking })} disabled={busy}>
              {VERDICTS[asking].yes}
            </QuietButton>
            <QuietButton onClick={() => setAsking(null)}>Cancel</QuietButton>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-wrap gap-x-md gap-y-3xs"
          role="group"
          aria-label={`Act on ${alert.code}`}
        >
          {next ? (
            <QuietButton onClick={() => act({ status: next.status })} disabled={busy}>
              {next.label}
            </QuietButton>
          ) : null}
          {alert.verdict === null ? (
            <>
              <QuietButton onClick={() => setAsking('CONFIRMED')} disabled={busy}>
                {VERDICTS.CONFIRMED.label}
              </QuietButton>
              <QuietButton onClick={() => setAsking('FALSE_ALARM')} disabled={busy}>
                {VERDICTS.FALSE_ALARM.label}
              </QuietButton>
            </>
          ) : null}
          <QuietButton onClick={() => act({ status: 'CLOSED' })} disabled={busy}>
            Close
          </QuietButton>
        </div>
      )}
      {action.isError ? (
        <p role="alert" className={cx(labelSm, 'text-ink')}>
          {action.error.message}
        </p>
      ) : null}
    </div>
  )
}
