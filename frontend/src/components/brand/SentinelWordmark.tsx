import { cx } from '@/styles/recipes'
import { SentinelMark } from './SentinelMark'

type SentinelWordmarkProps = {
  /** `lg` is for the footer, where the lockup sits on its own. */
  size?: 'md' | 'lg'
  /** `paper` for the ink ground of the footer. */
  tone?: 'ink' | 'paper'
  className?: string
}

/**
 * The mark and the name locked together. Rendered as a plain element; the
 * caller wraps it in a link when it should navigate, so the lockup never
 * produces a nested anchor.
 *
 * Inside a link carrying `group/brand`, the mark takes the ochre on hover while
 * the lockup itself does not move.
 */
export function SentinelWordmark({ size = 'md', tone = 'ink', className }: SentinelWordmarkProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-[0.6rem] no-underline',
        tone === 'paper' ? 'text-paper' : 'text-ink',
        className,
      )}
    >
      <SentinelMark
        className={cx(
          // Optical correction: the mark's baseline rule sits slightly above
          // its own centre, so it is nudged down to meet the wordmark's cap
          // height.
          'flex-none translate-y-px group-hover/brand:text-ochre',
          '[&_path]:transition-opacity [&_path]:duration-(--dur-base) [&_path]:ease-out',
        )}
        size={size === 'lg' ? 26 : 22}
      />
      <span
        className={cx(
          // Letter-spacing adds a trailing gap after the last letter; the
          // negative end margin removes it and keeps the lockup optically
          // centred.
          'me-[-0.22em] font-sans leading-[1] font-semibold tracking-[0.22em] whitespace-nowrap uppercase',
          size === 'lg' ? 'text-[1.0625rem]' : 'text-[0.9375rem]',
        )}
      >
        Sentinel
      </span>
    </span>
  )
}
