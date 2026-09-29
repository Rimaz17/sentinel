import { type ReactNode } from 'react'
import { cx, labelSm } from '@/styles/recipes'

export type StepState = 'done' | 'current' | 'next'

export type RailStep = {
  label: string
  state: StepState
  /** What a finished step settled, such as the invite code or the email address. */
  value?: ReactNode
}

const STATE_WORDS: Record<StepState, string> = {
  done: 'done',
  current: 'current step',
  next: 'still to come',
}

/**
 * Where the visitor is in a short task: the steps in order under a full ink
 * rule, the current one inked in as the dashboard's district rail marks the
 * district in view, and a finished one showing what it settled. The state is
 * also said in words to a screen reader, never by the ground alone.
 */
export function StepRail({ label, steps }: { label: string; steps: RailStep[] }) {
  return (
    <ol aria-label={label} className="border-t border-t-ink">
      {steps.map((step, index) => {
        const current = step.state === 'current'
        return (
          <li
            key={step.label}
            aria-current={current ? 'step' : undefined}
            className={cx(
              'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-xs border-b border-b-ink-14 px-xs py-xs',
              current ? 'bg-ink text-paper' : step.state === 'next' ? 'text-ink-70' : 'text-ink',
            )}
          >
            <span className={cx(labelSm, current ? 'text-paper-72' : 'text-ink-70')}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-body">
              {step.label}
              <span className="sr-only">, {STATE_WORDS[step.state]}</span>
            </span>
            {step.value ? (
              <span className={cx(labelSm, 'min-w-0 truncate text-ink-70')}>{step.value}</span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export type Route = { who: string; where: string }

/**
 * Who a page serves and where each of them goes next, as rows under the same
 * rule. Not numbered: these are alternatives, not a sequence. A key, not a
 * menu: the rows go nowhere, so their text sits on the column edge like the
 * notes below them rather than inset like the rows of a list you can click.
 */
export function RouteList({ label, routes }: { label: string; routes: Route[] }) {
  return (
    <ul aria-label={label} className="border-t border-t-ink">
      {routes.map((route) => (
        <li
          key={route.who}
          className="grid gap-x-sm gap-y-3xs border-b border-b-ink-14 py-xs md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline"
        >
          <span className="text-body">{route.who}</span>
          <span className="text-small text-ink-70">{route.where}</span>
        </li>
      ))}
    </ul>
  )
}
