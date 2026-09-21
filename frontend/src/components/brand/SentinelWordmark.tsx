import { SentinelMark } from './SentinelMark'
import './brand.css'

type SentinelWordmarkProps = {
  /** `lg` is for the footer, where the lockup sits on its own. */
  size?: 'md' | 'lg'
  className?: string
}

/**
 * The mark and the name locked together. Rendered as a plain element; the
 * caller wraps it in a link when it should navigate, so the lockup never
 * produces a nested anchor.
 */
export function SentinelWordmark({ size = 'md', className }: SentinelWordmarkProps) {
  const classes = ['brand', size === 'lg' ? 'brand--lg' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes}>
      <SentinelMark className="brand__mark" size={size === 'lg' ? 26 : 22} />
      <span className="brand__word">Sentinel</span>
    </span>
  )
}
