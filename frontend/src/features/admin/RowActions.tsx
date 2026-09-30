import { type ReactNode } from 'react'
import { cx, labelSm } from '@/styles/recipes'

/**
 * A row's quiet buttons, at the row's end from 48rem. The demo administrator's
 * row keeps its buttons visible but disabled, with the reason under them, so a
 * visitor sees what the page can do as well as what the demo holds back.
 */
export function RowActions({ locked, children }: { locked: boolean; children: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3xs md:justify-items-end">
      <div className="flex flex-wrap gap-x-md gap-y-3xs md:justify-end">{children}</div>
      {locked ? <p className={cx(labelSm, 'text-ink-70')}>Switched off in the demo</p> : null}
    </div>
  )
}
