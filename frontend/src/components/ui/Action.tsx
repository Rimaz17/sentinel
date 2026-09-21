import { Link } from 'react-router-dom'
import './action.css'

type Variant = 'primary' | 'quiet'

type ActionProps = {
  to: string
  variant?: Variant
  children: React.ReactNode
  /** Rendered after the label, e.g. a direction arrow. Decorative. */
  trailing?: React.ReactNode
  className?: string
}

/**
 * The page has exactly two action shapes: a ruled box for the thing most
 * visitors came to do, and a quiet underlined link for everything else. There
 * is no third. A filled button would be a third voice on a page that is
 * carrying its hierarchy with rules and weight.
 */
export function Action({ to, variant = 'primary', children, trailing, className }: ActionProps) {
  const classes = ['action', `action--${variant}`, className].filter(Boolean).join(' ')

  return (
    <Link to={to} className={classes}>
      <span className="action__label">{children}</span>
      {trailing ? (
        <span className="action__trailing" aria-hidden="true">
          {trailing}
        </span>
      ) : null}
    </Link>
  )
}
