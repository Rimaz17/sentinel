import { Link } from 'react-router-dom'
import { cx, monoLink } from '@/styles/recipes'
import { BUTTON } from './controls'

type Variant = 'primary' | 'quiet'

type ActionProps = {
  to: string
  variant?: Variant
  children: React.ReactNode
  /** Rendered after the label, e.g. a direction arrow. Decorative. */
  trailing?: React.ReactNode
  className?: string
}

const VARIANTS: Record<Variant, { link: string[]; trailing: string }> = {
  /* The ruled box. The fill arrives from the foot of the box rather than
     fading in, so the control reads as being inked rather than lit. Below
     30rem it spans the column. */
  primary: {
    link: [
      'relative border border-ink bg-transparent px-[1.6rem] py-[1.05rem] text-ink',
      'bg-[linear-gradient(var(--color-ink),var(--color-ink))] bg-[length:100%_0%] bg-[position:50%_100%] bg-no-repeat',
      'transition-[background-size,color] duration-(--dur-base) ease-out',
      'hover:bg-[length:100%_100%] hover:text-paper focus-visible:bg-[length:100%_100%] focus-visible:text-paper',
      'phone:w-full phone:justify-center',
    ],
    trailing:
      'transition-transform duration-(--dur-base) ease-out group-hover/action:translate-x-[0.22rem]',
  },
  /* The underlined link. */
  quiet: {
    link: [
      'border-b border-b-ink-24 py-[0.3rem] text-ink-70',
      'transition-[color,border-color] duration-(--dur-fast) ease-out',
      'hover:border-b-ink hover:text-ink focus-visible:border-b-ink focus-visible:text-ink',
    ],
    trailing:
      'transition-transform duration-(--dur-base) ease-out group-hover/action:translate-y-[0.15rem]',
  },
}

/**
 * A form's submit button: the solid primary button, as tall as the fields
 * above it. Dimmed while the form is on its way.
 */
export function SubmitButton({
  children,
  busy = false,
}: {
  children: React.ReactNode
  busy?: boolean
}) {
  return (
    <button type="submit" disabled={busy} aria-busy={busy} className={BUTTON.primary}>
      {children}
    </button>
  )
}

/**
 * The landing page's two action shapes: a ruled box for the thing most
 * visitors came to do, and a quiet underlined link for everything else. Forms
 * and the staff pages use the solid and white buttons in `controls.ts`
 * instead.
 */
export function Action({ to, variant = 'primary', children, trailing, className }: ActionProps) {
  const styles = VARIANTS[variant]

  return (
    <Link
      to={to}
      className={cx(
        'group/action inline-flex items-center gap-[0.7rem] font-medium whitespace-nowrap no-underline',
        monoLink,
        ...styles.link,
        className,
      )}
    >
      <span>{children}</span>
      {trailing ? (
        <span className={styles.trailing} aria-hidden="true">
          {trailing}
        </span>
      ) : null}
    </Link>
  )
}
