import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { caps, cx, labelSm } from '@/styles/recipes'

type FieldProps = {
  label: string
  /** Shown under the label, always: what to enter and why. */
  hint?: ReactNode
  /** Why the value was refused, from the API or the form. */
  error?: string | undefined
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'aria-describedby' | 'aria-invalid'>

/**
 * A labelled text input. The label is a real <label>, the hint and the error
 * are tied to the input for screen readers, and a refused field says why in
 * words beside a rule, never in colour alone.
 */
export function Field({ label, hint, error, className, ...input }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cx('grid gap-3xs', className)}>
      <label htmlFor={id} className={cx(labelSm, caps, 'text-ink-70')}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-small text-ink-70">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        className={cx(
          'w-full border bg-paper-raised px-xs py-2xs text-body',
          error ? 'border-ink' : 'border-ink-24',
        )}
        {...input}
      />
      {error ? (
        <p id={errorId} className="border-l-2 border-l-ink ps-2xs text-small font-medium">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** A form-level refusal: what went wrong, announced as it appears. */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="border-t border-t-ink pt-xs text-small font-medium">
      {children}
    </p>
  )
}
