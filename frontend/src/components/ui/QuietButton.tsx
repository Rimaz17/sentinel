import { type ReactNode } from 'react'
import { cx } from '@/styles/recipes'

/**
 * The quiet underlined action, as a button. It matches the landing page's
 * quiet link, so the dashboard adds no third action shape.
 */
export function QuietButton({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'cursor-pointer border-0 border-b border-b-ink-24 bg-transparent px-0 py-[0.2rem]',
        'font-mono text-label font-medium tracking-label text-ink-70 uppercase',
        'transition-[color,border-color] duration-(--dur-fast) ease-out',
        'hover:border-b-ink hover:text-ink focus-visible:border-b-ink focus-visible:text-ink',
        'disabled:cursor-default disabled:border-b-transparent disabled:text-ink-70',
      )}
    >
      {children}
    </button>
  )
}
