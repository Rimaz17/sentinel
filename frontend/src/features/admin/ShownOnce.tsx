import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Panel } from '@/components/ui/Panel'
import { QuietButton } from '@/components/ui/QuietButton'
import { caps, cx, labelSm } from '@/styles/recipes'

/**
 * A secret the API returns once and keeps only as a hash: a facility's invite
 * code or an inspector's activation link. It is shown on its own panel until
 * dismissed and then gone; the API cannot show it again, only issue a new one.
 *
 * The panel takes focus as it appears, so a secret issued from a row far down
 * a list is scrolled into view and read out rather than landing unseen at the
 * top of the page. Give it a `key` of the secret, so a second one issued while
 * the first is showing takes focus too.
 */
export function ShownOnce({
  title,
  value,
  children,
  onDismiss,
}: {
  title: string
  value: string
  /** Who to give it to and until when. */
  children: ReactNode
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)
  const headingId = useId()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Panel labelledBy={headingId} className="gap-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-sm gap-y-3xs">
        <h2
          id={headingId}
          ref={heading}
          tabIndex={-1}
          className="text-section leading-snug font-medium tracking-tight"
        >
          {title}
        </h2>
        <p className={cx(labelSm, caps, 'text-ink-70')}>Shown once</p>
      </div>
      <p className="rounded-control border border-ink bg-paper-raised px-xs py-xs font-mono text-small break-all select-all">
        {value}
      </p>
      <div className="max-w-measure text-small text-ink-70">{children}</div>
      <div className="flex flex-wrap gap-x-md gap-y-3xs">
        <QuietButton onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</QuietButton>
        <QuietButton onClick={onDismiss}>Done</QuietButton>
      </div>
    </Panel>
  )
}
