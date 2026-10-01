import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BUTTON, type ButtonVariant } from './controls'

/** A button that does something on the page, in one of the two shapes. */
export function Button({
  onClick,
  variant = 'secondary',
  children,
}: {
  onClick: () => void
  variant?: ButtonVariant
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={BUTTON[variant]}>
      {children}
    </button>
  )
}

/** A link to another page, in one of the two button shapes. */
export function ButtonLink({
  to,
  variant = 'primary',
  children,
}: {
  to: string
  variant?: ButtonVariant
  children: ReactNode
}) {
  return (
    <Link to={to} className={BUTTON[variant]}>
      {children}
    </Link>
  )
}
