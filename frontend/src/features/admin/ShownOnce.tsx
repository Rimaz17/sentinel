import { type ReactNode, useState } from 'react'
import { QuietButton } from '@/components/ui/QuietButton'
import { caps, cx, labelSm } from '@/styles/recipes'

/**
 * A secret the API returns once and keeps only as a hash: a facility's invite
 * code or an inspector's activation link. It is shown here until dismissed and
 * then gone; the API cannot show it again, only issue a new one.
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

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-label={title} className="grid gap-xs border-y border-t-ink border-b-ink-14 py-sm">
      <p className={cx(labelSm, caps, 'text-ink-70')}>{title} · shown once</p>
      <p className="font-mono text-small break-all select-all">{value}</p>
      <div className="text-small text-ink-70">{children}</div>
      <div className="flex flex-wrap gap-x-md gap-y-3xs">
        <QuietButton onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</QuietButton>
        <QuietButton onClick={onDismiss}>Done</QuietButton>
      </div>
    </section>
  )
}
